#!/bin/bash

echo "🏓 Setting up PlayMatch - Sports Matchmaking Platform"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16 or higher) first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js is installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm run install-all

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "⚙️  Creating environment configuration..."
    cp server/env.example server/.env
    echo "📝 Please edit server/.env with your Supabase credentials"
    echo "   - SUPABASE_URL: your Supabase project URL"
    echo "   - SUPABASE_ANON_KEY: your Supabase anon key"
    echo "   - SUPABASE_SERVICE_ROLE_KEY: your Supabase service role key"
    echo "   - JWT_SECRET: a secure random string"
fi

# Supabase setup
echo "🗄️  Setting up Supabase..."
echo "Please ensure you have:"
echo "1. Created a Supabase project at https://supabase.com"
echo "2. Enabled PostGIS extension in SQL Editor: CREATE EXTENSION IF NOT EXISTS postgis;"
echo "3. Updated server/.env with your Supabase credentials"
echo ""
echo "To set up your Supabase project:"
echo "  1. Go to https://supabase.com and create a new project"
echo "  2. Copy your project URL and API keys"
echo "  3. Update server/.env with your credentials"
echo "  4. Run: cd server && node scripts/supabase-migrate.js create"
echo ""

echo "🚀 Setup complete! To start the development servers:"
echo "  npm run dev"
echo ""
echo "This will start:"
echo "  - Backend server on http://localhost:5000"
echo "  - Frontend server on http://localhost:3000"
echo ""
echo "📚 See README.md for detailed setup instructions and API documentation"
