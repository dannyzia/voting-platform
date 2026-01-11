import { prisma } from '../index';

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16)
  };
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b = Math.max(0, Math.min(255, Math.round(b)));
  
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Calculate proportional blend color for a constituency
 */
export async function calculateConstituencyColor(
  electionId: string,
  constituencyId: string
): Promise<{ color: string; breakdown: any[] }> {
  
  // Get all vote results for this constituency
  const voteResults = await prisma.voteResult.findMany({
    where: {
      electionId,
      constituencyId
    },
    include: {
      candidate: {
        select: {
          name: true,
          partyShort: true,
          partyColor: true
        }
      }
    }
  });
  
  if (voteResults.length === 0) {
    return {
      color: '#E0E0E0',
      breakdown: []
    };
  }
  
  // Calculate total votes
  const totalVotes = voteResults.reduce((sum, result) => sum + result.voteCount, 0);
  
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
    const percentage = (result.voteCount / totalVotes) * 100;
    const weight = percentage / 100;
    
    const partyColor = result.candidate.partyColor || '#808080';
    const rgb = hexToRgb(partyColor);
    
    totalR += rgb.r * weight;
    totalG += rgb.g * weight;
    totalB += rgb.b * weight;
    
    return {
      candidateName: result.candidate.name,
      partyShort: result.candidate.partyShort,
      partyColor: partyColor,
      voteCount: result.voteCount,
      percentage: percentage.toFixed(2)
    };
  });
  
  const finalColor = rgbToHex(totalR, totalG, totalB);
  
  return {
    color: finalColor,
    breakdown
  };
}

/**
 * Update constituency results with new color
 * Returns the updated data for WebSocket broadcast
 */
export async function updateConstituencyMapColor(
  electionId: string,
  constituencyId: string
): Promise<{
  color: string;
  breakdown: any[];
  totalVotes: number;
  winnerName?: string;
  winnerParty?: string;
} | null> {
  
  const { color, breakdown } = await calculateConstituencyColor(electionId, constituencyId);
  
  // Find winner
  const voteResults = await prisma.voteResult.findMany({
    where: {
      electionId,
      constituencyId
    },
    orderBy: {
      voteCount: 'desc'
    },
    take: 2,
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          partyId: true,
          partyShort: true
        }
      }
    }
  });
  
  if (voteResults.length === 0) {
    return null;
  }
  
  const winner = voteResults[0];
  const runnerUp = voteResults[1];
  
  const totalResult = await prisma.voteResult.aggregate({
    where: {
      electionId,
      constituencyId
    },
    _sum: {
      voteCount: true
    }
  });
  
  const totalCount = totalResult._sum.voteCount || 0;
  const winnerPercentage = totalCount > 0 ? (winner.voteCount / totalCount) * 100 : 0;
  const victoryMargin = runnerUp 
    ? ((winner.voteCount - runnerUp.voteCount) / totalCount) * 100 
    : winnerPercentage;
  
  // Update or create constituency_results
  await prisma.constituencyResult.upsert({
    where: {
      electionId_constituencyId: {
        electionId,
        constituencyId
      }
    },
    update: {
      mapColor: color,
      mapOpacity: 0.80,
      colorBreakdown: breakdown,
      winningCandidateId: winner.candidate.id,
      winningPartyId: winner.candidate.partyId,
      winningPercentage: parseFloat(winnerPercentage.toFixed(2)),
      victoryMargin: parseFloat(victoryMargin.toFixed(2)),
      totalVotesCast: totalCount,
      lastUpdated: new Date()
    },
    create: {
      electionId,
      constituencyId,
      mapColor: color,
      mapOpacity: 0.80,
      colorBreakdown: breakdown,
      winningCandidateId: winner.candidate.id,
      winningPartyId: winner.candidate.partyId,
      winningPercentage: parseFloat(winnerPercentage.toFixed(2)),
      victoryMargin: parseFloat(victoryMargin.toFixed(2)),
      totalVotesCast: totalCount
    }
  });
  
  // Return data for WebSocket broadcast
  return {
    color,
    breakdown,
    totalVotes: totalCount,
    winnerName: winner.candidate.name,
    winnerParty: winner.candidate.partyShort || undefined
  };
}

/**
 * Get map data with colors for all constituencies
 */
export async function getElectionMapData(electionId: string): Promise<any> {
  const results = await prisma.constituencyResult.findMany({
    where: { electionId },
    include: {
      constituency: true,
      winningCandidate: {
        include: {
          party: true
        }
      }
    }
  });
  
  return results.map(result => ({
    constituencyId: result.constituencyId,
    constituencyCode: result.constituency.constituencyCode,
    constituencyName: result.constituency.constituencyName,
    mapColor: result.mapColor,
    mapOpacity: result.mapOpacity,
    colorBreakdown: result.colorBreakdown,
    winnerName: result.winningCandidate?.name,
    winnerParty: result.winningCandidate?.partyShort,
    winningPercentage: result.winningPercentage,
    victoryMargin: result.victoryMargin,
    totalVotes: result.totalVotesCast
  }));
}
