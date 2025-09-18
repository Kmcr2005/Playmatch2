const pool = require('../config/database');

const createTables = async () => {
  try {
    console.log('🔄 Creating database tables...');

    // Enable PostGIS extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE,
        profile_image_url TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sports (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Player profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE,
        rating DECIMAL(10,2) DEFAULT 1500.00,
        games_played INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        preferred_skill_level VARCHAR(20) DEFAULT 'intermediate',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, sport_id)
      );
    `);

    // User locations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_locations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        location GEOMETRY(POINT, 4326) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'US',
        postal_code VARCHAR(20),
        is_primary BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Turfs/Venues table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS turfs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        location GEOMETRY(POINT, 4326) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        country VARCHAR(100) DEFAULT 'US',
        postal_code VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(255),
        website TEXT,
        amenities TEXT[], -- Array of amenities like ['indoor', 'outdoor', 'parking', 'lighting']
        surface_types TEXT[], -- Array of surface types like ['wood', 'concrete', 'grass']
        hourly_rate DECIMAL(10,2),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Turf sports mapping
    await pool.query(`
      CREATE TABLE IF NOT EXISTS turf_sports (
        id SERIAL PRIMARY KEY,
        turf_id INTEGER REFERENCES turfs(id) ON DELETE CASCADE,
        sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE,
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(turf_id, sport_id)
      );
    `);

    // Matches table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        player1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        player2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE,
        turf_id INTEGER REFERENCES turfs(id) ON DELETE SET NULL,
        scheduled_at TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
        player1_result VARCHAR(10), -- win, loss, draw
        player2_result VARCHAR(10), -- win, loss, draw
        player1_rating_before DECIMAL(10,2),
        player2_rating_before DECIMAL(10,2),
        player1_rating_after DECIMAL(10,2),
        player2_rating_after DECIMAL(10,2),
        rating_change_player1 DECIMAL(10,2),
        rating_change_player2 DECIMAL(10,2),
        match_duration_minutes INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Match requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_requests (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE,
        preferred_turf_id INTEGER REFERENCES turfs(id) ON DELETE SET NULL,
        preferred_time_start TIMESTAMP,
        preferred_time_end TIMESTAMP,
        max_distance_km INTEGER DEFAULT 10,
        min_rating DECIMAL(10,2),
        max_rating DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'active', -- active, matched, expired, cancelled
        matched_with_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_locations_location ON user_locations USING GIST (location);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_turfs_location ON turfs USING GIST (location);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_player_profiles_rating ON player_profiles (sport_id, rating DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_matches_scheduled_at ON matches (scheduled_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_match_requests_status ON match_requests (status, created_at);
    `);

    // Insert default sports
    await pool.query(`
      INSERT INTO sports (name, display_name, description) VALUES
      ('badminton', 'Badminton', 'Racquet sport played with a shuttlecock'),
      ('table_tennis', 'Table Tennis', 'Ping pong - indoor racquet sport'),
      ('pickleball', 'Pickleball', 'Paddle sport combining elements of tennis, badminton, and ping-pong')
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log('✅ Database tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

const dropTables = async () => {
  try {
    console.log('🗑️ Dropping database tables...');
    
    const tables = [
      'match_requests',
      'matches', 
      'turf_sports',
      'turfs',
      'user_locations',
      'player_profiles',
      'sports',
      'users'
    ];

    for (const table of tables) {
      await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }

    console.log('✅ Database tables dropped successfully!');
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  }
};

// Run migrations if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'create') {
    createTables()
      .then(() => {
        console.log('🎉 Migration completed successfully!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Migration failed:', error);
        process.exit(1);
      });
  } else if (command === 'drop') {
    dropTables()
      .then(() => {
        console.log('🎉 Tables dropped successfully!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Drop failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage: node migrate.js [create|drop]');
    process.exit(1);
  }
}

module.exports = { createTables, dropTables };
