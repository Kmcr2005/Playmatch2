# PlayMatch - Sports Matchmaking Platform

PlayMatch is a comprehensive sports matchmaking platform that pairs players of similar skill levels in sports such as badminton, table tennis, and pickleball. The system uses a chess-style Elo rating algorithm to ensure fair and competitive matches.

## 🏆 Features

### Core Features (MVP)
- **User Authentication**: Secure signup/login with JWT tokens
- **Player Profiles**: Manage sports preferences, ratings, and location
- **Smart Matchmaking**: Find opponents based on skill level, proximity, and availability
- **Elo Rating System**: Accurate skill assessment with K-factor adjustments
- **Match Management**: Schedule matches, report results, and track rating changes
- **Venue Discovery**: Find and filter sports venues by location and amenities
- **Leaderboards**: Global and local rankings for each sport
- **Real-time Updates**: Live match status and rating changes

### Technical Features
- **PostGIS Integration**: Advanced geospatial queries for location-based matching
- **Responsive Design**: Modern UI that works on all devices
- **Rate Limiting**: API protection against abuse
- **Data Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Graceful error handling with user-friendly messages

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Database**: PostgreSQL with PostGIS extension for geospatial data
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **API**: RESTful API with comprehensive error handling
- **Security**: Helmet.js, CORS, rate limiting, and input validation

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) for consistent design
- **State Management**: React Context for authentication
- **Routing**: React Router for navigation
- **Forms**: React Hook Form with Yup validation
- **HTTP Client**: Axios with interceptors

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Supabase account (free tier available)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd playmatch
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up Supabase**
   ```bash
   # Create a new Supabase project at https://supabase.com
   # Note down your project URL and API keys
   ```

4. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp server/env.example server/.env
   
   # Edit server/.env with your Supabase credentials
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

5. **Enable PostGIS extension in Supabase**
   ```sql
   -- Go to your Supabase dashboard > SQL Editor
   -- Run this command:
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

6. **Run database migrations**
   ```bash
   cd server
   node scripts/supabase-migrate.js create
   ```

7. **Start the development servers**
   ```bash
   # From the root directory
   npm run dev
   ```

This will start:
- Backend server on http://localhost:5000
- Frontend development server on http://localhost:3000

## 🗄️ Supabase Setup Guide

### Creating a Supabase Project

1. **Sign up for Supabase**
   - Go to [https://supabase.com](https://supabase.com)
   - Create a free account
   - Click "New Project"

2. **Configure your project**
   - Choose your organization
   - Enter project name: `playmatch`
   - Set a strong database password
   - Choose a region close to your users
   - Click "Create new project"

3. **Get your API keys**
   - Go to Settings > API
   - Copy the following:
     - Project URL
     - `anon` `public` key
     - `service_role` `secret` key

4. **Enable PostGIS extension**
   - Go to SQL Editor in your Supabase dashboard
   - Run: `CREATE EXTENSION IF NOT EXISTS postgis;`
   - Click "Run" to execute

### Environment Configuration

Create a `.env` file in the `server` directory:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Configuration (Optional - can use Supabase Auth)
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# External APIs (Optional)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

### Database Migration

Run the migration script to create all tables:

```bash
cd server
node scripts/supabase-migrate.js create
```

This will create:
- All required tables with proper relationships
- PostGIS spatial indexes for location-based queries
- Default sports data (badminton, table tennis, pickleball)
- Optimized indexes for performance

### Supabase Features Used

- **PostgreSQL Database**: Full-featured relational database
- **PostGIS Extension**: Geospatial queries for location matching
- **Row Level Security**: Data protection and access control
- **Real-time Subscriptions**: Live updates for match status
- **Edge Functions**: Serverless functions for complex operations
- **Storage**: File storage for profile images and documents

## 📊 Database Schema

### Core Tables
- **users**: User accounts and basic information
- **player_profiles**: Sport-specific profiles with Elo ratings
- **user_locations**: Geospatial user location data
- **sports**: Available sports (badminton, table tennis, pickleball)
- **turfs**: Venue information with location and amenities
- **matches**: Match records with results and rating changes
- **match_requests**: Active matchmaking requests

### Key Features
- **PostGIS Integration**: Efficient geospatial queries for location-based matching
- **Rating System**: Elo-based ratings with K-factor adjustments for player experience
- **Flexible Schema**: Support for multiple sports per user and venue

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh JWT token

### Players
- `GET /api/players/profile` - Get complete user profile
- `PUT /api/players/profile` - Update user profile
- `POST /api/players/location` - Set user location
- `POST /api/players/sport-profile` - Add/update sport profile
- `GET /api/players/:id` - Get public player profile
- `GET /api/players/sports` - Get available sports

### Matchmaking
- `POST /api/matchmaking/request` - Create match request
- `GET /api/matchmaking/candidates` - Get potential opponents
- `GET /api/matchmaking/requests` - Get user's match requests
- `DELETE /api/matchmaking/requests/:id` - Cancel match request

### Matches
- `GET /api/matches` - Get user's matches
- `GET /api/matches/:id` - Get specific match details
- `POST /api/matches/report-result` - Report match result
- `POST /api/matches/:id/cancel` - Cancel a match

### Turfs
- `GET /api/turfs` - Get venues with filtering
- `GET /api/turfs/:id` - Get specific venue details
- `POST /api/turfs` - Create new venue (admin)
- `PUT /api/turfs/:id` - Update venue (admin)

### Leaderboards
- `GET /api/leaderboards` - Get sport leaderboards
- `GET /api/leaderboards/player/:id` - Get player ranking
- `GET /api/leaderboards/recent-matches` - Get recent matches
- `GET /api/leaderboards/stats` - Get platform statistics

## 🎯 Elo Rating System

The platform uses a sophisticated Elo rating system adapted for sports:

### Rating Calculation
- **Initial Rating**: 1500 for all new players
- **K-Factor**: Adjusts rating volatility based on experience
  - New players (< 10 games): K=32
  - Developing players (10-30 games): K=24
  - Experienced players (30+ games): K=16

### Matchmaking Criteria
- **Rating Range**: ±200 points by default (adjustable)
- **Distance**: Configurable radius (default 10km)
- **Availability**: Time and venue preferences
- **Win Probability**: Target 40-60% for balanced matches

## 🗺️ Location Features

### Geospatial Capabilities
- **PostGIS Integration**: Efficient spatial queries
- **Distance Calculation**: Accurate distance-based matching
- **Location Filtering**: Find venues and players within radius
- **Address Geocoding**: Convert addresses to coordinates

### Supported Location Data
- User home locations
- Venue addresses
- Match locations
- Search radius preferences

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure, stateless authentication
- **Password Hashing**: bcrypt with salt rounds
- **Route Protection**: Authenticated routes with middleware
- **Token Refresh**: Automatic token renewal

### API Security
- **Rate Limiting**: Prevent API abuse
- **CORS Configuration**: Controlled cross-origin requests
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries

## 🎨 Frontend Features

### User Interface
- **Material-UI**: Consistent, modern design system
- **Responsive Design**: Mobile-first approach
- **Dark/Light Theme**: User preference support
- **Accessibility**: WCAG compliant components

### User Experience
- **Real-time Updates**: Live match status updates
- **Form Validation**: Client-side validation with helpful errors
- **Loading States**: Smooth loading indicators
- **Error Handling**: User-friendly error messages

## 📱 Mobile Support

The platform is fully responsive and works seamlessly on:
- Desktop computers
- Tablets
- Mobile phones
- Progressive Web App (PWA) capabilities

## 🚀 Deployment

### Production Setup
1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   DB_HOST=your_production_db_host
   JWT_SECRET=your_production_secret
   ```

2. **Build Frontend**
   ```bash
   cd client
   npm run build
   ```

3. **Database Migration**
   ```bash
   cd server
   npm run migrate create
   ```

4. **Start Production Server**
   ```bash
   cd server
   npm start
   ```

### Recommended Hosting
- **Backend**: AWS EC2, Google Cloud Run, or DigitalOcean
- **Database**: AWS RDS, Google Cloud SQL, or managed PostgreSQL
- **Frontend**: Vercel, Netlify, or AWS S3 + CloudFront
- **Maps**: Google Maps API or Mapbox

## 🧪 Testing

### Backend Testing
```bash
cd server
npm test
```

### Frontend Testing
```bash
cd client
npm test
```

### API Testing
Use tools like Postman or curl to test API endpoints:
```bash
# Test health endpoint
curl http://localhost:5000/health

# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📈 Performance Optimization

### Database Optimization
- **Indexes**: Optimized indexes for common queries
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Optimized spatial and rating queries

### Frontend Optimization
- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Compressed and responsive images
- **Caching**: Efficient API response caching

## 🔮 Future Enhancements

### Planned Features
- **Tournament System**: Organize and manage tournaments
- **Team Matches**: Support for doubles and team sports
- **Payment Integration**: Venue booking and payment processing
- **AI Recommendations**: Machine learning for better matchmaking
- **Mobile App**: Native iOS and Android applications
- **Social Features**: Player connections and messaging
- **Analytics Dashboard**: Detailed performance analytics

### Technical Improvements
- **Real-time Communication**: WebSocket integration
- **Microservices**: Break down into smaller services
- **Caching Layer**: Redis for improved performance
- **Monitoring**: Comprehensive logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the API endpoints

## 🙏 Acknowledgments

- Elo rating system based on chess rating methodology
- Material-UI for the design system
- PostGIS for geospatial capabilities
- React and Node.js communities for excellent tooling

---

**PlayMatch** - Find your perfect sports opponent! 🏓🏸🎾
