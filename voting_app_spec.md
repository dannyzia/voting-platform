# Digital Voting Platform - Complete Technical Specification

## Document Version: 1.0
## Last Updated: 2026-01-10
## Target Audience: AI Coding Agents & Development Teams

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Database Schema](#3-database-schema)
4. [Authentication System](#4-authentication-system)
5. [JSON File Specifications](#5-json-file-specifications)
6. [Map Visualization](#6-map-visualization)
7. [API Endpoints](#7-api-endpoints)
8. [Frontend Components](#8-frontend-components)
9. [Business Logic](#9-business-logic)
10. [Security Requirements](#10-security-requirements)
11. [Testing Requirements](#11-testing-requirements)
12. [Deployment Checklist](#12-deployment-checklist)

---

## 1. PROJECT OVERVIEW

### 1.1 Purpose
Build a web-based voting platform where:
- Users vote using device fingerprinting (default, no login required)
- Admin manages elections, uploads candidates/constituencies/maps via JSON files
- Real-time map visualization shows results with proportional color blending
- Each device can vote only once per election

### 1.2 Core Features
1. **Voter Interface**: Anonymous voting with device tracking
2. **Admin Panel**: Election creation, file uploads, configuration
3. **Map Visualization**: Interactive map with proportional color blending
4. **Real-time Updates**: Live vote counting and map updates

### 1.3 Key Constraint
**CRITICAL**: Device fingerprinting is the DEFAULT and ONLY authentication method for MVP.
- No login required
- No National ID integration in Phase 1
- One vote per device per election
- Must work immediately without any external API setup

---

## 2. TECHNOLOGY STACK

### 2.1 Mandatory Technologies

#### Frontend
```
- Framework: React 18.x with TypeScript
- State Management: React Context API + useState/useReducer
- Styling: Tailwind CSS 3.x
- Map Library: Leaflet 1.9.x OR Mapbox GL JS 2.x
- HTTP Client: Axios 1.x
- Device Fingerprinting: @fingerprintjs/fingerprintjs-pro (or free version for MVP)
```

#### Backend
```
- Runtime: Node.js 18.x LTS
- Framework: Express.js 4.x
- Language: TypeScript 5.x
- Database: PostgreSQL 15.x
- ORM: Prisma 5.x OR TypeORM 0.3.x
- Cache: Redis 7.x (for sessions and rate limiting)
- File Storage: AWS S3 OR local filesystem with multer
```

#### DevOps
```
- Container: Docker & Docker Compose
- Reverse Proxy: Nginx
- Process Manager: PM2
- Environment: .env files (dotenv package)
```

### 2.2 Required NPM Packages

#### Frontend Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "@fingerprintjs/fingerprintjs": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "recharts": "^2.10.0",
    "date-fns": "^3.0.0",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/leaflet": "^1.9.8",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

#### Backend Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "prisma": "^5.7.0",
    "@prisma/client": "^5.7.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "joi": "^17.11.0",
    "redis": "^4.6.11",
    "ws": "^8.16.0",
    "crypto": "built-in"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2"
  }
}
```

---

## 3. DATABASE SCHEMA

### 3.1 Complete PostgreSQL Schema

**COPY THIS EXACTLY - DO NOT MODIFY FIELD NAMES OR TYPES**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users (Admin accounts only)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin', -- 'admin', 'super_admin'
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- TABLE: elections
-- ============================================
CREATE TABLE elections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Timing
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  
  -- Status: 'draft', 'active', 'paused', 'completed', 'cancelled'
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  
  -- Authentication config (JSONB)
  auth_config JSONB NOT NULL DEFAULT '{"method": "device_fingerprint", "settings": {"strictness": "high"}}',
  
  -- Map visualization config (JSONB)
  map_config JSONB DEFAULT '{"color_mode": "proportional", "show_live_results": true}',
  
  -- File references
  constituency_file_url TEXT,
  candidate_file_url TEXT,
  map_file_url TEXT,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_elections_dates ON elections(start_date, end_date);

-- ============================================
-- TABLE: parties
-- ============================================
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  
  -- Party identification
  party_code VARCHAR(50) NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  party_short VARCHAR(50) NOT NULL,
  
  -- Visual identity
  party_color VARCHAR(7) NOT NULL, -- Hex color code #RRGGBB
  party_logo_url TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(election_id, party_code)
);

CREATE INDEX idx_parties_election ON parties(election_id);

-- ============================================
-- TABLE: constituencies
-- ============================================
CREATE TABLE constituencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  
  -- Identification
  constituency_code VARCHAR(50) NOT NULL,
  constituency_name VARCHAR(255) NOT NULL,
  
  -- Geographic data
  district VARCHAR(100),
  division VARCHAR(100),
  
  -- GeoJSON properties (stored from uploaded file)
  geo_properties JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(election_id, constituency_code)
);

CREATE INDEX idx_constituencies_election ON constituencies(election_id);

-- ============================================
-- TABLE: candidates
-- ============================================
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  constituency_id UUID NOT NULL REFERENCES constituencies(id) ON DELETE CASCADE,
  party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
  
  -- Candidate identification
  candidate_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Party affiliation (denormalized for performance)
  party_name VARCHAR(255),
  party_short VARCHAR(50),
  party_color VARCHAR(7), -- Hex color code
  
  -- Visual identity
  symbol VARCHAR(100),
  candidate_logo_url TEXT,
  
  -- Ballot configuration
  ballot_order INTEGER NOT NULL DEFAULT 1,
  
  -- Additional info
  bio TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(election_id, constituency_id, candidate_code)
);

CREATE INDEX idx_candidates_election ON candidates(election_id);
CREATE INDEX idx_candidates_constituency ON candidates(constituency_id);
CREATE INDEX idx_candidates_party ON candidates(party_id);

-- ============================================
-- TABLE: device_fingerprints
-- ============================================
CREATE TABLE device_fingerprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Fingerprint data
  fingerprint_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash
  fingerprint_data JSONB NOT NULL, -- Full fingerprint details
  
  -- Tracking
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  vote_count INTEGER DEFAULT 0,
  
  -- Fraud detection
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  
  -- IP tracking (hashed for privacy)
  ip_hash VARCHAR(64)
);

CREATE INDEX idx_fingerprint_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX idx_fingerprint_flagged ON device_fingerprints(flagged);

-- ============================================
-- TABLE: voter_sessions
-- ============================================
CREATE TABLE voter_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  device_fingerprint_id UUID NOT NULL REFERENCES device_fingerprints(id),
  
  -- Voting status
  has_voted BOOLEAN DEFAULT FALSE,
  voted_at TIMESTAMP,
  
  -- Assigned constituency (if determinable)
  constituency_id UUID REFERENCES constituencies(id),
  
  -- Session tracking
  session_token VARCHAR(255) UNIQUE,
  session_expires_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(election_id, device_fingerprint_id)
);

CREATE INDEX idx_voter_sessions_election ON voter_sessions(election_id);
CREATE INDEX idx_voter_sessions_device ON voter_sessions(device_fingerprint_id);
CREATE INDEX idx_voter_sessions_token ON voter_sessions(session_token);

-- ============================================
-- TABLE: votes
-- ============================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  constituency_id UUID NOT NULL REFERENCES constituencies(id),
  candidate_id UUID NOT NULL REFERENCES candidates(id),
  
  -- Vote anonymization (NO link to device/session)
  vote_token VARCHAR(255) UNIQUE NOT NULL, -- One-time use token
  
  -- Timestamp
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- IP hash (for fraud detection, not voter identification)
  ip_hash VARCHAR(64)
);

CREATE INDEX idx_votes_election ON votes(election_id);
CREATE INDEX idx_votes_constituency ON votes(constituency_id);
CREATE INDEX idx_votes_candidate ON votes(candidate_id);
CREATE INDEX idx_votes_timestamp ON votes(voted_at);

-- ============================================
-- TABLE: vote_results (aggregated view)
-- ============================================
CREATE TABLE vote_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  constituency_id UUID NOT NULL REFERENCES constituencies(id),
  candidate_id UUID NOT NULL REFERENCES candidates(id),
  
  -- Vote counts
  vote_count INTEGER DEFAULT 0,
  vote_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Last updated
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(election_id, constituency_id, candidate_id)
);

CREATE INDEX idx_results_election ON vote_results(election_id);
CREATE INDEX idx_results_constituency ON vote_results(constituency_id);

-- ============================================
-- TABLE: constituency_results
-- ============================================
CREATE TABLE constituency_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  constituency_id UUID NOT NULL REFERENCES constituencies(id),
  
  -- PROPORTIONAL BLEND COLOR CALCULATION
  map_color VARCHAR(7) NOT NULL, -- Resulting blended hex color
  map_opacity DECIMAL(3,2) DEFAULT 0.80,
  
  -- Color breakdown (JSONB array of {party_color, percentage})
  color_breakdown JSONB,
  
  -- Winner information
  winning_candidate_id UUID REFERENCES candidates(id),
  winning_party_id UUID REFERENCES parties(id),
  winning_percentage DECIMAL(5,2),
  victory_margin DECIMAL(5,2),
  
  -- Totals
  total_votes_cast INTEGER DEFAULT 0,
  voter_turnout_percentage DECIMAL(5,2),
  
  -- Status
  result_declared BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(election_id, constituency_id)
);

CREATE INDEX idx_constituency_results_election ON constituency_results(election_id);

-- ============================================
-- TABLE: audit_logs
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Action tracking
  action VARCHAR(100) NOT NULL, -- 'election_created', 'vote_cast', 'file_uploaded', etc.
  entity_type VARCHAR(50), -- 'election', 'vote', 'candidate', etc.
  entity_id UUID,
  
  -- User tracking (if admin action)
  user_id UUID REFERENCES users(id),
  
  -- Device tracking (if voter action)
  device_fingerprint_hash VARCHAR(64),
  
  -- Details
  details JSONB,
  ip_address VARCHAR(45), -- IPv4 or IPv6
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_timestamp ON audit_logs(created_at);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

### 3.2 Database Indexes - Performance Optimization

**CRITICAL**: These indexes MUST be created for performance:

```sql
-- Additional composite indexes for common queries
CREATE INDEX idx_votes_election_constituency ON votes(election_id, constituency_id);
CREATE INDEX idx_votes_election_candidate ON votes(election_id, candidate_id);
CREATE INDEX idx_candidates_election_constituency ON candidates(election_id, constituency_id);
```

### 3.3 Database Triggers

**Auto-update vote_results when vote is cast:**

```sql
-- Function to update vote results
CREATE OR REPLACE FUNCTION update_vote_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment vote count
  INSERT INTO vote_results (election_id, constituency_id, candidate_id, vote_count, last_updated)
  VALUES (NEW.election_id, NEW.constituency_id, NEW.candidate_id, 1, CURRENT_TIMESTAMP)
  ON CONFLICT (election_id, constituency_id, candidate_id)
  DO UPDATE SET
    vote_count = vote_results.vote_count + 1,
    last_updated = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on votes table
CREATE TRIGGER trigger_update_vote_results
AFTER INSERT ON votes
FOR EACH ROW
EXECUTE FUNCTION update_vote_results();
```

**Auto-calculate vote percentages:**

```sql
-- Function to calculate percentages
CREATE OR REPLACE FUNCTION calculate_vote_percentages()
RETURNS TRIGGER AS $$
DECLARE
  total_votes INTEGER;
BEGIN
  -- Get total votes for this constituency
  SELECT SUM(vote_count) INTO total_votes
  FROM vote_results
  WHERE election_id = NEW.election_id
    AND constituency_id = NEW.constituency_id;
  
  -- Update all percentages for this constituency
  UPDATE vote_results
  SET vote_percentage = CASE
    WHEN total_votes > 0 THEN (vote_count::DECIMAL / total_votes * 100)
    ELSE 0
  END
  WHERE election_id = NEW.election_id
    AND constituency_id = NEW.constituency_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on vote_results table
CREATE TRIGGER trigger_calculate_percentages
AFTER INSERT OR UPDATE ON vote_results
FOR EACH ROW
EXECUTE FUNCTION calculate_vote_percentages();
```

---

## 4. AUTHENTICATION SYSTEM

### 4.1 Device Fingerprinting Implementation

**CRITICAL REQUIREMENTS:**
1. Use FingerprintJS library (free version acceptable for MVP)
2. Generate fingerprint on client-side
3. Send to server for verification
4. Server creates SHA-256 hash
5. Check if hash exists in database
6. If exists and has voted → reject
7. If exists and not voted → allow
8. If new → create record and allow

### 4.2 Client-Side Fingerprint Generation

**File: `src/utils/fingerprint.ts`**

```typescript
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export interface DeviceFingerprint {
  visitorId: string;
  components: any;
  confidence: {
    score: number;
  };
}

/**
 * CRITICAL: Generate device fingerprint
 * This function MUST be called before allowing user to vote
 * Returns a unique fingerprint object
 */
export async function generateFingerprint(): Promise<DeviceFingerprint> {
  try {
    // Initialize FingerprintJS
    const fp = await FingerprintJS.load();
    
    // Get fingerprint
    const result = await fp.get();
    
    return {
      visitorId: result.visitorId,
      components: result.components,
      confidence: result.confidence
    };
  } catch (error) {
    console.error('Fingerprint generation failed:', error);
    throw new Error('Unable to generate device fingerprint');
  }
}

/**
 * Generate a deterministic hash from fingerprint data
 * This creates a consistent identifier across page refreshes
 */
export function createFingerprintHash(fingerprint: DeviceFingerprint): string {
  // Use visitorId as the primary identifier
  // In production, you might want to include additional components
  return fingerprint.visitorId;
}
```

### 4.3 Server-Side Fingerprint Verification

**File: `src/backend/services/fingerprintService.ts`**

```typescript
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FingerprintData {
  visitorId: string;
  components: any;
  confidence: {
    score: number;
  };
}

/**
 * CRITICAL: Hash fingerprint data with SHA-256
 * Input: Client-provided fingerprint
 * Output: 64-character hex string
 */
export function hashFingerprint(fingerprintData: FingerprintData): string {
  const dataString = JSON.stringify({
    visitorId: fingerprintData.visitorId,
    // Include key components for more uniqueness
    userAgent: fingerprintData.components?.userAgent?.value || '',
    screenResolution: fingerprintData.components?.screenResolution?.value || ''
  });
  
  return crypto
    .createHash('sha256')
    .update(dataString)
    .digest('hex');
}

/**
 * CRITICAL: Verify if device can vote
 * Returns: { canVote: boolean, reason?: string, deviceId?: string }
 */
export async function verifyDeviceCanVote(
  fingerprintData: FingerprintData,
  electionId: string,
  ipAddress: string
): Promise<{ canVote: boolean; reason?: string; deviceId?: string; sessionToken?: string }> {
  
  // Step 1: Hash the fingerprint
  const fingerprintHash = hashFingerprint(fingerprintData);
  const ipHash = crypto.createHash('sha256').update(ipAddress).digest('hex');
  
  // Step 2: Find or create device fingerprint record
  let deviceRecord = await prisma.device_fingerprints.findUnique({
    where: { fingerprint_hash: fingerprintHash }
  });
  
  if (!deviceRecord) {
    // New device - create record
    deviceRecord = await prisma.device_fingerprints.create({
      data: {
        fingerprint_hash: fingerprintHash,
        fingerprint_data: fingerprintData as any,
        first_seen: new Date(),
        last_seen: new Date(),
        vote_count: 0,
        ip_hash: ipHash
      }
    });
  } else {
    // Update last seen
    await prisma.device_fingerprints.update({
      where: { id: deviceRecord.id },
      data: { last_seen: new Date() }
    });
  }
  
  // Step 3: Check if device has already voted in this election
  const existingSession = await prisma.voter_sessions.findUnique({
    where: {
      election_id_device_fingerprint_id: {
        election_id: electionId,
        device_fingerprint_id: deviceRecord.id
      }
    }
  });
  
  if (existingSession && existingSession.has_voted) {
    return {
      canVote: false,
      reason: 'This device has already voted in this election'
    };
  }
  
  // Step 4: Check if device is flagged
  if (deviceRecord.flagged) {
    return {
      canVote: false,
      reason: 'This device has been flagged for suspicious activity'
    };
  }
  
  // Step 5: Create or update session
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour
  
  if (existingSession) {
    await prisma.voter_sessions.update({
      where: { id: existingSession.id },
      data: {
        session_token: sessionToken,
        session_expires_at: expiresAt
      }
    });
  } else {
    await prisma.voter_sessions.create({
      data: {
        election_id: electionId,
        device_fingerprint_id: deviceRecord.id,
        has_voted: false,
        session_token: sessionToken,
        session_expires_at: expiresAt
      }
    });
  }
  
  return {
    canVote: true,
    deviceId: deviceRecord.id,
    sessionToken
  };
}

/**
 * CRITICAL: Mark device as voted
 * This MUST be called after vote is successfully cast
 */
export async function markDeviceAsVoted(
  sessionToken: string,
  electionId: string
): Promise<void> {
  
  const session = await prisma.voter_sessions.findUnique({
    where: { session_token: sessionToken }
  });
  
  if (!session) {
    throw new Error('Invalid session token');
  }
  
  if (session.election_id !== electionId) {
    throw new Error('Session election mismatch');
  }
  
  if (session.has_voted) {
    throw new Error('Session already used to vote');
  }
  
  // Check if session expired
  if (session.session_expires_at && session.session_expires_at < new Date()) {
    throw new Error('Session expired');
  }
  
  // Mark as voted
  await prisma.voter_sessions.update({
    where: { id: session.id },
    data: {
      has_voted: true,
      voted_at: new Date()
    }
  });
  
  // Increment device vote count
  await prisma.device_fingerprints.update({
    where: { id: session.device_fingerprint_id },
    data: {
      vote_count: {
        increment: 1
      }
    }
  });
}
```

### 4.4 Voter Flow with Fingerprinting

**EXACT SEQUENCE - DO NOT DEVIATE:**

```
1. User lands on voting page for election X
2. Frontend calls generateFingerprint()
3. Frontend sends fingerprint + electionId to POST /api/verify-device
4. Backend calls verifyDeviceCanVote()
5a. If canVote = false → Show error message, stop
5b. If canVote = true → Store sessionToken in state, continue
6. User selects constituency (or auto-detect if possible)
7. User sees ballot with candidates
8. User selects candidate
9. User clicks "Submit Vote"
10. Frontend sends: { sessionToken, candidateId, constituencyId }
11. Backend validates:
    - Session exists and not expired
    - Session hasn't voted yet
    - Candidate belongs to constituency
12. Backend creates vote record (anonymized)
13. Backend calls markDeviceAsVoted()
14. Backend returns success
15. Frontend shows confirmation
16. Frontend clears sessionToken
```

---

## 5. JSON FILE SPECIFICATIONS

### 5.1 Candidate Upload JSON

**File name convention:** `candidates_[ELECTION_CODE]_[TIMESTAMP].json`

**EXACT SCHEMA - DO NOT ADD OR REMOVE FIELDS:**

```json
{
  "election_id": "string (UUID or code)",
  "election_name": "string",
  "upload_timestamp": "ISO 8601 datetime string",
  
  "parties": [
    {
      "party_id": "string (unique identifier)",
      "party_name": "string (full name)",
      "party_short": "string (abbreviation, max 10 chars)",
      "party_color": "string (hex color code, must start with #, e.g., #FF5733)",
      "party_logo_url": "string (URL) or null",
      "party_logo_base64": "string (data:image/png;base64,...) or null"
    }
  ],
  
  "constituencies": [
    {
      "constituency_id": "string (unique identifier)",
      "constituency_name": "string (official name)",
      "constituency_code": "string (short code, e.g., DHA-1)",
      "district": "string (optional)",
      "division": "string (optional)",
      
      "candidates": [
        {
          "candidate_id": "string (unique identifier)",
          "name": "string (full name)",
          "party_id": "string (must match a party_id from parties array)",
          "party_name": "string (denormalized for performance)",
          "party_short": "string (denormalized)",
          "party_color": "string (hex color, denormalized)",
          "symbol": "string (electoral symbol)",
          "candidate_logo_url": "string (URL) or null",
          "candidate_logo_base64": "string (data:image/...) or null",
          "ballot_order": "integer (display order on ballot, starting from 1)",
          "bio": "string (optional, max 500 chars)"
        }
      ]
    }
  ]
}
```

**VALIDATION RULES - MUST ALL PASS:**

1. **party_color format:**
   - MUST start with `#`
   - MUST be exactly 7 characters (`#RRGGBB`)
   - Characters after `#` must be valid hex (0-9, A-F, a-f)
   - Example valid: `#FF5733`, `#3498DB`, `#27AE60`
   - Example invalid: `FF5733`, `#F73`, `rgb(255,87,51)`

2. **party_id uniqueness:**
   - All `party_id` values in `parties` array MUST be unique
   - `candidate.party_id` MUST reference an existing `party_id`

3. **candidate_id uniqueness:**
   - All `candidate_id` values across ALL constituencies MUST be globally unique

4. **constituency_code uniqueness:**
   - All `constituency_code` values MUST be unique

5. **Logo validation:**
   - If `party_logo_base64` is provided, must start with `data:image/`
   - If `party_logo_url` is provided, must start with `http://` or `https://`
   - At least one of `party_logo_base64` or `party_logo_url` should be provided (but can both be null)
   - Same rules apply for candidate logos

6. **ballot_order:**
   - Must be positive integer
   - Within a constituency, each candidate must have unique ballot_order
   - Should be sequential (1, 2, 3, ...) but gaps are allowed

**EXAMPLE COMPLETE FILE:**

```json
{
  "election_id": "ELECT-2026-GE",
  "election_name": "General Election 2026",
  "upload_timestamp": "2026-01-10T10:00:00Z",
  
  "parties": [
    {
      "party_id": "PP-001",
      "party_name": "People's Party",
      "party_short": "PP",
      "party_color": "#E74C3C",
      "party_logo_url": "https://cdn.example.com/parties/pp-logo.png",
      "party_logo_base64": null
    },
    {
      "party_id": "DA-001",
      "party_name": "Democratic Alliance",
      "party_short": "DA",
      "party_color": "#3498DB",
      "party_logo_url": null,
      "party_logo_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    },
    {
      "party_id": "GM-001",
      "party_name": "Green Movement",
      "party_short": "GM",
      "party_color": "#27AE60",
      "party_logo_url": "https://cdn.example.com/parties/gm-logo.png",
      "party_logo_base64": null
    },
    {
      "party_id": "IND",
      "party_name": "Independent",
      "party_short": "IND",
      "party_color": "#95A5A6",
      "party_logo_url": null,
      "party_logo_base64": null
    }
  ],
  
  "constituencies": [
    {
      "constituency_id": "CONST-DHA-1",
      "constituency_name": "Dhaka-1",
      "constituency_code": "DHA-1",
      "district": "Dhaka",
      "division": "Dhaka",
      "candidates": [
        {
          "candidate_id": "CAND-001",
          "name": "Ahmed Hassan",
          "party_id": "PP-001",
          "party_name": "People's Party",
          "party_short": "PP",
          "party_color": "#E74C3C",
          "symbol": "Boat",
          "candidate_logo_url": "https://cdn.example.com/candidates/ahmed-hassan.jpg",
          "candidate_logo_base64": null,
          "ballot_order": 1,
          "bio": "Experienced legislator with 15 years in public service"
        },
        {
          "candidate_id": "CAND-002",
          "name": "Fatima Rahman",
          "party_id": "DA-001",
          "party_name": "Democratic Alliance",
          "party_short": "DA",
          "party_color": "#3498DB",
          "symbol": "Rising Sun",
          "candidate_logo_url": null,
          "candidate_logo_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
          "ballot_order": 2,
          "bio": "Youth leader and education advocate"
        },
        {
          "candidate_id": "CAND-003",
          "name": "Karim Uddin",
          "party_id": "GM-001",
          "party_name": "Green Movement",
          "party_short": "GM",
          "party_color": "#27AE60",
          "symbol": "Tree",
          "candidate_logo_url": "https://cdn.example.com/candidates/karim-uddin.jpg",
          "candidate_logo_base64": null,
          "ballot_order": 3,
          "bio": "Environmental activist and entrepreneur"
        },
        {
          "candidate_id": "CAND-004",
          "name": "Nadia Islam",
          "party_id": "IND",
          "party_name": "Independent",
          "party_short": "IND",
          "party_color": "#95A5A6",
          "symbol": "Hand",
          "candidate_logo_url": null,
          "candidate_logo_base64": null,
          "ballot_order": 4,
          "bio": null
        }
      ]
    },
    {
      "constituency_id": "CONST-DHA-2",
      "constituency_name": "Dhaka-2",
      "constituency_code": "DHA-2",
      "district": "Dhaka",
      "division": "Dhaka",
      "candidates": [
        {
          "candidate_id": "CAND-005",
          "name": "Rahim Khan",
          "party_id": "DA-001",
          "party_name": "Democratic Alliance",
          "party_short": "DA",
          "party_color": "#3498DB",
          "symbol": "Rising Sun",
          "candidate_logo_url": "https://cdn.example.com/candidates/rahim-khan.jpg",
          "candidate_logo_base64": null,
          "ballot_order": 1,
          "bio": "Former city councilor"
        },
        {
          "candidate_id": "CAND-006",
          "name": "Jasmin Akter",
          "party_id": "PP-001",
          "party_name": "People's Party",
          "party_short": "PP",
          "party_color": "#E74C3C",
          "symbol": "Boat",
          "candidate_logo_url": null,
          "candidate_logo_base64": null,
          "ballot_order": 2,
          "bio": "Healthcare professional and community leader"
        }
      ]
    }
  ]
}
```

### 5.2 Constituency Upload JSON (Optional Standalone)

**If constituencies are uploaded separately from candidates:**

```json
{
  "election_id": "string",
  "upload_timestamp": "ISO 8601 datetime",
  
  "constituencies": [
    {
      "constituency_id": "string (unique)",
      "constituency_name": "string",
      "constituency_code": "string (unique)",
      "district": "string (optional)",
      "division": "string (optional)",
      "eligible_voters": "integer (optional)",
      "polling_centers": "integer (optional)"
    }
  ]
}
```

### 5.3 Map Data Upload (GeoJSON)

**File name convention:** `map_[ELECTION_CODE]_[TIMESTAMP].geojson`

**EXACT FORMAT - GeoJSON FeatureCollection:**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "constituency_code": "DHA-1",
        "constituency_name": "Dhaka-1",
        "district": "Dhaka",
        "division": "Dhaka"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [90.3563, 23.8103],
            [90.3600, 23.8150],
            [90.3650, 23.8120],
            [90.3620, 23.8070],
            [90.3563, 23.8103]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "constituency_code": "DHA-2",
        "constituency_name": "Dhaka-2",
        "district": "Dhaka",
        "division": "Dhaka"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [90.3650, 23.8120],
            [90.3700, 23.8170],
            [90.3750, 23.8140],
            [90.3720, 23.8090],
            [90.3650, 23.8120]
          ]
        ]
      }
    }
  ]
}
```

**CRITICAL REQUIREMENTS:**

1. **Must be valid GeoJSON** - validate at https://geojson.io before upload
2. **properties.constituency_code** MUST match `constituency_code` from candidate JSON
3. **geometry.type** can be `Polygon` or `MultiPolygon`
4. **coordinates** must be `[longitude, latitude]` format (NOT latitude, longitude)
5. Coordinates should be in WGS84 (EPSG:4326) projection

---

## 6. MAP VISUALIZATION

### 6.1 Proportional Blend Algorithm

**CRITICAL: This is the EXACT algorithm to implement**

**Step 1: Get vote data for constituency**
```typescript
interface CandidateVote {
  candidateId: string;
  candidateName: string;
  partyShort: string;
  partyColor: string; // Hex color like "#E74C3C"
  voteCount: number;
  votePercentage: number;
}

// Example data
const constituencyVotes: CandidateVote[] = [
  { candidateId: "CAND-001", candidateName: "Ahmed Hassan", partyShort: "PP", partyColor: "#E74C3C", voteCount: 4500, votePercentage: 45.0 },
  { candidateId: "CAND-002", candidateName: "Fatima Rahman", partyShort: "DA", partyColor: "#3498DB", voteCount: 3500, votePercentage: 35.0 },
  { candidateId: "CAND-003", candidateName: "Karim Uddin", partyShort: "GM", partyColor: "#27AE60", voteCount: 1500, votePercentage: 15.0 },
  { candidateId: "CAND-004", candidateName: "Nadia Islam", partyShort: "IND", partyColor: "#95A5A6", voteCount: 500, votePercentage: 5.0 }
];
```

**Step 2: Convert hex colors to RGB**
```typescript
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse hex to integers
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return { r, g, b };
}

// Example:
// hexToRgb("#E74C3C") → { r: 231, g: 76, b: 60 }
```

**Step 3: Calculate weighted average of RGB values**
```typescript
function calculateProportionalColor(votes: CandidateVote[]): string {
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  
  // For each candidate, add their color contribution
  votes.forEach(vote => {
    const rgb = hexToRgb(vote.partyColor);
    const weight = vote.votePercentage / 100; // Convert percentage to decimal
    
    totalR += rgb.r * weight;
    totalG += rgb.g * weight;
    totalB += rgb.b * weight;
  });
  
  // Round to nearest integer
  const finalR = Math.round(totalR);
  const finalG = Math.round(totalG);
  const finalB = Math.round(totalB);
  
  // Convert back to hex
  return rgbToHex(finalR, finalG, finalB);
}
```

**Step 4: Convert RGB back to hex**
```typescript
function rgbToHex(r: number, g: number, b: number): string {
  // Ensure values are in valid range 0-255
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  
  // Convert to hex and pad with zeros if needed
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// Example:
// rgbToHex(231, 76, 60) → "#E74C3C"
```

**Step 5: Complete calculation example**
```typescript
// Input votes:
// PP (#E74C3C - RGB 231,76,60): 45%
// DA (#3498DB - RGB 52,152,219): 35%
// GM (#27AE60 - RGB 39,174,96): 15%
// IND (#95A5A6 - RGB 149,165,166): 5%

// Calculation:
// R = (231 × 0.45) + (52 × 0.35) + (39 × 0.15) + (149 × 0.05)
//   = 103.95 + 18.2 + 5.85 + 7.45
//   = 135.45 → 135

// G = (76 × 0.45) + (152 × 0.35) + (174 × 0.15) + (165 × 0.05)
//   = 34.2 + 53.2 + 26.1 + 8.25
//   = 121.75 → 122

// B = (60 × 0.45) + (219 × 0.35) + (96 × 0.15) + (166 × 0.05)
//   = 27 + 76.65 + 14.4 + 8.3
//   = 126.35 → 126

// Final color: #877A7E (a reddish-brown blend)
```

### 6.2 Map Rendering Service

**File: `src/backend/services/mapColorService.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * CRITICAL: Calculate proportional blend color for a constituency
 * This function is called every time vote results are updated
 */
export async function calculateConstituencyColor(
  electionId: string,
  constituencyId: string
): Promise<{ color: string; breakdown: any[] }> {
  
  // Get all vote results for this constituency
  const voteResults = await prisma.vote_results.findMany({
    where: {
      election_id: electionId,
      constituency_id: constituencyId
    },
    include: {
      candidates: {
        select: {
          name: true,
          party_short: true,
          party_color: true
        }
      }
    }
  });
  
  if (voteResults.length === 0) {
    // No votes yet, return default color
    return {
      color: '#E0E0E0',
      breakdown: []
    };
  }
  
  // Calculate total votes
  const totalVotes = voteResults.reduce((sum, result) => sum + result.vote_count, 0);
  
  if (totalVotes === 0) {
    return {
      color: '#E0E0E0',
      breakdown: []
    };
  }
  
  // Calculate weighted RGB values
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  
  const breakdown = voteResults.map(result => {
    const percentage = (result.vote_count / totalVotes) * 100;
    const weight = percentage / 100;
    
    const rgb = hexToRgb(result.candidates.party_color);
    
    totalR += rgb.r * weight;
    totalG += rgb.g * weight;
    totalB += rgb.b * weight;
    
    return {
      candidateName: result.candidates.name,
      partyShort: result.candidates.party_short,
      partyColor: result.candidates.party_color,
      voteCount: result.vote_count,
      percentage: percentage.toFixed(2)
    };
  });
  
  // Round and convert back to hex
  const finalColor = rgbToHex(
    Math.round(totalR),
    Math.round(totalG),
    Math.round(totalB)
  );
  
  return {
    color: finalColor,
    breakdown
  };
}

/**
 * Update constituency results with new color
 */
export async function updateConstituencyMapColor(
  electionId: string,
  constituencyId: string
): Promise<void> {
  
  const { color, breakdown } = await calculateConstituencyColor(electionId, constituencyId);
  
  // Find winner
  const voteResults = await prisma.vote_results.findMany({
    where: {
      election_id: electionId,
      constituency_id: constituencyId
    },
    orderBy: {
      vote_count: 'desc'
    },
    take: 2,
    include: {
      candidates: {
        select: {
          id: true,
          name: true,
          party_id: true
        }
      }
    }
  });
  
  if (voteResults.length === 0) {
    return;
  }
  
  const winner = voteResults[0];
  const runnerUp = voteResults[1];
  
  const totalVotes = await prisma.vote_results.aggregate({
    where: {
      election_id: electionId,
      constituency_id: constituencyId
    },
    _sum: {
      vote_count: true
    }
  });
  
  const totalCount = totalVotes._sum.vote_count || 0;
  const winnerPercentage = totalCount > 0 ? (winner.vote_count / totalCount) * 100 : 0;
  const victoryMargin = runnerUp ? ((winner.vote_count - runnerUp.vote_count) / totalCount) * 100 : winnerPercentage;
  
  // Update or create constituency_results
  await prisma.constituency_results.upsert({
    where: {
      election_id_constituency_id: {
        election_id: electionId,
        constituency_id: constituencyId
      }
    },
    update: {
      map_color: color,
      map_opacity: 0.80,
      color_breakdown: breakdown,
      winning_candidate_id: winner.candidates.id,
      winning_party_id: winner.candidates.party_id,
      winning_percentage: parseFloat(winnerPercentage.toFixed(2)),
      victory_margin: parseFloat(victoryMargin.toFixed(2)),
      total_votes_cast: totalCount,
      last_updated: new Date()
    },
    create: {
      election_id: electionId,
      constituency_id: constituencyId,
      map_color: color,
      map_opacity: 0.80,
      color_breakdown: breakdown,
      winning_candidate_id: winner.candidates.id,
      winning_party_id: winner.candidates.party_id,
      winning_percentage: parseFloat(winnerPercentage.toFixed(2)),
      victory_margin: parseFloat(victoryMargin.toFixed(2)),
      total_votes_cast: totalCount
    }
  });
}

// Helper functions
function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16)
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return '#' + toHex(r) + toHex(g) + toHex(b);
}
```

### 6.3 Real-Time Map Updates

**Trigger color recalculation after every vote:**

```typescript
// In vote casting endpoint
app.post('/api/elections/:electionId/vote', async (req, res) => {
  // ... vote validation and creation ...
  
  // After vote is successfully created:
  await updateConstituencyMapColor(electionId, constituencyId);
  
  // Broadcast update via WebSocket
  broadcastMapUpdate(electionId, constituencyId);
  
  res.json({ success: true });
});
```

---

## 7. API ENDPOINTS

### 7.1 Complete API Specification

**Base URL:** `/api/v1`

#### 7.1.1 Authentication & Session APIs

**POST /api/v1/verify-device**
```
Request Body:
{
  "fingerprintData": {
    "visitorId": "string",
    "components": { ... },
    "confidence": { "score": number }
  },
  "electionId": "string (UUID)"
}

Response (200 OK):
{
  "canVote": true,
  "sessionToken": "string",
  "expiresAt": "ISO datetime"
}

Response (403 Forbidden):
{
  "canVote": false,
  "reason": "This device has already voted in this election"
}
```

#### 7.1.2 Election APIs

**GET /api/v1/elections**
```
Query params:
  ?status=active|draft|completed
  ?page=1&limit=10

Response:
{
  "elections": [
    {
      "id": "UUID",
      "name": "string",
      "status": "active",
      "startDate": "ISO datetime",
      "endDate": "ISO datetime",
      "totalConstituencies": number,
      "totalCandidates": number
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

**GET /api/v1/elections/:electionId**
```
Response:
{
  "id": "UUID",
  "name": "string",
  "description": "string",
  "startDate": "ISO datetime",
  "endDate": "ISO datetime",
  "status": "active",
  "authConfig": {
    "method": "device_fingerprint",
    "settings": { ... }
  },
  "stats": {
    "totalConstituencies": number,
    "totalCandidates": number,
    "totalVotesCast": number,
    "voterTurnout": number
  }
}
```

**POST /api/v1/elections** (Admin only)
```
Request Headers:
  Authorization: Bearer <admin_jwt_token>

Request Body:
{
  "name": "string (required)",
  "description": "string (optional)",
  "startDate": "ISO datetime (required)",
  "endDate": "ISO datetime (required)",
  "authConfig": {
    "method": "device_fingerprint",
    "settings": {
      "strictness": "high"
    }
  }
}

Response (201 Created):
{
  "id": "UUID",
  "name": "string",
  ...
}
```

#### 7.1.3 Candidate & Constituency APIs

**GET /api/v1/elections/:electionId/constituencies**
```
Response:
{
  "constituencies": [
    {
      "id": "UUID",
      "code": "DHA-1",
      "name": "Dhaka-1",
      "district": "Dhaka",
      "candidateCount": 4
    }
  ]
}
```

**GET /api/v1/elections/:electionId/constituencies/:constituencyId/candidates**
```
Response:
{
  "constituency": {
    "id": "UUID",
    "code": "DHA-1",
    "name": "Dhaka-1"
  },
  "candidates": [
    {
      "id": "UUID",
      "name": "Ahmed Hassan",
      "partyName": "People's Party",
      "partyShort": "PP",
      "partyColor": "#E74C3C",
      "symbol": "Boat",
      "logoUrl": "https://...",
      "ballotOrder": 1,
      "bio": "string"
    }
  ]
}
```

#### 7.1.4 Voting APIs

**POST /api/v1/elections/:electionId/vote**
```
Request Headers:
  X-Session-Token: <session_token>

Request Body:
{
  "constituencyId": "UUID (required)",
  "candidateId": "UUID (required)"
}

Response (200 OK):
{
  "success": true,
  "message": "Vote successfully recorded",
  "receiptToken": "string (one-time verification token)"
}

Response (400 Bad Request):
{
  "success": false,
  "error": "Invalid candidate for this constituency"
}

Response (403 Forbidden):
{
  "success": false,
  "error": "Session already used to vote"
}
```

#### 7.1.5 Results & Map APIs

**GET /api/v1/elections/:electionId/results**
```
Response:
{
  "electionId": "UUID",
  "lastUpdated": "ISO datetime",
  "totalConstituencies": number,
  "resultsDeclared": number,
  "inProgress": number,
  
  "constituencies": [
    {
      "constituencyId": "UUID",
      "constituencyCode": "DHA-1",
      "constituencyName": "Dhaka-1",
      "mapColor": "#877A7E",
      "mapOpacity": 0.80,
      "colorBreakdown": [
        {
          "candidateName": "Ahmed Hassan",
          "partyShort": "PP",
          "partyColor": "#E74C3C",
          "voteCount": 4500,
          "percentage": "45.00"
        }
      ],
      "winnerName": "Ahmed Hassan",
      "winnerParty": "PP",
      "winnerPercentage": 45.00,
      "victoryMargin": 10.00,
      "totalVotes": 10000,
      "turnoutPercentage": 68.5
    }
  ],
  
  "partySummary": [
    {
      "partyId": "UUID",
      "partyName": "People's Party",
      "partyShort": "PP",
      "partyColor": "#E74C3C",
      "seatsWon": 7,
      "totalVotes": 450000,
      "votePercentage": 42.5,
      "seatPercentage": 46.7
    }
  ]
}
```

**GET /api/v1/elections/:electionId/map**
```
Response:
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "constituency_code": "DHA-1",
        "constituency_name": "Dhaka-1",
        "fill_color": "#877A7E",
        "fill_opacity": 0.80,
        "winner_name": "Ahmed Hassan",
        "winner_party": "PP",
        "winner_percentage": 45.00,
        "total_votes": 10000,
        "turnout": 68.5,
        "votes": [
          {
            "candidate": "Ahmed Hassan",
            "party": "PP",
            "color": "#E74C3C",
            "votes": 4500,
            "percentage": "45.00"
          }
        ]
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [ ... ]
      }
    }
  ]
}
```

#### 7.1.6 Admin File Upload APIs

**POST /api/v1/admin/elections/:electionId/upload-candidates** (Admin only)
```
Request Headers:
  Authorization: Bearer <admin_jwt_token>
  Content-Type: multipart/form-data

Request Body (form-data):
  file: <candidates_json_file>

Response (200 OK):
{
  "success": true,
  "summary": {
    "partiesCreated": 4,
    "constituenciesProcessed": 15,
    "candidatesCreated": 45,
    "logosProcessed": 38,
    "logosMissing": 7
  },
  "warnings": [
    "Candidate CAND-007 missing logo"
  ]
}

Response (400 Bad Request):
{
  "success": false,
  "errors": [
    {
      "field": "parties[0].party_color",
      "message": "Invalid hex color format. Must be #RRGGBB"
    }
  ]
}
```

**POST /api/v1/admin/elections/:electionId/upload-map** (Admin only)
```
Request Headers:
  Authorization: Bearer <admin_jwt_token>
  Content-Type: multipart/form-data

Request Body (form-data):
  file: <geojson_file>

Response (200 OK):
{
  "success": true,
  "summary": {
    "featuresProcessed": 15,
    "constituenciesMatched": 15,
    "constituenciesUnmatched": 0
  }
}
```

---

## 8. FRONTEND COMPONENTS

### 8.1 Voter Interface Components

#### Component: VotingPage

**File: `src/pages/VotingPage.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { generateFingerprint, createFingerprintHash } from '../utils/fingerprint';
import axios from 'axios';

interface VotingPageProps {
  electionId: string;
}

export const VotingPage: React.FC<VotingPageProps> = ({ electionId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [canVote, setCanVote] = useState(false);

  useEffect(() => {
    verifyDevice();
  }, [electionId]);

  const verifyDevice = async () => {
    try {
      setLoading(true);
      
      // Step 1: Generate fingerprint
      const fingerprint = await generateFingerprint();
      
      // Step 2: Verify with backend
      const response = await axios.post('/api/v1/verify-device', {
        fingerprintData: fingerprint,
        electionId
      });
      
      if (response.data.canVote) {
        setSessionToken(response.data.sessionToken);
        setCanVote(true);
      } else {
        setError(response.data.reason || 'Unable to vote');
        setCanVote(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.reason || 'Verification failed');
      setCanVote(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Verifying device..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!canVote) {
    return <ErrorMessage message="You are not eligible to vote" />;
  }

  return (
    <div className="voting-container">
      <ConstituencySelector 
        electionId={electionId}
        sessionToken={sessionToken!}
      />
    </div>
  );
};
```

#### Component: Ballot

**File: `src/components/Ballot.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Candidate {
  id: string;
  name: string;
  partyName: string;
  partyShort: string;
  partyColor: string;
  symbol: string;
  logoUrl: string | null;
  ballotOrder: number;
  bio: string | null;
}

interface BallotProps {
  electionId: string;
  constituencyId: string;
  sessionToken: string;
}

export const Ballot: React.FC<BallotProps> = ({ 
  electionId, 
  constituencyId, 
  sessionToken 
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, [constituencyId]);

  const loadCandidates = async () => {
    try {
      const response = await axios.get(
        `/api/v1/elections/${electionId}/constituencies/${constituencyId}/candidates`
      );
      
      // Sort by ballot order
      const sorted = response.data.candidates.sort(
        (a: Candidate, b: Candidate) => a.ballotOrder - b.ballotOrder
      );
      
      setCandidates(sorted);
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVote = async () => {
    if (!selectedCandidate) {
      alert('Please select a candidate');
      return;
    }

    if (!confirm('Are you sure you want to submit your vote? This cannot be changed.')) {
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await axios.post(
        `/api/v1/elections/${electionId}/vote`,
        {
          constituencyId,
          candidateId: selectedCandidate
        },
        {
          headers: {
            'X-Session-Token': sessionToken
          }
        }
      );

      if (response.data.success) {
        setVoteSubmitted(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading ballot...</div>;
  }

  if (voteSubmitted) {
    return (
      <div className="vote-confirmation">
        <h2>Thank You!</h2>
        <p>Your vote has been successfully recorded.</p>
        <div className="success-icon">✓</div>
      </div>
    );
  }

  return (
    <div className="ballot-container">
      <h2>Select Your Candidate</h2>
      
      <div className="candidates-list">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className={`candidate-card ${selectedCandidate === candidate.id ? 'selected' : ''}`}
            onClick={() => setSelectedCandidate(candidate.id)}
          >
            <div className="candidate-header">
              {candidate.logoUrl && (
                <img 
                  src={candidate.logoUrl} 
                  alt={candidate.name}
                  className="candidate-logo"
                />
              )}
              <div className="candidate-info">
                <h3>{candidate.name}</h3>
                <div 
                  className="party-badge" 
                  style={{ backgroundColor: candidate.partyColor }}
                >
                  {candidate.partyShort}
                </div>
              </div>
            </div>
            
            <div className="candidate-details">
              <p className="party-name">{candidate.partyName}</p>
              <p className="symbol">Symbol: {candidate.symbol}</p>
              {candidate.bio && (
                <p className="bio">{candidate.bio}</p>
              )}
            </div>
            
            <div 
              className="color-indicator" 
              style={{ backgroundColor: candidate.partyColor }}
            />
          </div>
        ))}
      </div>

      <button
        className="submit-vote-btn"
        disabled={!selectedCandidate || submitting}
        onClick={handleSubmitVote}
      >
        {submitting ? 'Submitting...' : 'Submit Vote'}
      </button>
    </div>
  );
}