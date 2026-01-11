import crypto from 'crypto';
import { prisma } from '../index';

export interface FingerprintData {
  visitorId: string;
  components: any;
  confidence: {
    score: number;
  };
}

/**
 * Hash fingerprint data with SHA-256
 */
export function hashFingerprint(fingerprintData: FingerprintData): string {
  const dataString = JSON.stringify({
    visitorId: fingerprintData.visitorId,
    userAgent: fingerprintData.components?.userAgent?.value || '',
    screenResolution: fingerprintData.components?.screenResolution?.value || ''
  });
  
  return crypto
    .createHash('sha256')
    .update(dataString)
    .digest('hex');
}

/**
 * Hash IP address for privacy
 */
export function hashIp(ipAddress: string): string {
  return crypto.createHash('sha256').update(ipAddress).digest('hex');
}

/**
 * Verify if device can vote in a specific election
 */
export async function verifyDeviceCanVote(
  fingerprintData: FingerprintData,
  electionId: string,
  ipAddress: string
): Promise<{ canVote: boolean; reason?: string; deviceId?: string; sessionToken?: string }> {
  
  const fingerprintHash = hashFingerprint(fingerprintData);
  const ipHash = hashIp(ipAddress);
  
  // Find or create device fingerprint record
  let deviceRecord = await prisma.deviceFingerprint.findUnique({
    where: { fingerprintHash }
  });
  
  if (!deviceRecord) {
    // New device - create record
    deviceRecord = await prisma.deviceFingerprint.create({
      data: {
        fingerprintHash,
        fingerprintData: fingerprintData as any,
        firstSeen: new Date(),
        lastSeen: new Date(),
        voteCount: 0,
        ipHash
      }
    });
  } else {
    // Update last seen
    await prisma.deviceFingerprint.update({
      where: { id: deviceRecord.id },
      data: { lastSeen: new Date() }
    });
  }
  
  // Check if device has already voted in this election
  const existingSession = await prisma.voterSession.findUnique({
    where: {
      electionId_deviceFingerprintId: {
        electionId,
        deviceFingerprintId: deviceRecord.id
      }
    }
  });
  
  if (existingSession && existingSession.hasVoted) {
    return {
      canVote: false,
      reason: 'This device has already voted in this election'
    };
  }
  
  // Check if device is flagged
  if (deviceRecord.flagged) {
    return {
      canVote: false,
      reason: 'This device has been flagged for suspicious activity'
    };
  }
  
  // Create or update session
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionDurationHours = parseInt(process.env.SESSION_DURATION_HOURS || '1');
  const expiresAt = new Date(Date.now() + sessionDurationHours * 3600000);
  
  if (existingSession) {
    await prisma.voterSession.update({
      where: { id: existingSession.id },
      data: {
        sessionToken,
        sessionExpiresAt: expiresAt
      }
    });
  } else {
    await prisma.voterSession.create({
      data: {
        electionId,
        deviceFingerprintId: deviceRecord.id,
        hasVoted: false,
        sessionToken,
        sessionExpiresAt: expiresAt
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
 * Mark device as voted
 */
export async function markDeviceAsVoted(
  sessionToken: string,
  electionId: string
): Promise<void> {
  
  const session = await prisma.voterSession.findUnique({
    where: { sessionToken }
  });
  
  if (!session) {
    throw new Error('Invalid session token');
  }
  
  if (session.electionId !== electionId) {
    throw new Error('Session election mismatch');
  }
  
  if (session.hasVoted) {
    throw new Error('Session already used to vote');
  }
  
  if (session.sessionExpiresAt && session.sessionExpiresAt < new Date()) {
    throw new Error('Session expired');
  }
  
  // Mark as voted
  await prisma.voterSession.update({
    where: { id: session.id },
    data: {
      hasVoted: true,
      votedAt: new Date()
    }
  });
  
  // Increment device vote count
  await prisma.deviceFingerprint.update({
    where: { id: session.deviceFingerprintId },
    data: {
      voteCount: {
        increment: 1
      }
    }
  });
}

/**
 * Validate session token
 */
export async function validateSession(sessionToken: string): Promise<{
  valid: boolean;
  session?: any;
  reason?: string;
}> {
  const session = await prisma.voterSession.findUnique({
    where: { sessionToken },
    include: {
      election: true,
      deviceFingerprint: true
    }
  });
  
  if (!session) {
    return { valid: false, reason: 'Invalid session' };
  }
  
  if (session.hasVoted) {
    return { valid: false, reason: 'Already voted' };
  }
  
  if (session.sessionExpiresAt && session.sessionExpiresAt < new Date()) {
    return { valid: false, reason: 'Session expired' };
  }
  
  if (session.election.status !== 'active') {
    return { valid: false, reason: 'Election not active' };
  }
  
  return { valid: true, session };
}
