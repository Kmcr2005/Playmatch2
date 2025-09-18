const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authenticateToken, requireVerification } = require('../middleware/auth');
const { calculateRatingChanges } = require('../utils/elo');

const router = express.Router();

// Validation schemas
const reportResultSchema = Joi.object({
  matchId: Joi.number().integer().positive().required(),
  result: Joi.string().valid('win', 'loss', 'draw').required(),
  matchDurationMinutes: Joi.number().integer().min(1).max(300).optional(),
  notes: Joi.string().max(500).optional()
});

/**
 * GET /api/matches
 * Get user's matches
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status = 'all', limit = 20, offset = 0 } = req.query;

    let statusFilter = '';
    const queryParams = [req.user.id, parseInt(limit), parseInt(offset)];
    let paramCount = 3;

    if (status !== 'all') {
      statusFilter = `AND m.status = $${paramCount++}`;
      queryParams.push(status);
    }

    const query = `
      SELECT 
        m.id,
        m.scheduled_at,
        m.status,
        m.player1_result,
        m.player2_result,
        m.player1_rating_before,
        m.player2_rating_before,
        m.player1_rating_after,
        m.player2_rating_after,
        m.rating_change_player1,
        m.rating_change_player2,
        m.match_duration_minutes,
        m.notes,
        m.created_at,
        s.display_name as sport_name,
        t.name as turf_name,
        t.address as turf_address,
        CASE 
          WHEN m.player1_id = $1 THEN 
            json_build_object(
              'id', p2.id,
              'firstName', p2.first_name,
              'lastName', p2.last_name,
              'profileImageUrl', p2.profile_image_url
            )
          ELSE 
            json_build_object(
              'id', p1.id,
              'firstName', p1.first_name,
              'lastName', p1.last_name,
              'profileImageUrl', p1.profile_image_url
            )
        END as opponent,
        CASE 
          WHEN m.player1_id = $1 THEN m.player1_result
          ELSE m.player2_result
        END as my_result
      FROM matches m
      JOIN sports s ON m.sport_id = s.id
      LEFT JOIN turfs t ON m.turf_id = t.id
      JOIN users p1 ON m.player1_id = p1.id
      JOIN users p2 ON m.player2_id = p2.id
      WHERE (m.player1_id = $1 OR m.player2_id = $1)
        ${statusFilter}
      ORDER BY m.scheduled_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, queryParams);

    res.json({
      matches: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: result.rows.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matches/:id
 * Get specific match details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }

    const result = await pool.query(
      `SELECT 
        m.*,
        s.display_name as sport_name,
        t.name as turf_name,
        t.address as turf_address,
        p1.first_name as player1_first_name,
        p1.last_name as player1_last_name,
        p1.profile_image_url as player1_profile_image,
        p2.first_name as player2_first_name,
        p2.last_name as player2_last_name,
        p2.profile_image_url as player2_profile_image
      FROM matches m
      JOIN sports s ON m.sport_id = s.id
      LEFT JOIN turfs t ON m.turf_id = t.id
      JOIN users p1 ON m.player1_id = p1.id
      JOIN users p2 ON m.player2_id = p2.id
      WHERE m.id = $1 AND (m.player1_id = $2 OR m.player2_id = $2)`,
      [matchId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const match = result.rows[0];

    res.json({
      id: match.id,
      sportName: match.sport_name,
      scheduledAt: match.scheduled_at,
      status: match.status,
      turf: match.turf_name ? {
        name: match.turf_name,
        address: match.turf_address
      } : null,
      player1: {
        id: match.player1_id,
        firstName: match.player1_first_name,
        lastName: match.player1_last_name,
        profileImageUrl: match.player1_profile_image,
        result: match.player1_result,
        ratingBefore: match.player1_rating_before,
        ratingAfter: match.player1_rating_after,
        ratingChange: match.rating_change_player1
      },
      player2: {
        id: match.player2_id,
        firstName: match.player2_first_name,
        lastName: match.player2_last_name,
        profileImageUrl: match.player2_profile_image,
        result: match.player2_result,
        ratingBefore: match.player2_rating_before,
        ratingAfter: match.player2_rating_after,
        ratingChange: match.rating_change_player2
      },
      matchDurationMinutes: match.match_duration_minutes,
      notes: match.notes,
      createdAt: match.created_at,
      updatedAt: match.updated_at
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matches/report-result
 * Report match result
 */
router.post('/report-result', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { error, value } = reportResultSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { matchId, result, matchDurationMinutes, notes } = value;

    // Get match details
    const matchResult = await pool.query(
      `SELECT m.*, s.name as sport_name
       FROM matches m
       JOIN sports s ON m.sport_id = s.id
       WHERE m.id = $1 AND (m.player1_id = $2 OR m.player2_id = $2) AND m.status = 'confirmed'`,
      [matchId, req.user.id]
    );

    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found or not confirmed' });
    }

    const match = matchResult.rows[0];
    const isPlayer1 = match.player1_id === req.user.id;

    // Check if result already reported by this player
    const existingResult = isPlayer1 ? match.player1_result : match.player2_result;
    if (existingResult) {
      return res.status(400).json({ error: 'Result already reported for this match' });
    }

    // Update the result
    const resultField = isPlayer1 ? 'player1_result' : 'player2_result';
    const notesField = isPlayer1 ? 'notes' : 'notes'; // Both players can add notes

    await pool.query(
      `UPDATE matches 
       SET ${resultField} = $1, 
           ${notesField} = COALESCE($2, ${notesField}),
           match_duration_minutes = COALESCE($3, match_duration_minutes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [result, notes, matchDurationMinutes, matchId]
    );

    // Check if both players have reported results
    const updatedMatch = await pool.query(
      'SELECT player1_result, player2_result FROM matches WHERE id = $1',
      [matchId]
    );

    const { player1_result, player2_result } = updatedMatch.rows[0];

    if (player1_result && player2_result) {
      // Both results reported, process the match
      await processMatchResult(matchId, player1_result, player2_result);
    }

    res.json({ message: 'Result reported successfully' });
  } catch (error) {
    console.error('Report result error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matches/:id/cancel
 * Cancel a match
 */
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }

    const result = await pool.query(
      `UPDATE matches 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND (player1_id = $2 OR player2_id = $2) AND status = 'confirmed'
       RETURNING *`,
      [matchId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found or cannot be cancelled' });
    }

    res.json({ message: 'Match cancelled successfully' });
  } catch (error) {
    console.error('Cancel match error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function to process match result and update ratings
 */
async function processMatchResult(matchId, player1Result, player2Result) {
  try {
    // Get match details with player ratings
    const matchResult = await pool.query(
      `SELECT m.*, 
              pp1.rating as player1_rating, pp1.games_played as player1_games,
              pp2.rating as player2_rating, pp2.games_played as player2_games
       FROM matches m
       JOIN player_profiles pp1 ON m.player1_id = pp1.user_id AND m.sport_id = pp1.sport_id
       JOIN player_profiles pp2 ON m.player2_id = pp2.user_id AND m.sport_id = pp2.sport_id
       WHERE m.id = $1`,
      [matchId]
    );

    if (matchResult.rows.length === 0) {
      throw new Error('Match not found');
    }

    const match = matchResult.rows[0];

    // Determine match result for Elo calculation
    let eloResult;
    if (player1Result === 'win' && player2Result === 'loss') {
      eloResult = 'player1_win';
    } else if (player1Result === 'loss' && player2Result === 'win') {
      eloResult = 'player2_win';
    } else if (player1Result === 'draw' && player2Result === 'draw') {
      eloResult = 'draw';
    } else {
      // Results don't match - mark for dispute
      await pool.query(
        'UPDATE matches SET status = $1 WHERE id = $2',
        ['disputed', matchId]
      );
      return;
    }

    // Calculate rating changes
    const ratingChanges = calculateRatingChanges(
      { rating: match.player1_rating, gamesPlayed: match.player1_games },
      { rating: match.player2_rating, gamesPlayed: match.player2_games },
      eloResult
    );

    // Update match with rating changes
    await pool.query(
      `UPDATE matches 
       SET status = 'completed',
           player1_rating_before = $1,
           player2_rating_before = $2,
           player1_rating_after = $3,
           player2_rating_after = $4,
           rating_change_player1 = $5,
           rating_change_player2 = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        match.player1_rating,
        match.player2_rating,
        ratingChanges.player1.newRating,
        ratingChanges.player2.newRating,
        ratingChanges.player1.ratingChange,
        ratingChanges.player2.ratingChange,
        matchId
      ]
    );

    // Update player profiles
    const player1Wins = player1Result === 'win' ? 1 : 0;
    const player1Losses = player1Result === 'loss' ? 1 : 0;
    const player1Draws = player1Result === 'draw' ? 1 : 0;

    const player2Wins = player2Result === 'win' ? 1 : 0;
    const player2Losses = player2Result === 'loss' ? 1 : 0;
    const player2Draws = player2Result === 'draw' ? 1 : 0;

    await Promise.all([
      // Update player 1 profile
      pool.query(
        `UPDATE player_profiles 
         SET rating = $1, games_played = games_played + 1, 
             wins = wins + $2, losses = losses + $3, draws = draws + $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5 AND sport_id = $6`,
        [
          ratingChanges.player1.newRating,
          player1Wins,
          player1Losses,
          player1Draws,
          match.player1_id,
          match.sport_id
        ]
      ),
      // Update player 2 profile
      pool.query(
        `UPDATE player_profiles 
         SET rating = $1, games_played = games_played + 1, 
             wins = wins + $2, losses = losses + $3, draws = draws + $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5 AND sport_id = $6`,
        [
          ratingChanges.player2.newRating,
          player2Wins,
          player2Losses,
          player2Draws,
          match.player2_id,
          match.sport_id
        ]
      )
    ]);

    console.log(`Match ${matchId} completed. Rating changes: P1 ${ratingChanges.player1.ratingChange}, P2 ${ratingChanges.player2.ratingChange}`);
  } catch (error) {
    console.error('Process match result error:', error);
    throw error;
  }
}

module.exports = router;
