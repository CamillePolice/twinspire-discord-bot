/**
 * Format queue type to a user-friendly string
 */
export function formatQueueType(queueType: string): string {
  switch (queueType) {
    case 'RANKED_SOLO_5x5':
      return 'Ranked Solo/Duo';
    case 'RANKED_FLEX_SR':
      return 'Ranked Flex';
    case 'RANKED_TFT':
      return 'Ranked TFT';
    default:
      return queueType;
  }
}

/**
 * Calculate win rate percentage
 */
export function calculateWinRate(wins: number, losses: number): number {
  const totalGames = wins + losses;
  if (totalGames === 0) return 0;
  return Math.round((wins / totalGames) * 100);
}

/**
 * Get appropriate icon for rank tier
 */
export function getRankIcon(tier: string): string {
  switch (tier) {
    case 'IRON':
      return '⚙️';
    case 'BRONZE':
      return '🥉';
    case 'SILVER':
      return '🥈';
    case 'GOLD':
      return '🥇';
    case 'PLATINUM':
      return '💎';
    case 'EMERALD':
      return '💚';
    case 'DIAMOND':
      return '💠';
    case 'MASTER':
      return '🏆';
    case 'GRANDMASTER':
      return '👑';
    case 'CHALLENGER':
      return '🏅';
    default:
      return '❓';
  }
}

/**
 * Extract summoner name and tagline from OP.GG URL
 */
export function extractSummonerInfo(opggUrl: string): { name: string; tagLine: string } | null {
  // Match pattern: /summoners/euw/Name-Tagline
  const match = opggUrl.match(/\/summoners\/euw\/([^-]+)-([^/]+)/);

  if (match) {
    return {
      name: match[1],
      tagLine: match[2],
    };
  }

  return null;
}

/**
 * Debug function to test ELO calculation
 */
export function debugEloCalculation(tier: string, division?: string, lp?: number): string {
  const eloValue = getTierEloValue(tier, division, lp);
  return `${tier} ${division || ''} ${lp || 0} LP = ${eloValue} ELO`;
}

/**
 * Convert a rank tier and division to a numerical ELO value
 * Based on Riot's SoloQ ranking system
 */
export function getTierEloValue(tier: string, division?: string, lp?: number): number {
  // Base ELO values for each tier
  const tierBaseValues: Record<string, number> = {
    'IRON': 0,
    'BRONZE': 400,
    'SILVER': 800,
    'GOLD': 1200,
    'PLATINUM': 1600,
    'EMERALD': 2000,
    'DIAMOND': 2400,
    'MASTER': 2800,
    'GRANDMASTER': 3200,
    'CHALLENGER': 3600,
    'UNRANKED': -100,
  };

  // Division multipliers (IV = 0, III = 0.25, II = 0.5, I = 0.75)
  const divisionMultipliers: Record<string, number> = {
    'IV': 0,
    'III': 0.25,
    'II': 0.5,
    'I': 0.75,
  };

  // Get base value for the tier
  const baseValue = tierBaseValues[tier] || 0;
  
  // If it's Master, Grandmaster, or Challenger, just add LP directly
  if (tier === 'MASTER' || tier === 'GRANDMASTER' || tier === 'CHALLENGER') {
    return baseValue + (lp || 0);
  }
  
  // For other tiers, add division value and LP
  const divisionValue = division ? (divisionMultipliers[division] || 0) * 400 : 0;
  const lpValue = lp || 0;
  
  return baseValue + divisionValue + lpValue;
}

/**
 * Calculate the average ELO of a team based on player ranks
 */
export function calculateTeamAverageElo(members: any[]): { averageElo: number; formattedElo: string } {
  if (!members || members.length === 0) {
    return { averageElo: 0, formattedElo: 'N/A' };
  }
  
  let totalElo = 0;
  let validRanks = 0;
  
  for (const member of members) {
    if (member.tier && member.tier !== 'UNRANKED' && member.tier !== 'Error') {
      // Extract division and LP from rank string (e.g., "DIAMOND IV 75 LP")
      const rankParts = member.rank.split(' ');
      const tier = rankParts[0];
      const division = rankParts.length > 1 ? rankParts[1] : undefined;
      const lp = rankParts.length > 3 ? parseInt(rankParts[2], 10) : 0;
      
      const eloValue = getTierEloValue(tier, division, lp);
      totalElo += eloValue;
      validRanks++;
    }
  }
  
  if (validRanks === 0) {
    return { averageElo: 0, formattedElo: 'N/A' };
  }
  
  const averageElo = Math.round(totalElo / validRanks);
  
  // Determine the tier based on the average elo
  let tier = 'UNRANKED';
  let division = '';
  let lp = 0;
  
  if (averageElo >= 3600) {
    tier = 'CHALLENGER';
    lp = averageElo - 3600;
  } else if (averageElo >= 3200) {
    tier = 'GRANDMASTER';
    lp = averageElo - 3200;
  } else if (averageElo >= 2800) {
    tier = 'MASTER';
    lp = averageElo - 2800;
  } else {
    // For tiers with divisions
    const tiers = ['DIAMOND', 'EMERALD', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'IRON'];
    const baseValues = [2400, 2000, 1600, 1200, 800, 400, 0];
    
    for (let i = 0; i < tiers.length; i++) {
      if (averageElo >= baseValues[i]) {
        tier = tiers[i];
        const remainder = averageElo - baseValues[i];
        
        // Calculate division and LP
        // Each division is worth 100 LP
        const totalLP = remainder;
        const divisionNumber = Math.floor(totalLP / 100);
        lp = totalLP % 100;
        
        // Convert division number to Roman numeral
        if (divisionNumber === 0) division = 'IV';
        else if (divisionNumber === 1) division = 'III';
        else if (divisionNumber === 2) division = 'II';
        else if (divisionNumber === 3) division = 'I';
        
        break;
      }
    }
  }
  
  // Format the output
  let formattedElo = '';
  if (tier === 'MASTER' || tier === 'GRANDMASTER' || tier === 'CHALLENGER') {
    formattedElo = `${tier} ${lp} LP`;
  } else if (division) {
    formattedElo = `${tier} ${division} ${lp} LP`;
  } else {
    formattedElo = `${tier}`;
  }
  
  return { 
    averageElo, 
    formattedElo: `${formattedElo} (${averageElo} ELO)` 
  };
}
