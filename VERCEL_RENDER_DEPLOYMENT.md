# Deployment Guide: Vercel + Render + Upstash Redis + Neon PostgreSQL

This guide shows how to deploy the Bangladesh Digital Voting Platform using:
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Neon PostgreSQL
- **Cache**: Upstash Redis

## Your Configuration

**Repository**: https://github.com/dannyzia/voting-platform.git

**Database Connection**:
```bash
psql 'postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
```

**Redis Connection**:
```bash
UPSTASH_REDIS_REST_URL="https://tolerant-honeybee-35002.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI"
```

## Prerequisites

1. **Accounts Required:**
   - [Vercel Account](https://vercel.com/signup)
   - [Render Account](https://render.com/signup)
   - [Upstash Account](https://console.upstash.com/login)
   - [Neon Account](https://neon.tech/)

**Note**: Your Neon and Upstash accounts are already configured with the credentials above.

2. **Tools Required:**
   - Git
   - Node.js 18+
   - Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Setup Database - Neon PostgreSQL

### 1.1 Create Database on Neon
1. Your Neon database is already configured:
   - **Connection String**: `postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - **Database**: `neondb`
   - **User**: `neondb_owner`
   - **Host**: `ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech`
   - **SSL Mode**: `require`

### 1.2 Configure Database
1. Go to your Neon project dashboard
2. Copy the connection string from the **Connection Details** section
3. Format for environment variables:
   ```
   DATABASE_URL="postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&schema=public"
   ```

### 1.3 Run Database Migrations
```bash
# Install Prisma CLI globally
npm install -g prisma

# Set environment variable temporarily
export DATABASE_URL="your_neon_connection_string"

# Generate Prisma client
cd backend
npm run db:generate

# Push schema to Neon
npm run db:push

# Seed admin user
npm run db:seed
```

## Step 2: Setup Redis - Upstash

### 2.1 Create Redis Database
1. Your Upstash Redis is already configured:
   - **Redis URL**: `https://tolerant-honeybee-35002.upstash.io`
   - **Token**: `AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI`
   - **Database**: `tolerant-honeybee-35002`

### 2.2 Configure Redis
Format for environment variables:
```
REDIS_URL="https://tolerant-honeybee-35002.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI"
```

## Step 3: Configure Backend - Render

### 3.1 Create Backend Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New Web Service"
3. Connect your Git repository
4. Configure settings:
   - **Name**: `voting-platform-backend`
   - **Runtime**: Node.js
   - **Branch**: `main`
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`

### 3.2 Set Environment Variables on Render
Add these environment variables in Render dashboard:

```bash
# Database
DATABASE_URL="postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&schema=public"

# Redis
REDIS_URL="https://tolerant-honeybee-35002.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI"

# Application
PORT="10000"  # Render uses port 10000
NODE_ENV="production"
FRONTEND_URL="https://your-frontend.vercel.app"

# Security
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX="100"

# Session
SESSION_DURATION_HOURS="1"
```

### 3.3 Apply Database Triggers
After deployment, connect to your Neon database and run:
```sql
-- Create triggers for automatic calculations
CREATE OR REPLACE FUNCTION update_vote_results()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO vote_results (election_id, constituency_id, candidate_id, vote_count, last_updated)
  VALUES (NEW.election_id, NEW.constituency_id, NEW.candidate_id, 1, CURRENT_TIMESTAMP)
  ON CONFLICT (election_id, constituency_id, candidate_id)
  DO UPDATE SET
    vote_count = vote_results.vote_count + 1,
    last_updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_results
AFTER INSERT ON votes
FOR EACH ROW
EXECUTE FUNCTION update_vote_results();
```

## Step 4: Configure Frontend - Vercel

### 4.1 Deploy Frontend to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project" → "Import Git Repository"
3. Connect your repository
4. Configure settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `cd frontend && npm install`

### 4.2 Set Environment Variables on Vercel
Add these environment variables in Vercel dashboard:

```bash
# API Configuration
VITE_API_BASE_URL="https://your-backend.onrender.com"
VITE_FRONTEND_URL="https://your-frontend.vercel.app"

# Map Configuration (optional)
VITE_MAPBOX_TOKEN="your-mapbox-token"  # If using Mapbox instead of Leaflet
```

### 4.3 Update API URLs in Frontend
Update the frontend configuration to use the deployed backend URL:

```typescript
// frontend/src/utils/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-backend.onrender.com';
```

## Step 5: Update CORS Configuration

### 5.1 Update Backend CORS Settings
In `backend/src/index.ts`, update the CORS configuration:

```typescript
app.use(cors({
  origin: [
    'https://your-frontend.vercel.app',
    'https://your-frontend.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token']
}));
```

## Step 6: Database Connection Optimization

### 6.1 Update Prisma Configuration
Create `.env.production` in backend:

```bash
# Neon PostgreSQL
DATABASE_URL="postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&schema=public&connection_limit=10&pool_timeout=20"

# Upstash Redis
REDIS_URL="https://tolerant-honeybee-35002.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI"

# Application
PORT=10000
NODE_ENV=production
```

### 6.2 Optimize Database Pool
Update `backend/src/index.ts`:

```typescript
// Configure Prisma with connection pooling
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  connectionLimit: 10,
  acquireTimeoutMillis: 60000,
  timeout: 10000
});
```

## Step 7: Security Configuration

### 7.1 Update JWT Configuration
```bash
# Generate a secure JWT secret
openssl rand -base64 32
```

### 7.2 Configure Rate Limiting
Update rate limiting for production:

```typescript
// backend/src/middleware/rateLimiter.ts
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
};
```

## Step 8: Monitoring and Logging

### 8.1 Add Health Check Endpoint
Create `backend/src/routes/health.ts`:

```typescript
import express from 'express';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connection
    await redisClient.ping();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;
```

### 8.2 Add to main app
```typescript
// In backend/src/index.ts
app.use('/api/v1/health', healthRouter);
```

## Step 9: SSL and Security Headers

### 9.1 Enable HTTPS
Both Vercel and Render automatically provide HTTPS certificates.

### 9.2 Add Security Headers
```typescript
// backend/src/index.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://your-frontend.vercel.app"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Step 10: Testing the Deployment

### 10.1 Test API Endpoints
```bash
# Test health check
curl https://your-backend.onrender.com/api/v1/health

# Test CORS
curl -H "Origin: https://your-frontend.vercel.app" \
     https://your-backend.onrender.com/api/v1/elections
```

### 10.2 Test Frontend
1. Visit your Vercel frontend URL
2. Check browser console for any CORS or connection errors
3. Test device fingerprinting and voting flow

## Cost Estimates

### Neon PostgreSQL
- **Free Tier**: 10,000 credits/month (~3 databases)
- **Pro Tier**: $10/month for 100,000 credits

### Upstash Redis
- **Free Tier**: 10MB storage, 10,000 requests/day
- **Pro Tier**: $9/month for 500MB, 2M requests/day

### Render
- **Free Tier**: 750 hours/month, 512MB RAM
- **Starter Tier**: $7/month for 512MB RAM, unlimited hours

### Vercel
- **Free Tier**: 100GB bandwidth, 100GB storage
- **Pro Tier**: $20/site/month for 1TB bandwidth

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure frontend URL is in CORS origin list
2. **Database Connection**: Check Neon connection string format
3. **Redis Connection**: Verify Upstash Redis URL and token
4. **Environment Variables**: Double-check all env vars are set correctly

### Debug Commands

```bash
# Check Render logs
render logs --service voting-platform-backend

# Test database connection
psql 'postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' -c "SELECT 1;"

# Test Redis connection (using curl for Upstash REST API)
curl -H "Authorization: Bearer AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI" \
     "https://tolerant-honeybee-35002.upstash.io/ping"
```

## Production Checklist

- [ ] Database triggers applied
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] SSL certificates active
- [ ] Health check endpoint working
- [ ] Rate limiting configured
- [ ] Admin user created
- [ ] Backup strategy in place (Neon automated backups)
- [ ] Monitoring set up (Render dashboard)

## Next Steps

1. **Domain Setup**: Configure custom domains on Vercel and Render
2. **CDN**: Enable CDN for static assets on Vercel
3. **Monitoring**: Set up uptime monitoring with services like UptimeRobot
4. **Backups**: Configure automated database backups on Neon
5. **Scaling**: Monitor usage and scale resources as needed

Your voting platform is now ready for production deployment! 🚀
```

<tool_call>
<function=write_file>
<parameter=path>
/home/zia/Documents/My Projects/SynologyDrive/Websites/Vote/VERCEL_RENDER_DEPLOYMENT.md
</parameter>
<parameter=content>
# Deployment Guide: Vercel + Render + Upstash Redis + Neon PostgreSQL

This guide shows how to deploy the Bangladesh Digital Voting Platform using:
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Neon PostgreSQL
- **Cache**: Upstash Redis

## Prerequisites

1. **Accounts Required:**
   - [Vercel Account](https://vercel.com/signup)
   - [Render Account](https://render.com/signup)
   - [Upstash Account](https://console.upstash.com/login)
   - [Neon Account](https://neon.tech/)

2. **Tools Required:**
   - Git
   - Node.js 18+
   - Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Setup Database - Neon PostgreSQL

### 1.1 Create Database on Neon
1. Sign up at [neon.tech](https://neon.tech/)
2. Create a new project:
   - Name: `voting-platform`
   - Region: Choose closest to your users
   - Branch: `main` (default)
3. Note your connection string format:
   ```
   postgresql://[user]:[password]@[host]:[port]/[database]
   ```

### 1.2 Configure Database
1. Go to your Neon project dashboard
2. Copy the connection string from the **Connection Details** section
3. Format for environment variables:
   ```
   DATABASE_URL="postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&schema=public"
   ```

### 1.3 Run Database Migrations
```bash
# Install Prisma CLI globally
npm install -g prisma

# Set environment variable temporarily
export DATABASE_URL="your_neon_connection_string"

# Generate Prisma client
cd backend
npm run db:generate

# Push schema to Neon
npm run db:push

# Seed admin user
npm run db:seed
```

## Step 2: Setup Redis - Upstash

### 2.1 Create Redis Database
1. Sign up at [Upstash Console](https://console.upstash.com/)
2. Create a new database:
   - Name: `voting-platform-redis`
   - Region: Choose closest to your backend
3. Copy the connection details:
   - **Redis URL**: `rediss://...`
   - **Token**: Your API token

### 2.2 Configure Redis
Format for environment variables:
```
REDIS_URL="https://tolerant-honeybee-35002.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI"
```

## Step 3: Configure Backend - Render

### 3.1 Create Backend Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New Web Service"
3. Connect your Git repository
4. Configure settings:
   - **Name**: `voting-platform-backend`
   - **Runtime**: Node.js
   - **Branch**: `main`
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`

### 3.2 Set Environment Variables on Render
Add these environment variables in Render dashboard:

```bash
# Database
DATABASE_URL="postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&schema=public"

# Redis
REDIS_URL="https://tolerant-honeybee-35002.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI"

# Application
PORT="10000"  # Render uses port 10000
NODE_ENV="production"
FRONTEND_URL="https://your-frontend.vercel.app"

# Security
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX="100"

# Session
SESSION_DURATION_HOURS="1"
```

### 3.3 Apply Database Triggers
After deployment, connect to your Neon database and run:
```sql
-- Create triggers for automatic calculations
CREATE OR REPLACE FUNCTION update_vote_results()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO vote_results (election_id, constituency_id, candidate_id, vote_count, last_updated)
  VALUES (NEW.election_id, NEW.constituency_id, NEW.candidate_id, 1, CURRENT_TIMESTAMP)
  ON CONFLICT (election_id, constituency_id, candidate_id)
  DO UPDATE SET
    vote_count = vote_results.vote_count + 1,
    last_updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_results
AFTER INSERT ON votes
FOR EACH ROW
EXECUTE FUNCTION update_vote_results();
```

## Step 4: Configure Frontend - Vercel

### 4.1 Deploy Frontend to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project" → "Import Git Repository"
3. Connect your repository
4. Configure settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `cd frontend && npm install`

### 4.2 Set Environment Variables on Vercel
Add these environment variables in Vercel dashboard:

```bash
# API Configuration
VITE_API_BASE_URL="https://your-backend.onrender.com"
VITE_FRONTEND_URL="https://your-frontend.vercel.app"

# Map Configuration (optional)
VITE_MAPBOX_TOKEN="your-mapbox-token"  # If using Mapbox instead of Leaflet
```

### 4.3 Update API URLs in Frontend
Update the frontend configuration to use the deployed backend URL:

```typescript
// frontend/src/utils/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-backend.onrender.com';
```

## Step 5: Update CORS Configuration

### 5.1 Update Backend CORS Settings
In `backend/src/index.ts`, update the CORS configuration:

```typescript
app.use(cors({
  origin: [
    'https://your-frontend.vercel.app',
    'https://your-frontend.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token']
}));
```

## Step 6: Database Connection Optimization

### 6.1 Update Prisma Configuration
Create `.env.production` in backend:

```bash
# Neon PostgreSQL
DATABASE_URL="postgresql://neondb_owner:npg_QxjpUA6oby2d@ep-empty-boat-ahv3ib6x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&schema=public&connection_limit=10&pool_timeout=20"

# Upstash Redis
REDIS_URL="https://tolerant-honeybee-35002.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AYi6AAIncDI1YzYwMjZmZTQ2OWI0MGE5YTUzYzYxYTk2NmNmMWIxYXAyMzUwMDI"

# Application
PORT=10000
NODE_ENV=production
```

### 6.2 Optimize Database Pool
Update `backend/src/index.ts`:

```typescript
// Configure Prisma with connection pooling
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  connectionLimit: 10,
  acquireTimeoutMillis: 60000,
  timeout: 10000
});
```

## Step 7: Security Configuration

### 7.1 Update JWT Configuration
```bash
# Generate a secure JWT secret
openssl rand -base64 32
```

### 7.2 Configure Rate Limiting
Update rate limiting for production:

```typescript
// backend/src/middleware/rateLimiter.ts
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
};
```

## Step 8: Monitoring and Logging

### 8.1 Add Health Check Endpoint
Create `backend/src/routes/health.ts`:

```typescript
import express from 'express';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connection
    await redisClient.ping();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;
```

### 8.2 Add to main app
```typescript
// In backend/src/index.ts
app.use('/api/v1/health', healthRouter);
```

## Step 9: SSL and Security Headers

### 9.1 Enable HTTPS
Both Vercel and Render automatically provide HTTPS certificates.

### 9.2 Add Security Headers
```typescript
// backend/src/index.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://your-frontend.vercel.app"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Step 10: Testing the Deployment

### 10.1 Test API Endpoints
```bash
# Test health check
curl https://your-backend.onrender.com/api/v1/health

# Test CORS
curl -H "Origin: https://your-frontend.vercel.app" \
     https://your-backend.onrender.com/api/v1/elections
```

### 10.2 Test Frontend
1. Visit your Vercel frontend URL
2. Check browser console for any CORS or connection errors
3. Test device fingerprinting and voting flow

## Cost Estimates

### Neon PostgreSQL
- **Free Tier**: 10,000 credits/month (~3 databases)
- **Pro Tier**: $10/month for 100,000 credits

### Upstash Redis
- **Free Tier**: 10MB storage, 10,000 requests/day
- **Pro Tier**: $9/month for 500MB, 2M requests/day

### Render
- **Free Tier**: 750 hours/month, 512MB RAM
- **Starter Tier**: $7/month for 512MB RAM, unlimited hours

### Vercel
- **Free Tier**: 100GB bandwidth, 100GB storage
- **Pro Tier**: $20/site/month for 1TB bandwidth

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure frontend URL is in CORS origin list
2. **Database Connection**: Check Neon connection string format
3. **Redis Connection**: Verify Upstash Redis URL and token
4. **Environment Variables**: Double-check all env vars are set correctly

### Debug Commands

```bash
# Check Render logs
render logs --service voting-platform-backend

# Test database connection
psql "your_neon_connection_string" -c "SELECT 1;"

# Test Redis connection
redis-cli -u "your_upstash_redis_url" ping
```

## Production Checklist

- [ ] Database triggers applied
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] SSL certificates active
- [ ] Health check endpoint working
- [ ] Rate limiting configured
- [ ] Admin user created
- [ ] Backup strategy in place (Neon automated backups)
- [ ] Monitoring set up (Render dashboard)

## Next Steps

1. **Domain Setup**: Configure custom domains on Vercel and Render
2. **CDN**: Enable CDN for static assets on Vercel
3. **Monitoring**: Set up uptime monitoring with services like UptimeRobot
4. **Backups**: Configure automated database backups on Neon
5. **Scaling**: Monitor usage and scale resources as needed

Your voting platform is now ready for production deployment! 🚀
</parameter>
</function>
</tool_call>[@VERCEL_RENDER_DEPLOYMENT.md (804:809)](file:///home/zia/Documents/My%20Projects/SynologyDrive/Websites/Vote/VERCEL_RENDER_DEPLOYMENT.md#L804:809) 