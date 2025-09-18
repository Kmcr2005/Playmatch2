const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authenticateToken, requireVerification } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  dateOfBirth: Joi.date().optional(),
  phone: Joi.string().optional(),
  profileImageUrl: Joi.string().uri().optional()
});

const locationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  country: Joi.string().default('US'),
  postalCode: Joi.string().optional()
});

const sportProfileSchema = Joi.object({
  sportId: Joi.number().integer().positive().required(),
  preferredSkillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional()
});

/**
 * GET /api/players/profile
 * Get current user's complete profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Get user basic info
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.date_of_birth, 
              u.profile_image_url, u.is_verified, u.created_at
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user location
    const locationResult = await pool.query(
      `SELECT location, address, city, state, country, postal_code
       FROM user_locations WHERE user_id = $1 AND is_primary = true`,
      [req.user.id]
    );

    // Get player profiles for all sports
    const profilesResult = await pool.query(
      `SELECT pp.*, s.name as sport_name, s.display_name as sport_display_name
       FROM player_profiles pp
       JOIN sports s ON pp.sport_id = s.id
       WHERE pp.user_id = $1 AND pp.is_active = true
       ORDER BY s.display_name`,
      [req.user.id]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        dateOfBirth: user.date_of_birth,
        profileImageUrl: user.profile_image_url,
        isVerified: user.is_verified,
        createdAt: user.created_at
      },
      location: locationResult.rows.length > 0 ? {
        coordinates: locationResult.rows[0].location.coordinates,
        address: locationResult.rows[0].address,
        city: locationResult.rows[0].city,
        state: locationResult.rows[0].state,
        country: locationResult.rows[0].country,
        postalCode: locationResult.rows[0].postal_code
      } : null,
      sportProfiles: profilesResult.rows.map(profile => ({
        id: profile.id,
        sportId: profile.sport_id,
        sportName: profile.sport_name,
        sportDisplayName: profile.sport_display_name,
        rating: parseFloat(profile.rating),
        gamesPlayed: profile.games_played,
        wins: profile.wins,
        losses: profile.losses,
        draws: profile.draws,
        preferredSkillLevel: profile.preferred_skill_level,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }))
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/players/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { firstName, lastName, dateOfBirth, phone, profileImageUrl } = value;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (dateOfBirth !== undefined) {
      updates.push(`date_of_birth = $${paramCount++}`);
      values.push(dateOfBirth);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (profileImageUrl !== undefined) {
      updates.push(`profile_image_url = $${paramCount++}`);
      values.push(profileImageUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.id);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, date_of_birth, profile_image_url
    `;

    const result = await pool.query(query, values);
    
    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/players/location
 * Set user location
 */
router.post('/location', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { error, value } = locationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { latitude, longitude, address, city, state, country, postalCode } = value;

    // Convert to PostGIS point
    const point = `POINT(${longitude} ${latitude})`;

    // Update or insert location
    await pool.query(
      `INSERT INTO user_locations (user_id, location, address, city, state, country, postal_code, is_primary)
       VALUES ($1, ST_GeomFromText($2, 4326), $3, $4, $5, $6, $7, true)
       ON CONFLICT (user_id) WHERE is_primary = true
       DO UPDATE SET 
         location = ST_GeomFromText($2, 4326),
         address = $3,
         city = $4,
         state = $5,
         country = $6,
         postal_code = $7,
         updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, point, address, city, state, country, postalCode]
    );

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/players/sport-profile
 * Add or update sport profile
 */
router.post('/sport-profile', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { error, value } = sportProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { sportId, preferredSkillLevel } = value;

    // Verify sport exists
    const sportResult = await pool.query('SELECT id FROM sports WHERE id = $1 AND is_active = true', [sportId]);
    if (sportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sport not found' });
    }

    // Insert or update sport profile
    const result = await pool.query(
      `INSERT INTO player_profiles (user_id, sport_id, preferred_skill_level)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, sport_id)
       DO UPDATE SET 
         preferred_skill_level = $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, sportId, preferredSkillLevel || 'intermediate']
    );

    res.json({
      message: 'Sport profile updated successfully',
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Update sport profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/players/:id
 * Get public player profile
 */
router.get('/:id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    // Get player basic info
    const userResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.profile_image_url
       FROM users u WHERE u.id = $1`,
      [playerId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const user = userResult.rows[0];

    // Get player profiles for all sports
    const profilesResult = await pool.query(
      `SELECT pp.rating, pp.games_played, pp.wins, pp.losses, pp.draws,
              s.name as sport_name, s.display_name as sport_display_name
       FROM player_profiles pp
       JOIN sports s ON pp.sport_id = s.id
       WHERE pp.user_id = $1 AND pp.is_active = true
       ORDER BY s.display_name`,
      [playerId]
    );

    res.json({
      player: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        profileImageUrl: user.profile_image_url
      },
      sportProfiles: profilesResult.rows.map(profile => ({
        sportName: profile.sport_name,
        sportDisplayName: profile.sport_display_name,
        rating: parseFloat(profile.rating),
        gamesPlayed: profile.games_played,
        wins: profile.wins,
        losses: profile.losses,
        draws: profile.draws
      }))
    });
  } catch (error) {
    console.error('Get player profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/players/sports
 * Get available sports
 */
router.get('/sports', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, display_name, description FROM sports WHERE is_active = true ORDER BY display_name'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get sports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
