const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authenticateToken, requireVerification } = require('../middleware/auth');
const { isWithinRatingRange, calculateWinProbability } = require('../utils/elo');

const router = express.Router();

// Validation schemas
const matchRequestSchema = Joi.object({
  sportId: Joi.number().integer().positive().required(),
  preferredTurfId: Joi.number().integer().positive().optional(),
  preferredTimeStart: Joi.date().iso().optional(),
  preferredTimeEnd: Joi.date().iso().optional(),
  maxDistanceKm: Joi.number().integer().min(1).max(100).default(10),
  minRating: Joi.number().min(0).max(3000).optional(),
  maxRating: Joi.number().min(0).max(3000).optional()
});

/**
 * POST /api/matchmaking/request
 * Create a match request
 */
router.post('/request', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { error, value } = matchRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { sportId, preferredTurfId, preferredTimeStart, preferredTimeEnd, maxDistanceKm, minRating, maxRating } = value;

    // Verify sport exists
    const sportResult = await pool.query('SELECT id FROM sports WHERE id = $1 AND is_active = true', [sportId]);
    if (sportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sport not found' });
    }

    // Check if user has a profile for this sport
    const profileResult = await pool.query(
      'SELECT rating, games_played FROM player_profiles WHERE user_id = $1 AND sport_id = $2 AND is_active = true',
      [req.user.id, sportId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(400).json({ error: 'Please create a profile for this sport first' });
    }

    const userProfile = profileResult.rows[0];

    // Check if user has an active location
    const locationResult = await pool.query(
      'SELECT location FROM user_locations WHERE user_id = $1 AND is_primary = true',
      [req.user.id]
    );

    if (locationResult.rows.length === 0) {
      return res.status(400).json({ error: 'Please set your location first' });
    }

    // Cancel any existing active requests for this sport
    await pool.query(
      'UPDATE match_requests SET status = $1 WHERE requester_id = $2 AND sport_id = $3 AND status = $4',
      ['cancelled', req.user.id, sportId, 'active']
    );

    // Set expiration time (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create new match request
    const requestResult = await pool.query(
      `INSERT INTO match_requests 
       (requester_id, sport_id, preferred_turf_id, preferred_time_start, preferred_time_end, 
        max_distance_km, min_rating, max_rating, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.id, sportId, preferredTurfId, preferredTimeStart, preferredTimeEnd, 
       maxDistanceKm, minRating, maxRating, expiresAt]
    );

    const matchRequest = requestResult.rows[0];

    // Try to find a match immediately
    const candidates = await findMatchCandidates(req.user.id, sportId, userProfile.rating, maxDistanceKm, minRating, maxRating);

    if (candidates.length > 0) {
      // Auto-match with the best candidate
      const bestCandidate = candidates[0];
      await createMatch(req.user.id, bestCandidate.userId, sportId, preferredTurfId, preferredTimeStart);
      
      // Update match request status
      await pool.query(
        'UPDATE match_requests SET status = $1, matched_with_user_id = $2 WHERE id = $3',
        ['matched', bestCandidate.userId, matchRequest.id]
      );

      return res.json({
        message: 'Match found!',
        match: {
          opponentId: bestCandidate.userId,
          opponentName: bestCandidate.name,
          opponentRating: bestCandidate.rating,
          winProbability: bestCandidate.winProbability,
          distance: bestCandidate.distance
        }
      });
    }

    res.json({
      message: 'Match request created. We\'ll notify you when we find an opponent.',
      requestId: matchRequest.id,
      expiresAt: matchRequest.expires_at
    });
  } catch (error) {
    console.error('Create match request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matchmaking/candidates
 * Get potential match candidates
 */
router.get('/candidates', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { sportId, maxDistance = 10, maxRatingDiff = 200 } = req.query;

    if (!sportId) {
      return res.status(400).json({ error: 'Sport ID is required' });
    }

    // Get user's profile and location
    const [profileResult, locationResult] = await Promise.all([
      pool.query(
        'SELECT rating, games_played FROM player_profiles WHERE user_id = $1 AND sport_id = $2 AND is_active = true',
        [req.user.id, sportId]
      ),
      pool.query(
        'SELECT location FROM user_locations WHERE user_id = $1 AND is_primary = true',
        [req.user.id]
      )
    ]);

    if (profileResult.rows.length === 0) {
      return res.status(400).json({ error: 'Please create a profile for this sport first' });
    }

    if (locationResult.rows.length === 0) {
      return res.status(400).json({ error: 'Please set your location first' });
    }

    const userProfile = profileResult.rows[0];
    const userLocation = locationResult.rows[0].location;

    const candidates = await findMatchCandidates(
      req.user.id, 
      sportId, 
      userProfile.rating, 
      parseInt(maxDistance), 
      null, 
      null,
      parseInt(maxRatingDiff)
    );

    res.json({ candidates });
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matchmaking/requests
 * Get user's match requests
 */
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const { status = 'active' } = req.query;

    const result = await pool.query(
      `SELECT mr.*, s.display_name as sport_name,
              u.first_name, u.last_name, u.profile_image_url,
              t.name as turf_name, t.address as turf_address
       FROM match_requests mr
       JOIN sports s ON mr.sport_id = s.id
       LEFT JOIN users u ON mr.matched_with_user_id = u.id
       LEFT JOIN turfs t ON mr.preferred_turf_id = t.id
       WHERE mr.requester_id = $1 AND mr.status = $2
       ORDER BY mr.created_at DESC`,
      [req.user.id, status]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get match requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/matchmaking/requests/:id
 * Cancel a match request
 */
router.delete('/requests/:id', authenticateToken, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const result = await pool.query(
      'UPDATE match_requests SET status = $1 WHERE id = $2 AND requester_id = $3 AND status = $4 RETURNING *',
      ['cancelled', requestId, req.user.id, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    res.json({ message: 'Match request cancelled successfully' });
  } catch (error) {
    console.error('Cancel match request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function to find match candidates
 */
async function findMatchCandidates(userId, sportId, userRating, maxDistanceKm, minRating, maxRating, maxRatingDiff = 200) {
  try {
    // Get user's location
    const userLocationResult = await pool.query(
      'SELECT location FROM user_locations WHERE user_id = $1 AND is_primary = true',
      [userId]
    );

    if (userLocationResult.rows.length === 0) {
      return [];
    }

    const userLocation = userLocationResult.rows[0].location;

    // Build rating filter
    let ratingFilter = '';
    const queryParams = [userId, sportId, userLocation.coordinates[0], userLocation.coordinates[1], maxDistanceKm * 1000];
    let paramCount = 5;

    if (minRating !== null && maxRating !== null) {
      ratingFilter = `AND pp.rating BETWEEN $${paramCount++} AND $${paramCount++}`;
      queryParams.push(minRating, maxRating);
    } else {
      // Use rating difference filter
      ratingFilter = `AND ABS(pp.rating - $${paramCount++}) <= $${paramCount++}`;
      queryParams.push(userRating, maxRatingDiff);
    }

    const query = `
      SELECT DISTINCT
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.profile_image_url,
        pp.rating,
        pp.games_played,
        ST_Distance(ul.location, ST_GeomFromText($3, 4326)) as distance,
        ${calculateWinProbability.toString().replace('function calculateWinProbability', '')}($4, pp.rating) as win_probability
      FROM player_profiles pp
      JOIN users u ON pp.user_id = u.id
      JOIN user_locations ul ON u.id = ul.user_id AND ul.is_primary = true
      WHERE pp.sport_id = $2
        AND pp.user_id != $1
        AND pp.is_active = true
        AND u.is_verified = true
        AND ST_DWithin(ul.location, ST_GeomFromText($3, 4326), $5)
        ${ratingFilter}
        AND NOT EXISTS (
          SELECT 1 FROM match_requests mr 
          WHERE mr.requester_id = pp.user_id 
            AND mr.sport_id = $2 
            AND mr.status = 'active'
        )
      ORDER BY 
        CASE 
          WHEN ABS(pp.rating - $4) <= 100 THEN 1
          WHEN ABS(pp.rating - $4) <= 200 THEN 2
          ELSE 3
        END,
        distance ASC
      LIMIT 10
    `;

    const result = await pool.query(query, queryParams);

    return result.rows.map(row => ({
      userId: row.user_id,
      name: `${row.first_name} ${row.last_name}`,
      profileImageUrl: row.profile_image_url,
      rating: parseFloat(row.rating),
      gamesPlayed: row.games_played,
      distance: Math.round(row.distance / 1000 * 100) / 100, // Convert to km
      winProbability: parseFloat(row.win_probability)
    }));
  } catch (error) {
    console.error('Find candidates error:', error);
    return [];
  }
}

/**
 * Helper function to create a match
 */
async function createMatch(player1Id, player2Id, sportId, turfId, scheduledAt) {
  try {
    const result = await pool.query(
      `INSERT INTO matches (player1_id, player2_id, sport_id, turf_id, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5, 'confirmed')
       RETURNING *`,
      [player1Id, player2Id, sportId, turfId, scheduledAt || new Date(Date.now() + 60 * 60 * 1000)] // Default to 1 hour from now
    );

    return result.rows[0];
  } catch (error) {
    console.error('Create match error:', error);
    throw error;
  }
}

module.exports = router;
