const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createTurfSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).optional(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  address: Joi.string().min(5).max(500).required(),
  city: Joi.string().min(2).max(100).required(),
  state: Joi.string().min(2).max(100).required(),
  country: Joi.string().min(2).max(100).default('US'),
  postalCode: Joi.string().max(20).optional(),
  phone: Joi.string().max(20).optional(),
  email: Joi.string().email().optional(),
  website: Joi.string().uri().optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  surfaceTypes: Joi.array().items(Joi.string()).optional(),
  hourlyRate: Joi.number().min(0).max(1000).optional(),
  sports: Joi.array().items(Joi.number().integer().positive()).required()
});

const updateTurfSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  address: Joi.string().min(5).max(500).optional(),
  city: Joi.string().min(2).max(100).optional(),
  state: Joi.string().min(2).max(100).optional(),
  country: Joi.string().min(2).max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  phone: Joi.string().max(20).optional(),
  email: Joi.string().email().optional(),
  website: Joi.string().uri().optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  surfaceTypes: Joi.array().items(Joi.string()).optional(),
  hourlyRate: Joi.number().min(0).max(1000).optional(),
  isActive: Joi.boolean().optional()
});

/**
 * GET /api/turfs
 * Get turfs with optional filtering
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      lat, 
      lng, 
      radius = 10, 
      sport, 
      amenities, 
      surfaceType,
      minRate,
      maxRate,
      limit = 20,
      offset = 0
    } = req.query;

    let query = `
      SELECT DISTINCT
        t.id,
        t.name,
        t.description,
        ST_X(t.location) as longitude,
        ST_Y(t.location) as latitude,
        t.address,
        t.city,
        t.state,
        t.country,
        t.postal_code,
        t.phone,
        t.email,
        t.website,
        t.amenities,
        t.surface_types,
        t.hourly_rate,
        t.is_active,
        t.created_at
    `;

    // Add distance calculation if lat/lng provided
    if (lat && lng) {
      query += `, ST_Distance(t.location, ST_GeomFromText($1, 4326)) as distance`;
    }

    query += `
      FROM turfs t
      LEFT JOIN turf_sports ts ON t.id = ts.turf_id
      WHERE t.is_active = true
    `;

    const queryParams = [];
    let paramCount = 1;

    // Add location filter
    if (lat && lng) {
      query += ` AND ST_DWithin(t.location, ST_GeomFromText($${paramCount++}, 4326), $${paramCount++})`;
      queryParams.push(`POINT(${lng} ${lat})`, radius * 1000); // Convert km to meters
    }

    // Add sport filter
    if (sport) {
      query += ` AND ts.sport_id = $${paramCount++} AND ts.is_available = true`;
      queryParams.push(sport);
    }

    // Add amenities filter
    if (amenities) {
      const amenityList = amenities.split(',').map(a => a.trim());
      query += ` AND t.amenities && $${paramCount++}`;
      queryParams.push(amenityList);
    }

    // Add surface type filter
    if (surfaceType) {
      const surfaceList = surfaceType.split(',').map(s => s.trim());
      query += ` AND t.surface_types && $${paramCount++}`;
      queryParams.push(surfaceList);
    }

    // Add rate filters
    if (minRate) {
      query += ` AND t.hourly_rate >= $${paramCount++}`;
      queryParams.push(minRate);
    }
    if (maxRate) {
      query += ` AND t.hourly_rate <= $${paramCount++}`;
      queryParams.push(maxRate);
    }

    // Add ordering and pagination
    if (lat && lng) {
      query += ` ORDER BY distance ASC`;
    } else {
      query += ` ORDER BY t.name ASC`;
    }

    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, queryParams);

    // Get sports for each turf
    const turfIds = result.rows.map(turf => turf.id);
    let sportsQuery = '';
    let sportsParams = [];

    if (turfIds.length > 0) {
      sportsQuery = `
        SELECT ts.turf_id, s.id, s.name, s.display_name
        FROM turf_sports ts
        JOIN sports s ON ts.sport_id = s.id
        WHERE ts.turf_id = ANY($1) AND ts.is_available = true
        ORDER BY ts.turf_id, s.display_name
      `;
      sportsParams = [turfIds];
    }

    const sportsResult = turfIds.length > 0 ? await pool.query(sportsQuery, sportsParams) : { rows: [] };

    // Group sports by turf
    const sportsByTurf = {};
    sportsResult.rows.forEach(row => {
      if (!sportsByTurf[row.turf_id]) {
        sportsByTurf[row.turf_id] = [];
      }
      sportsByTurf[row.turf_id].push({
        id: row.id,
        name: row.name,
        displayName: row.display_name
      });
    });

    const turfs = result.rows.map(turf => ({
      id: turf.id,
      name: turf.name,
      description: turf.description,
      location: {
        latitude: parseFloat(turf.latitude),
        longitude: parseFloat(turf.longitude)
      },
      address: turf.address,
      city: turf.city,
      state: turf.state,
      country: turf.country,
      postalCode: turf.postal_code,
      phone: turf.phone,
      email: turf.email,
      website: turf.website,
      amenities: turf.amenities || [],
      surfaceTypes: turf.surface_types || [],
      hourlyRate: turf.hourly_rate ? parseFloat(turf.hourly_rate) : null,
      isActive: turf.is_active,
      distance: turf.distance ? Math.round(turf.distance / 1000 * 100) / 100 : null, // Convert to km
      sports: sportsByTurf[turf.id] || [],
      createdAt: turf.created_at
    }));

    res.json({
      turfs,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: turfs.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get turfs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/turfs/:id
 * Get specific turf details
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const turfId = parseInt(req.params.id);
    if (isNaN(turfId)) {
      return res.status(400).json({ error: 'Invalid turf ID' });
    }

    const turfResult = await pool.query(
      `SELECT 
        t.*,
        ST_X(t.location) as longitude,
        ST_Y(t.location) as latitude
      FROM turfs t
      WHERE t.id = $1`,
      [turfId]
    );

    if (turfResult.rows.length === 0) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    const turf = turfResult.rows[0];

    // Get sports for this turf
    const sportsResult = await pool.query(
      `SELECT s.id, s.name, s.display_name
       FROM turf_sports ts
       JOIN sports s ON ts.sport_id = s.id
       WHERE ts.turf_id = $1 AND ts.is_available = true
       ORDER BY s.display_name`,
      [turfId]
    );

    res.json({
      id: turf.id,
      name: turf.name,
      description: turf.description,
      location: {
        latitude: parseFloat(turf.latitude),
        longitude: parseFloat(turf.longitude)
      },
      address: turf.address,
      city: turf.city,
      state: turf.state,
      country: turf.country,
      postalCode: turf.postal_code,
      phone: turf.phone,
      email: turf.email,
      website: turf.website,
      amenities: turf.amenities || [],
      surfaceTypes: turf.surface_types || [],
      hourlyRate: turf.hourly_rate ? parseFloat(turf.hourly_rate) : null,
      isActive: turf.is_active,
      sports: sportsResult.rows,
      createdAt: turf.created_at,
      updatedAt: turf.updated_at
    });
  } catch (error) {
    console.error('Get turf error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/turfs
 * Create a new turf (admin only for now)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = createTurfSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      name, description, latitude, longitude, address, city, state, country,
      postalCode, phone, email, website, amenities, surfaceTypes, hourlyRate, sports
    } = value;

    // Convert to PostGIS point
    const point = `POINT(${longitude} ${latitude})`;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create turf
      const turfResult = await client.query(
        `INSERT INTO turfs 
         (name, description, location, address, city, state, country, postal_code, 
          phone, email, website, amenities, surface_types, hourly_rate)
         VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [name, description, point, address, city, state, country, postalCode,
         phone, email, website, amenities, surfaceTypes, hourlyRate]
      );

      const turf = turfResult.rows[0];

      // Add sports to turf
      for (const sportId of sports) {
        await client.query(
          'INSERT INTO turf_sports (turf_id, sport_id) VALUES ($1, $2)',
          [turf.id, sportId]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Turf created successfully',
        turf: {
          id: turf.id,
          name: turf.name,
          description: turf.description,
          location: { latitude, longitude },
          address: turf.address,
          city: turf.city,
          state: turf.state,
          country: turf.country,
          postalCode: turf.postal_code,
          phone: turf.phone,
          email: turf.email,
          website: turf.website,
          amenities: turf.amenities || [],
          surfaceTypes: turf.surface_types || [],
          hourlyRate: turf.hourly_rate ? parseFloat(turf.hourly_rate) : null,
          isActive: turf.is_active,
          sports: sports,
          createdAt: turf.created_at
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create turf error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/turfs/:id
 * Update turf (admin only for now)
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const turfId = parseInt(req.params.id);
    if (isNaN(turfId)) {
      return res.status(400).json({ error: 'Invalid turf ID' });
    }

    const { error, value } = updateTurfSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(value).forEach(key => {
      if (value[key] !== undefined) {
        const dbKey = key === 'isActive' ? 'is_active' : 
                     key === 'postalCode' ? 'postal_code' :
                     key === 'hourlyRate' ? 'hourly_rate' :
                     key === 'surfaceTypes' ? 'surface_types' : key;
        
        updates.push(`${dbKey} = $${paramCount++}`);
        values.push(value[key]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(turfId);

    const query = `
      UPDATE turfs 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    res.json({
      message: 'Turf updated successfully',
      turf: result.rows[0]
    });
  } catch (error) {
    console.error('Update turf error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/turfs/amenities
 * Get available amenities
 */
router.get('/amenities', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT unnest(amenities) as amenity
       FROM turfs 
       WHERE amenities IS NOT NULL AND array_length(amenities, 1) > 0
       ORDER BY amenity`
    );

    res.json(result.rows.map(row => row.amenity));
  } catch (error) {
    console.error('Get amenities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/turfs/surface-types
 * Get available surface types
 */
router.get('/surface-types', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT unnest(surface_types) as surface_type
       FROM turfs 
       WHERE surface_types IS NOT NULL AND array_length(surface_types, 1) > 0
       ORDER BY surface_type`
    );

    res.json(result.rows.map(row => row.surface_type));
  } catch (error) {
    console.error('Get surface types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
