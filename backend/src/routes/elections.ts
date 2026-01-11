import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { validate, createElectionSchema, updateElectionStatusSchema } from '../utils/validation';

const router = Router();

// Get all elections (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '10' } = req.query;
    const asString = (v: unknown): string | undefined => Array.isArray(v) ? (typeof v[0] === 'string' ? v[0] : undefined) : (typeof v === 'string' ? v : undefined);
    const pageNum = parseInt(asString(page) ?? '1');
    const limitNum = parseInt(asString(limit) ?? '10');
    const skip = (pageNum - 1) * limitNum;
    
    const where: any = {};
    const statusStr = asString(status);
    if (statusStr) {
      where.status = statusStr;
    }
    
    const [elections, total] = await Promise.all([
      prisma.election.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              constituencies: true,
              candidates: true
            }
          }
        }
      }),
      prisma.election.count({ where })
    ]);
    
    res.json({
      elections: elections.map(e => ({
        id: e.id,
        name: e.name,
        status: e.status,
        startDate: e.startDate,
        endDate: e.endDate,
        totalConstituencies: (e as any)._count?.constituencies ?? 0,
        totalCandidates: (e as any)._count?.candidates ?? 0
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total
      }
    });
  } catch (error) {
    console.error('Get elections error:', error);
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
});

// Get active elections for voters
router.get('/active', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    
    const elections = await prisma.election.findMany({
      where: {
        status: 'active',
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        _count: {
          select: {
            constituencies: true
          }
        }
      }
    });
    
    res.json({
      elections: elections.map(e => ({
        id: e.id,
        name: e.name,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
        totalConstituencies: (e as any)._count?.constituencies ?? 0
      }))
    });
  } catch (error) {
    console.error('Get active elections error:', error);
    res.status(500).json({ error: 'Failed to fetch active elections' });
  }
});

// Get single election
router.get('/:electionId', async (req: Request, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        _count: {
          select: {
            constituencies: true,
            candidates: true,
            votes: true
          }
        }
      }
    });
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    
    res.json({
      id: election.id,
      name: election.name,
      description: election.description,
      startDate: election.startDate,
      endDate: election.endDate,
      status: election.status,
      authConfig: election.authConfig,
      stats: {
        totalConstituencies: (election as any)._count?.constituencies ?? 0,
        totalCandidates: (election as any)._count?.candidates ?? 0,
        totalVotesCast: (election as any)._count?.votes ?? 0
      }
    });
  } catch (error) {
    console.error('Get election error:', error);
    res.status(500).json({ error: 'Failed to fetch election' });
  }
});

// Get constituencies for an election
router.get('/:electionId/constituencies', async (req: Request, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    
    const constituencies = await prisma.constituency.findMany({
      where: { electionId },
      include: {
        _count: {
          select: { candidates: true }
        }
      },
      orderBy: { constituencyCode: 'asc' }
    });
    
    res.json({
      constituencies: constituencies.map(c => ({
        id: c.id,
        code: c.constituencyCode,
        name: c.constituencyName,
        district: c.district,
        division: c.division,
        candidateCount: (c as any)._count?.candidates ?? 0
      }))
    });
  } catch (error) {
    console.error('Get constituencies error:', error);
    res.status(500).json({ error: 'Failed to fetch constituencies' });
  }
});

// Get candidates for a constituency
router.get('/:electionId/constituencies/:constituencyId/candidates', async (req: Request, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    const constituencyId = req.params.constituencyId as string;
    
    const constituency = await prisma.constituency.findUnique({
      where: { id: constituencyId }
    });
    
    if (!constituency || constituency.electionId !== electionId) {
      return res.status(404).json({ error: 'Constituency not found' });
    }
    
    const candidates = await prisma.candidate.findMany({
      where: {
        electionId,
        constituencyId
      },
      orderBy: { ballotOrder: 'asc' }
    });
    
    res.json({
      constituency: {
        id: constituency.id,
        code: constituency.constituencyCode,
        name: constituency.constituencyName
      },
      candidates: candidates.map(c => ({
        id: c.id,
        name: c.name,
        partyName: c.partyName,
        partyShort: c.partyShort,
        partyColor: c.partyColor,
        symbol: c.symbol,
        logoUrl: c.candidateLogoUrl,
        ballotOrder: c.ballotOrder,
        bio: c.bio
      }))
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Create election (admin only)
router.post('/', authMiddleware, validate(createElectionSchema), async (req: Request, res: Response) => {
  try {
    const { name, description, startDate, endDate, authConfig } = req.body;
    const userId = (req as any).user?.userId;
    
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'Name, startDate, and endDate are required' });
    }
    
    const election = await prisma.election.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        authConfig: authConfig || { method: 'device_fingerprint', settings: { strictness: 'high' } },
        createdById: userId
      }
    });
    
    res.status(201).json(election);
  } catch (error) {
    console.error('Create election error:', error);
    res.status(500).json({ error: 'Failed to create election' });
  }
});

// Update election status (admin only)
router.patch('/:electionId/status', authMiddleware, validate(updateElectionStatusSchema), async (req: Request, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    const { status } = req.body;
    
    const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const election = await prisma.election.update({
      where: { id: electionId },
      data: { status }
    });
    
    res.json(election);
  } catch (error) {
    console.error('Update election status error:', error);
    res.status(500).json({ error: 'Failed to update election status' });
  }
});

export default router;
