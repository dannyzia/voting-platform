# Setup Guide - Bangladesh Digital Voting Platform

Complete setup instructions for the voting platform.

## Prerequisites

- Node.js 18.x or later
- PostgreSQL 15.x or later
- Redis 7.x or later
- Docker & Docker Compose (optional but recommended)

## Quick Start (Automated)

```bash
# 1. Start services
docker-compose up -d

# 2. Setup backend
cd backend
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. Apply database triggers
psql -d voting_db -U postgres -f prisma/migrations/001_add_triggers.sql

# 4. Setup frontend
cd ../frontend
npm install

# 5. Start development servers
cd ../backend && npm run dev &
cd ../frontend && npm run dev
```

## Manual Setup

### 1. Start Services

```bash
docker-compose up -d
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://postgres:password@localhost:5432/voting_db?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=$(openssl rand -base64 32)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
EOF

# Setup database
npm run db:push

# Seed admin user
npm run db:seed

# Apply database triggers
psql -d voting_db -U postgres -f prisma/migrations/001_add_triggers.sql

# Start server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Access Points

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Admin Panel: http://localhost:5173/admin

## Default Credentials

```
Email: admin@vote.bd
Password: admin123456
```

**⚠️ CHANGE THIS PASSWORD IMMEDIATELY!**

## All Implemented Fixes

### ✅ 1. Database Triggers
- Auto-increment vote counts
- Auto-calculate percentages
- Auto-update constituency results

### ✅ 2. Composite Indexes
- `votes(election_id, constituency_id)`
- `votes(election_id, candidate_id)`
- `candidates(election_id, constituency_id)`

### ✅ 3. WebSocket Real-time Updates
- Broadcasts constituency updates after each vote
- Broadcasts total vote count
- Clients subscribe to specific elections

### ✅ 4. Extracted Map Components
- `ElectionMap.tsx` - Main map component
- `MapLegend.tsx` - Party standings
- `ConstituencyPopup.tsx` - Detailed results

### ✅ 5. Joi Validation
- Request body validation for all endpoints
- File upload validation (JSON/GeoJSON)
- Comprehensive error messages

### ✅ 6. Redis Integration
- Session storage
- Rate limiting (Redis-based)
- Caching support

### ✅ 7. Vote Receipt Verification
- `POST /api/v1/vote/verify-receipt`
- Returns vote details without revealing voter identity

### ✅ 8. Admin Seeding
- `npm run db:seed` creates default admin
- `scripts/setup.sh` for automated setup

## Troubleshooting

### Database Connection
```bash
docker ps | grep postgres
psql -d voting_db -U postgres -c "SELECT 1"
```

### Redis Connection
```bash
docker ps | grep redis
redis-cli ping
```

### Port Conflicts
```bash
lsof -i :3001
kill -9 <PID>
```
