#!/bin/bash

# Bangladesh Digital Voting Platform - Setup Script
# This script sets up the backend environment

set -e

echo "🚀 Setting up Bangladesh Digital Voting Platform Backend..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18.x or later."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if PostgreSQL is accessible
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Make sure PostgreSQL is installed and running."
fi

# Check if Redis is accessible
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis client not found. Make sure Redis is installed and running."
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📝 Setting up environment variables..."
if [ ! -f .env ]; then
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/voting_db?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=$(openssl rand -base64 32)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
EOF
    echo "✅ Created .env file with default values"
    echo "⚠️  Please update DATABASE_URL and REDIS_URL if needed"
else
    echo "ℹ️  .env file already exists, skipping..."
fi

echo ""
echo "🗄️  Setting up database..."
npm run db:push

echo ""
echo "🌱 Seeding database with admin user..."
npm run db:seed

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Update .env file with your database credentials"
echo "   2. Run 'npm run dev' to start the development server"
echo "   3. Apply database triggers: psql -d voting_db -f prisma/migrations/001_add_triggers.sql"
echo ""
echo "🔑 Default admin credentials:"
echo "   Email: admin@vote.bd"
echo "   Password: admin123456"
echo "   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!"
echo ""
