# Bangladesh Digital Voting Platform

A secure, web-based voting platform with device fingerprinting authentication and real-time map visualization of election results.

## 🚀 Your Deployment Configuration

**Repository**: https://github.com/dannyzia/voting-platform.git

**Database**: Neon PostgreSQL
- **Connection**: `postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- **Database**: `neondb`
- **User**: `neondb_owner`

**Cache**: Upstash Redis
- **URL**: `https://tolerant-honeybee-35002.upstash.io`
- **Token**: `AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI`

## 🚀 Quick Deployment

### Vercel + Render + Upstash + Neon Setup

**Frontend**: Vercel | **Backend**: Render | **Database**: Neon PostgreSQL | **Cache**: Upstash Redis

1. **Setup Database** (Neon):
   ```bash
   # Create database on neon.tech
   # Copy connection string
   # Run migrations:
   cd backend
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

2. **Setup Redis** (Upstash):
   ```bash
   # Create Redis database on upstash.com
   # Copy connection URL
   ```

3. **Deploy Backend** (Render):
   - Connect Git repository
   - Set build command: `cd backend && npm install && npm run build`
   - Set start command: `cd backend && npm start`
   - Add environment variables (see `.env.example`)

4. **Deploy Frontend** (Vercel):
   - Import Git repository
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Add environment variables (see `frontend/.env.example`)

For detailed deployment instructions, see [VERCEL_RENDER_DEPLOYMENT.md](./VERCEL_RENDER_DEPLOYMENT.md).

## 🚀 Quick Deployment

### Vercel + Render + Upstash + Neon Setup

**Frontend**: Vercel | **Backend**: Render | **Database**: Neon PostgreSQL | **Cache**: Upstash Redis

1. **Setup Database** (Neon):
   ```bash
   # Create database on neon.tech
   # Copy connection string
   # Run migrations:
   cd backend
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

2. **Setup Redis** (Upstash):
   ```bash
   # Create Redis database on upstash.com
   # Copy connection URL
   ```

3. **Deploy Backend** (Render):
   - Connect Git repository
   - Set build command: `cd backend && npm install && npm run build`
   - Set start command: `cd backend && npm start`
   - Add environment variables (see `.env.example`)

4. **Deploy Frontend** (Vercel):
   - Import Git repository
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Add environment variables (see `frontend/.env.example`)

For detailed deployment instructions, see [VERCEL_RENDER_DEPLOYMENT.md](./VERCEL_RENDER_DEPLOYMENT.md).

## 🌐 Production Deployment

### Cost-Effective Cloud Setup

| Service | Free Tier | Pro Tier | Use Case |
|---------|-----------|----------|----------|
| **Neon PostgreSQL** | 10,000 credits/month | $10/month | Database |
| **Upstash Redis** | 10MB, 10k req/day | $9/month | Caching & Sessions |
| **Render** | 750 hrs/month | $7/month | Backend hosting |
| **Vercel** | 100GB bandwidth | $20/site/month | Frontend hosting |

**Total Monthly Cost**: ~$36 for production setup

### Security Features
- ✅ HTTPS/SSL certificates (automatic)
- ✅ CORS protection with origin whitelisting
- ✅ Rate limiting with Redis
- ✅ JWT authentication
- ✅ Helmet security headers
- ✅ Database connection encryption

### Monitoring & Health Checks
- Health check endpoint: `/api/v1/health`
- Database connection monitoring
- Redis connection monitoring
- WebSocket status monitoring
- Response time tracking

### Performance Optimizations
- Database connection pooling with Neon
- Upstash Redis caching for sessions and rate limiting
- Rate limiting to prevent abuse
- Optimized Prisma queries
- Gzip compression enabled
- CDN for static assets (Vercel)


## 🌐 Production Deployment

### Cost-Effective Cloud Setup

| Service | Free Tier | Pro Tier | Use Case |
|---------|-----------|----------|----------|
| **Neon PostgreSQL** | 10,000 credits/month | $10/month | Database |
| **Upstash Redis** | 10MB, 10k req/day | $9/month | Caching & Sessions |
| **Render** | 750 hrs/month | $7/month | Backend hosting |
| **Vercel** | 100GB bandwidth | $20/site/month | Frontend hosting |

**Total Monthly Cost**: ~$36 for production setup

### Security Features
- ✅ HTTPS/SSL certificates (automatic)
- ✅ CORS protection with origin whitelisting
- ✅ Rate limiting with Redis
- ✅ JWT authentication
- ✅ Helmet security headers
- ✅ Database connection encryption

### Monitoring & Health Checks
- Health check endpoint: `/api/v1/health`
- Database connection monitoring
- Redis connection monitoring
- WebSocket status monitoring
- Response time tracking

### Performance Optimizations
- Database connection pooling
- Redis caching for sessions
- Rate limiting to prevent abuse
- Optimized Prisma queries
- Gzip compression enabled
- CDN for static assets (Vercel)

## Features

- **Anonymous Voting**: Device fingerprinting ensures one vote per device without storing personal data
- **Real-time Results**: Live map visualization with proportional color blending based on vote percentages
- **Admin Panel**: Create elections, upload candidates, and manage constituencies
- **GeoJSON Map**: Interactive Bangladesh constituency map with hover/click interactions
- **WebSocket Updates**: Real-time result updates without page refresh
- **Production Ready**: Deployed with Vercel + Render + Neon PostgreSQL + Upstash Redis

## Tech Stack

### Backend
- Node.js 18.x + Express.js + TypeScript
- Neon PostgreSQL 15 with Prisma ORM
- Upstash Redis for session management and caching
- WebSocket for real-time updates

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS for styling
- Leaflet for map visualization
- FingerprintJS for device identification

## Project Structure

```
Vote/
├── backend/                 # Express.js API server (Render)
│   ├── prisma/             # Database schema
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation
│   │   └── index.ts        # Server entry point
│   └── package.json
├── frontend/               # React SPA (Vercel)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── context/        # React context providers
│   │   ├── utils/          # API client, fingerprint
│   │   └── App.tsx
│   └── package.json
├── data/                   # Generated data
│   ├── constituencies.geojson
│   └── constituency_mapping.json
├── scripts/                # Utility scripts
│   └── generate_constituency_geojson.py
└── docker-compose.yml      # Local development services
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Python 3.10+ (for GeoJSON generation)

### 1. Production Environment Setup

Your production environment is already configured with:

**Neon PostgreSQL**:
- Connection string: `postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- Database: `neondb`
- SSL required for all connections

**Upstash Redis**:
- URL: `https://tolerant-honeybee-35002.upstash.io`
- Token: `AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI`
- REST API interface for serverless compatibility

**For Local Development:**
```bash
docker-compose up -d
```
This starts PostgreSQL and Redis containers for local testing.

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# For Production (Render):
# Set environment variables in Render dashboard:
# DATABASE_URL="postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
# REDIS_URL="https://tolerant-honeybee-35002.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI"
# JWT_SECRET=your-super-secret-jwt-key
# PORT=10000

# For Local Development:
cat > .env << EOF
DATABASE_URL="postgresql://postgres:password@localhost:5432/voting_db?schema=public"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
SESSION_DURATION_HOURS=1
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
EOF

# Generate Prisma client and push schema
npm run db:generate
npm run db:push

# Start development server
npm run dev
```

Backend runs on http://localhost:3001

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# For Production (Vercel):
# Set environment variables in Vercel dashboard:
# VITE_API_BASE_URL="https://your-backend.onrender.com"

# For Local Development:
# VITE_API_BASE_URL="http://localhost:3001"

# Start development server
npm run dev
```

Frontend runs on http://localhost:5173

### 4. Create Admin User

```bash
# For Production:
curl -X POST https://your-backend.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@vote.bd", "password": "admin123", "fullName": "Admin User"}'

# For Local Development:
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@vote.bd", "password": "admin123", "fullName": "Admin User"}'
```

## API Endpoints

### Public
- `GET /api/v1/elections/active` - List active elections
- `GET /api/v1/elections/:id` - Get election details
- `GET /api/v1/elections/:id/constituencies` - List constituencies
- `GET /api/v1/elections/:id/constituencies/:cid/candidates` - List candidates
- `POST /api/v1/verify-device` - Verify device fingerprint
- `POST /api/v1/vote/:electionId` - Cast vote
- `GET /api/v1/results/:electionId` - Get results
- `GET /api/v1/results/:electionId/map` - Get map GeoJSON with colors
- `GET /api/v1/health` - Health check endpoint

### Admin (requires auth)
- `POST /api/v1/auth/login` - Admin login
- `POST /api/v1/elections` - Create election
- `PATCH /api/v1/elections/:id/status` - Update election status
- `POST /api/v1/admin/elections/:id/upload-candidates` - Upload candidates JSON
- `POST /api/v1/admin/elections/:id/upload-map` - Upload map GeoJSON

## JSON File Formats

### Candidates JSON

```json
{
  "parties": [
    {
      "party_id": "AL",
      "party_name": "Awami League",
      "party_short": "AL",
      "party_color": "#00A651"
    }
  ],
  "constituencies": [
    {
      "constituency_code": "1",
      "constituency_name": "Panchagarh-1",
      "district": "Panchagarh",
      "candidates": [
        {
          "candidate_id": "C001",
          "name": "Candidate Name",
          "party_id": "AL",
          "party_name": "Awami League",
          "party_short": "AL",
          "party_color": "#00A651",
          "symbol": "Boat",
          "ballot_order": 1
        }
      ]
    }
  ]
}
```

## Development

### Generate Constituency GeoJSON

```bash
cd scripts
python3 -m venv .venv
source .venv/bin/activate
pip install shapely
python3 generate_constituency_geojson.py
```

### Database Migrations

```bash
cd backend
npm run db:migrate  # Create migration
npm run db:push     # Push schema changes
npm run db:studio   # Open Prisma Studio
```

### Health Check

Monitor your production deployment:
```bash
# Check backend health
curl https://your-backend.onrender.com/api/v1/health

# Check database connection
psql "postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" -c "SELECT 1;"

# Check Redis connection
curl -H "Authorization: Bearer AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI" "https://tolerant-honeybee-35002.upstash.io/ping"
```

## Production Deployment

Your production environment is configured with:

**Backend (Render)**:
- Build command: `cd backend && npm install && npm run build`
- Start command: `cd backend && npm start`
- Port: `10000`
- Environment variables configured for Neon + Upstash

**Frontend (Vercel)**:
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables configured for backend URL

**Database (Neon)**:
- Automatic backups enabled
- SSL required for all connections
- Connection pooling configured

**Cache (Upstash)**:
- Serverless Redis with REST API
- Automatic scaling based on usage
- Built-in rate limiting and caching

## License

MIT

## 🌟 Your Production Stack

- **Frontend**: Vercel (Global CDN, automatic HTTPS)
- **Backend**: Render (Node.js hosting with SSL)
- **Database**: Neon PostgreSQL (Serverless PostgreSQL with branching)
- **Cache**: Upstash Redis (Serverless Redis with REST API)
- **Monitoring**: Built-in health checks and logging
- **Security**: HTTPS everywhere, rate limiting, CORS protection
