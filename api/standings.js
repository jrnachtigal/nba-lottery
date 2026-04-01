// api/standings.js
// Fetches from ESPN's public API for speed and reliability.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  const SEASON = '2025'; // ESPN uses the start year for the season ID

  try {
    const url = `http://site.api.espn.com/apis/v2/sports/basketball/nba/standings`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`ESPN API error: ${response.status}`);
    
    const data = await response.json();
    const result = parseESPNStandings(data, '2025-26');
    return res.status(200).json(result);
  } catch (e) {
    console.error('ESPN fetch failed:', e.message);
    // Fallback logic can remain the same as your previous version
    return res.status(200).json({ success: false, error: "Failed to fetch standings" });
  }
}

function parseESPNStandings(data, seasonStr) {
  const teams = [];
  data.children.forEach(confGroup => {
    const confName = confGroup.name === 'Western Conference' ? 'W' : 'E';
    confGroup.standings.entries.forEach(entry => {
      const stats = entry.stats;
      const getStat = (name) => stats.find(s => s.name === name)?.value || 0;
      
      teams.push({
        teamId: entry.team.id,
        city: '', // ESPN provides full name
        name: entry.team.shortDisplayName,
        fullName: entry.team.displayName,
        abbr: entry.team.abbreviation,
        wins: getStat('wins'),
        losses: getStat('losses'),
        winPct: getStat('winPercent') / 100,
        conf: confName,
        confW: 0, // Simplified for this source
        confL: 0,
        confWinPct: 0
      });
    });
  });

  // CRITICAL FIX: Sort by WINS (descending) so best record is rank 0
  teams.sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  // Take the top 18 (lottery pool) and group them
  const lottery = teams.slice(0, 18).map((t, i) => ({
    ...t,
    recordRank: i,
    group: Math.floor(i / 6),
    groupRank: i % 6,
  }));

  return {
    success: true,
    season: seasonStr,
    teams: lottery,
    lastUpdated: new Date().toISOString()
  };
}
