import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { getElectionMapData } from '../services/mapColorService';

const router = Router();

// Get election results
router.get('/:electionId', async (req: Request, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    
    const election = await prisma.election.findUnique({
      where: { id: electionId }
    });
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    
    // Get constituency results
    const constituencyResults = await prisma.constituencyResult.findMany({
      where: { electionId },
      include: {
        constituency: true,
        winningCandidate: {
          include: { party: true }
        }
      }
    });
    
    // Get party summary
    const partySummary = await prisma.$queryRaw`
      SELECT 
        p.id as party_id,
        p.party_name,
        p.party_short,
        p.party_color,
        COUNT(DISTINCT cr.constituency_id) as seats_won,
        SUM(vr.vote_count) as total_votes
      FROM parties p
      LEFT JOIN constituency_results cr ON cr.winning_party_id = p.id AND cr.election_id = ${electionId}
      LEFT JOIN vote_results vr ON vr.election_id = ${electionId} AND EXISTS (
        SELECT 1 FROM candidates c WHERE c.id = vr.candidate_id AND c.party_id = p.id
      )
      WHERE p.election_id = ${electionId}
      GROUP BY p.id, p.party_name, p.party_short, p.party_color
      ORDER BY seats_won DESC
    `;
    
    // Calculate total votes
    const totalVotes = await prisma.vote.count({ where: { electionId } });
    
    res.json({
      electionId,
      lastUpdated: new Date().toISOString(),
      totalConstituencies: constituencyResults.length,
      resultsDeclared: constituencyResults.filter(r => r.resultDeclared).length,
      inProgress: constituencyResults.filter(r => !r.resultDeclared && r.totalVotesCast > 0).length,
      
      constituencies: constituencyResults.map(r => {
        const cr = r as any;
        return {
          constituencyId: r.constituencyId,
          constituencyCode: cr.constituency?.constituencyCode,
          constituencyName: cr.constituency?.constituencyName,
          mapColor: r.mapColor,
          mapOpacity: r.mapOpacity,
          colorBreakdown: r.colorBreakdown,
          winnerName: cr.winningCandidate?.name,
          winnerParty: cr.winningCandidate?.partyShort,
          winningPercentage: r.winningPercentage,
          victoryMargin: r.victoryMargin,
          totalVotes: r.totalVotesCast,
          turnoutPercentage: r.voterTurnoutPercentage
        };
      }),
      
      partySummary
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Get map data with colors
router.get('/:electionId/map', async (req: Request, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    
    const election = await prisma.election.findUnique({
      where: { id: electionId }
    });
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    
    // Get all constituencies with their results
    const constituencies = await prisma.constituency.findMany({
      where: { electionId },
      include: {
        constituencyResults: {
          include: {
            winningCandidate: true
          }
        }
      }
    });
    
    // Build GeoJSON with colors
    const features = constituencies
      .filter(c => c.geoProperties)
      .map(c => {
        const cAny = c as any;
        const result = cAny.constituencyResults?.[0];
        const geoProps = c.geoProperties as any;
        
        return {
          type: 'Feature',
          properties: {
            constituency_code: c.constituencyCode,
            constituency_name: c.constituencyName,
            fill_color: result?.mapColor || '#E0E0E0',
            fill_opacity: result?.mapOpacity || 0.6,
            winner_name: result?.winningCandidate?.name,
            winner_party: result?.winningCandidate?.partyShort,
            winner_percentage: result?.winningPercentage,
            total_votes: result?.totalVotesCast || 0,
            votes: result?.colorBreakdown || []
          },
          geometry: geoProps.geometry
        };
      });
    
    res.json({
      type: 'FeatureCollection',
      features
    });
  } catch (error) {
    console.error('Get map data error:', error);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

// Get constituency details with vote breakdown
router.get('/:electionId/constituencies/:constituencyId', async (req: Request, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    const constituencyId = req.params.constituencyId as string;
    
    const constituency = await prisma.constituency.findUnique({
      where: { id: constituencyId },
      include: {
        candidates: {
          orderBy: { ballotOrder: 'asc' }
        }
      }
    });
    
    if (!constituency || constituency.electionId !== electionId) {
      return res.status(404).json({ error: 'Constituency not found' });
    }
    
    // Get vote results for each candidate
    const voteResults = await prisma.voteResult.findMany({
      where: {
        electionId,
        constituencyId
      },
      include: {
        candidate: true
      },
      orderBy: {
        voteCount: 'desc'
      }
    });
    
    const totalVotes = voteResults.reduce((sum, r) => sum + r.voteCount, 0);
    
    res.json({
      constituency: {
        id: constituency.id,
        code: constituency.constituencyCode,
        name: constituency.constituencyName,
        district: constituency.district,
        division: constituency.division
      },
      totalVotes,
      results: voteResults.map(r => {
        const rAny = r as any;
        return {
          candidateId: r.candidateId,
          candidateName: rAny.candidate?.name,
          partyName: rAny.candidate?.partyName,
          partyShort: rAny.candidate?.partyShort,
          partyColor: rAny.candidate?.partyColor,
          voteCount: r.voteCount,
          percentage: totalVotes > 0 ? ((r.voteCount / totalVotes) * 100).toFixed(2) : '0.00'
        };
      })
    });
  } catch (error) {
    console.error('Get constituency details error:', error);
    res.status(500).json({ error: 'Failed to fetch constituency details' });
  }
});

export default router;
