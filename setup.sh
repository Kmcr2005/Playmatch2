#!/bin/bash

echo "🏓 Setting up PlayMatch - Sports Matchmaking Platform"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16 or higher) first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    echo "   Visit: https://www.postgresql.org/download/"
    exit 1
fi

echo "✅ Node.js and PostgreSQL are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm run install-all

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "⚙️  Creating environment configuration..."
    cp server/env.example server/.env
    echo "📝 Please edit server/.env with your database credentials"
    echo "   - DB_USER: your PostgreSQL username"
    echo "   - DB_PASSWORD: your PostgreSQL password"
    echo "   - JWT_SECRET: a secure random string"
fi

# Database setup
echo "🗄️  Setting up database..."
echo "Please ensure you have:"
echo "1. Created a PostgreSQL database named 'playmatch'"
echo "2. Installed PostGIS extension: CREATE EXTENSION IF NOT EXISTS postgis;"
echo "3. Updated server/.env with correct database credentials"
echo ""
echo "To create the database and run migrations:"
echo "  createdb playmatch"
echo "  psql -d playmatch -c 'CREATE EXTENSION IF NOT EXISTS postgis;'"
echo "  cd server && npm run migrate create"
echo ""

echo "🚀 Setup complete! To start the development servers:"
echo "  npm run dev"
echo ""
echo "This will start:"
echo "  - Backend server on http://localhost:5000"
echo "  - Frontend server on http://localhost:3000"
echo ""
echo "📚 See README.md for detailed setup instructions and API documentation"
