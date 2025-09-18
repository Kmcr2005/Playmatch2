const express = require('express');
const pool = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/leaderboards
 * Get leaderboards for a specific sport
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      sport, 
      area = 'global', 
      lat, 
      lng, 
      radius = 50,
      limit = 50,
      offset = 0
    } = req.query;

    if (!sport) {
      return res.status(400).json({ error: 'Sport parameter is required' });
    }

    // Verify sport exists
    const sportResult = await pool.query(
      'SELECT id, display_name FROM sports WHERE id = $1 AND is_active = true',
      [sport]
    );

    if (sportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sport not found' });
    }

    const sportInfo = sportResult.rows[0];

    let query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.profile_image_url,
        pp.rating,
        pp.games_played,
        pp.wins,
        pp.losses,
        pp.draws,
        ROUND((pp.wins::decimal / NULLIF(pp.games_played, 0)) * 100, 1) as win_percentage,
        ul.city,
        ul.state,
        ul.country
    `;

    // Add distance calculation for local leaderboards
    if (area === 'local' && lat && lng) {
      query += `, ST_Distance(ul.location, ST_GeomFromText($1, 4326)) as distance`;
    }

    query += `
      FROM player_profiles pp
      JOIN users u ON pp.user_id = u.id
      LEFT JOIN user_locations ul ON u.id = ul.user_id AND ul.is_primary = true
      WHERE pp.sport_id = $2
        AND pp.is_active = true
        AND u.is_verified = true
        AND pp.games_played >= 5
    `;

    const queryParams = [];
    let paramCount = 1;

    // Add location filter for local leaderboards
    if (area === 'local' && lat && lng) {
      query += ` AND ul.location IS NOT NULL 
                 AND ST_DWithin(ul.location, ST_GeomFromText($${paramCount++}, 4326), $${paramCount++})`;
      queryParams.push(`POINT(${lng} ${lat})`, radius * 1000); // Convert km to meters
    }

    query += ` ORDER BY pp.rating DESC, pp.games_played DESC`;

    // Add pagination
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(sport, parseInt(limit), parseInt(offset));

    const result = await pool.query(query, queryParams);

    const leaderboard = result.rows.map((row, index) => ({
      rank: offset + index + 1,
      player: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        profileImageUrl: row.profile_image_url,
        location: row.city ? {
          city: row.city,
          state: row.state,
          country: row.country
        } : null
      },
      stats: {
        rating: parseFloat(row.rating),
        gamesPlayed: row.games_played,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
        winPercentage: parseFloat(row.win_percentage) || 0
      },
      distance: row.distance ? Math.round(row.distance / 1000 * 100) / 100 : null
    }));

    res.json({
      sport: {
        id: sportInfo.id,
        displayName: sportInfo.display_name
      },
      area,
      leaderboard,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: leaderboard.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/leaderboards/player/:id
 * Get player's ranking and stats for a sport
 */
router.get('/player/:id', async (req, res) => {
  try {
    const { sport } = req.query;
    const playerId = parseInt(req.params.id);

    if (!sport) {
      return res.status(400).json({ error: 'Sport parameter is required' });
    }

    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    // Get player's stats
    const playerResult = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.profile_image_url,
        pp.rating,
        pp.games_played,
        pp.wins,
        pp.losses,
        pp.draws,
        ROUND((pp.wins::decimal / NULLIF(pp.games_played, 0)) * 100, 1) as win_percentage,
        ul.city,
        ul.state,
        ul.country
       FROM player_profiles pp
       JOIN users u ON pp.user_id = u.id
       LEFT JOIN user_locations ul ON u.id = ul.user_id AND ul.is_primary = true
       WHERE pp.user_id = $1 AND pp.sport_id = $2 AND pp.is_active = true`,
      [playerId, sport]
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player profile not found for this sport' });
    }

    const player = playerResult.rows[0];

    // Get player's global ranking
    const globalRankResult = await pool.query(
      `SELECT COUNT(*) + 1 as rank
       FROM player_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.sport_id = $1 
         AND pp.is_active = true 
         AND u.is_verified = true
         AND pp.games_played >= 5
         AND (pp.rating > $2 OR (pp.rating = $2 AND pp.games_played > $3))`,
      [sport, player.rating, player.games_played]
    );

    const globalRank = parseInt(globalRankResult.rows[0].rank);

    // Get player's local ranking if they have a location
    let localRank = null;
    if (player.city) {
      const localRankResult = await pool.query(
        `SELECT COUNT(*) + 1 as rank
         FROM player_profiles pp
         JOIN users u ON pp.user_id = u.id
         JOIN user_locations ul ON u.id = ul.user_id AND ul.is_primary = true
         WHERE pp.sport_id = $1 
           AND pp.is_active = true 
           AND u.is_verified = true
           AND pp.games_played >= 5
           AND ul.city = $2
           AND ul.state = $3
           AND (pp.rating > $4 OR (pp.rating = $4 AND pp.games_played > $5))`,
        [sport, player.city, player.state, player.rating, player.games_played]
      );

      localRank = parseInt(localRankResult.rows[0].rank);
    }

    res.json({
      player: {
        id: player.id,
        firstName: player.first_name,
        lastName: player.last_name,
        profileImageUrl: player.profile_image_url,
        location: player.city ? {
          city: player.city,
          state: player.state,
          country: player.country
        } : null
      },
      stats: {
        rating: parseFloat(player.rating),
        gamesPlayed: player.games_played,
        wins: player.wins,
        losses: player.losses,
        draws: player.draws,
        winPercentage: parseFloat(player.win_percentage) || 0
      },
      rankings: {
        global: globalRank,
        local: localRank
      }
    });
  } catch (error) {
    console.error('Get player ranking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/leaderboards/recent-matches
 * Get recent matches for leaderboard context
 */
router.get('/recent-matches', async (req, res) => {
  try {
    const { sport, limit = 10 } = req.query;

    if (!sport) {
      return res.status(400).json({ error: 'Sport parameter is required' });
    }

    const result = await pool.query(
      `SELECT 
        m.id,
        m.scheduled_at,
        m.player1_result,
        m.player2_result,
        m.rating_change_player1,
        m.rating_change_player2,
        p1.first_name as player1_first_name,
        p1.last_name as player1_last_name,
        p1.profile_image_url as player1_profile_image,
        p2.first_name as player2_first_name,
        p2.last_name as player2_last_name,
        p2.profile_image_url as player2_profile_image,
        pp1.rating as player1_rating,
        pp2.rating as player2_rating
       FROM matches m
       JOIN users p1 ON m.player1_id = p1.id
       JOIN users p2 ON m.player2_id = p2.id
       JOIN player_profiles pp1 ON m.player1_id = pp1.user_id AND m.sport_id = pp1.sport_id
       JOIN player_profiles pp2 ON m.player2_id = pp2.user_id AND m.sport_id = pp2.sport_id
       WHERE m.sport_id = $1 
         AND m.status = 'completed'
       ORDER BY m.scheduled_at DESC
       LIMIT $2`,
      [sport, parseInt(limit)]
    );

    const recentMatches = result.rows.map(match => ({
      id: match.id,
      scheduledAt: match.scheduled_at,
      player1: {
        id: match.player1_id,
        firstName: match.player1_first_name,
        lastName: match.player1_last_name,
        profileImageUrl: match.player1_profile_image,
        result: match.player1_result,
        rating: parseFloat(match.player1_rating),
        ratingChange: match.rating_change_player1 ? parseFloat(match.rating_change_player1) : 0
      },
      player2: {
        id: match.player2_id,
        firstName: match.player2_first_name,
        lastName: match.player2_last_name,
        profileImageUrl: match.player2_profile_image,
        result: match.player2_result,
        rating: parseFloat(match.player2_rating),
        ratingChange: match.rating_change_player2 ? parseFloat(match.rating_change_player2) : 0
      }
    }));

    res.json({ recentMatches });
  } catch (error) {
    console.error('Get recent matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/leaderboards/stats
 * Get overall platform statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { sport } = req.query;

    let sportFilter = '';
    const queryParams = [];
    let paramCount = 1;

    if (sport) {
      sportFilter = `WHERE sport_id = $${paramCount++}`;
      queryParams.push(sport);
    }

    // Get total players
    const playersResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as total_players
       FROM player_profiles pp
       JOIN users u ON pp.user_id = u.id
       ${sportFilter.replace('sport_id', 'pp.sport_id')}
       AND pp.is_active = true AND u.is_verified = true`,
      queryParams
    );

    // Get total matches
    const matchesResult = await pool.query(
      `SELECT COUNT(*) as total_matches
       FROM matches m
       ${sportFilter.replace('sport_id', 'm.sport_id')}
       AND m.status = 'completed'`,
      queryParams
    );

    // Get average rating
    const avgRatingResult = await pool.query(
      `SELECT ROUND(AVG(rating), 2) as average_rating
       FROM player_profiles pp
       JOIN users u ON pp.user_id = u.id
       ${sportFilter.replace('sport_id', 'pp.sport_id')}
       AND pp.is_active = true AND u.is_verified = true AND pp.games_played >= 5`,
      queryParams
    );

    // Get top rated player
    const topPlayerResult = await pool.query(
      `SELECT 
        u.first_name,
        u.last_name,
        pp.rating,
        pp.games_played
       FROM player_profiles pp
       JOIN users u ON pp.user_id = u.id
       ${sportFilter.replace('sport_id', 'pp.sport_id')}
       AND pp.is_active = true AND u.is_verified = true AND pp.games_played >= 5
       ORDER BY pp.rating DESC, pp.games_played DESC
       LIMIT 1`,
      queryParams
    );

    res.json({
      totalPlayers: parseInt(playersResult.rows[0].total_players),
      totalMatches: parseInt(matchesResult.rows[0].total_matches),
      averageRating: parseFloat(avgRatingResult.rows[0].average_rating) || 0,
      topPlayer: topPlayerResult.rows.length > 0 ? {
        name: `${topPlayerResult.rows[0].first_name} ${topPlayerResult.rows[0].last_name}`,
        rating: parseFloat(topPlayerResult.rows[0].rating),
        gamesPlayed: topPlayerResult.rows[0].games_played
      } : null
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
