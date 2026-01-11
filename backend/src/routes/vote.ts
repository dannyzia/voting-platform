import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../index';
import { 
  verifyDeviceCanVote, 
  markDeviceAsVoted, 
  validateSession,
  hashIp
} from '../services/fingerprintService';
import { updateConstituencyMapColor } from '../services/mapColorService';
import { wsService } from '../services/websocket';
import { validate, verifyDeviceSchema, castVoteSchema } from '../utils/validation';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Verify device (main entry point for voters)
router.post('/', validate(verifyDeviceSchema), async (req: Request, res: Response) => {
  try {
    const { fingerprintData, electionId } = req.body;
    
    if (!fingerprintData || !electionId) {
      return res.status(400).json({ 
        canVote: false, 
        reason: 'Missing fingerprint or election ID' 
      });
    }
    
    // Verify election exists and is active
    const election = await prisma.election.findUnique({
      where: { id: electionId }
    });
    
    if (!election) {
      return res.status(404).json({ 
        canVote: false, 
        reason: 'Election not found' 
      });
    }
    
    if (election.status !== 'active') {
      return res.status(403).json({ 
        canVote: false, 
        reason: 'Election is not currently active' 
      });
    }
    
    const now = new Date();
    if (now < election.startDate || now > election.endDate) {
      return res.status(403).json({ 
        canVote: false, 
        reason: 'Election is not within voting period' 
      });
    }
    
    // Get client IP
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Verify device
    const result = await verifyDeviceCanVote(fingerprintData, electionId, ipAddress);
    
    if (result.canVote) {
      res.json({
        canVote: true,
        sessionToken: result.sessionToken,
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
      });
    } else {
      res.status(403).json({
        canVote: false,
        reason: result.reason
      });
    }
  } catch (error) {
    console.error('Verify device error:', error);
    res.status(500).json({ 
      canVote: false, 
      reason: 'Verification failed' 
    });
  }
});

// Helper to ensure value is string
const asString = (v: unknown): string | undefined =>
  Array.isArray(v) ? (typeof v[0] === 'string' ? v[0] : undefined) : (typeof v === 'string' ? v : undefined);

// Cast vote (with strict rate limiting)
router.post('/:electionId', strictRateLimiter, validate(castVoteSchema), async (req: Request, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    const constituencyId = asString(req.body.constituencyId)!;
    const candidateId = asString(req.body.candidateId)!;
    const sessionToken = asString(req.headers['x-session-token']);
    
    if (!sessionToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Missing session token' 
      });
    }
    
    if (!constituencyId || !candidateId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing constituency or candidate ID' 
      });
    }
    
    // Validate session
    const sessionResult = await validateSession(sessionToken);
    if (!sessionResult.valid) {
      return res.status(403).json({ 
        success: false, 
        error: sessionResult.reason 
      });
    }
    
    // Verify candidate belongs to constituency and election
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: candidateId,
        electionId,
        constituencyId
      }
    });
    
    if (!candidate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid candidate for this constituency' 
      });
    }
    
    // Create vote with anonymous token
    const voteToken = crypto.randomBytes(32).toString('hex');
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Create vote
      await tx.vote.create({
        data: {
          electionId,
          constituencyId,
          candidateId,
          voteToken,
          ipHash: hashIp(ipAddress)
        }
      });
      
      // Update or create vote result
      await tx.voteResult.upsert({
        where: {
          electionId_constituencyId_candidateId: {
            electionId,
            constituencyId,
            candidateId
          }
        },
        update: {
          voteCount: { increment: 1 },
          lastUpdated: new Date()
        },
        create: {
          electionId,
          constituencyId,
          candidateId,
          voteCount: 1
        }
      });
    });
    
    // Mark device as voted
    await markDeviceAsVoted(sessionToken, electionId);
    
    // Update constituency map color and broadcast via WebSocket
    updateConstituencyMapColor(electionId, constituencyId)
      .then(async (result) => {
        if (result) {
          // Broadcast the update to all connected clients
          wsService.broadcastConstituencyUpdate(
            electionId,
            constituencyId,
            {
              mapColor: result.color,
              breakdown: result.breakdown,
              totalVotes: result.totalVotes || 0,
              winnerName: result.winnerName,
              winnerParty: result.winnerParty
            }
          );
          
          // Also broadcast total vote count
          const totalVotes = await prisma.vote.count({ where: { electionId } });
          wsService.broadcastVoteCount(electionId, totalVotes);
        }
      })
      .catch(console.error);
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'vote_cast',
        entityType: 'vote',
        details: {
          electionId,
          constituencyId
        },
        ipAddress: ipAddress
      }
    });
    
    res.json({
      success: true,
      message: 'Vote successfully recorded',
      receiptToken: voteToken // Full token for verification
    });
  } catch (error) {
    console.error('Cast vote error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to record vote' 
    });
  }
});

// Verify vote receipt
router.post('/verify-receipt', async (req: Request, res: Response) => {
  try {
    const { receiptToken } = req.body;
    
    if (!receiptToken) {
      return res.status(400).json({
        success: false,
        error: 'Receipt token is required'
      });
    }
    
    // Find vote by token
    const vote = await prisma.vote.findUnique({
      where: { voteToken: receiptToken },
      include: {
        election: {
          select: {
            id: true,
            name: true
          }
        },
        constituency: {
          select: {
            constituencyCode: true,
            constituencyName: true
          }
        },
        candidate: {
          select: {
            name: true,
            partyName: true,
            partyShort: true,
            partyColor: true
          }
        }
      }
    });
    
    if (!vote) {
      return res.status(404).json({
        success: false,
        verified: false,
        error: 'Invalid receipt token'
      });
    }
    
    res.json({
      success: true,
      verified: true,
      vote: {
        electionId: vote.election.id,
        electionName: vote.election.name,
        constituencyCode: vote.constituency.constituencyCode,
        constituencyName: vote.constituency.constituencyName,
        candidateName: vote.candidate.name,
        partyName: vote.candidate.partyName,
        partyShort: vote.candidate.partyShort,
        partyColor: vote.candidate.partyColor,
        votedAt: vote.votedAt
      }
    });
  } catch (error) {
    console.error('Verify receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify receipt'
    });
  }
});

export default router;
