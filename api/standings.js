// api/standings.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  const SEASON = '2025-26';

  try {
    const url = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=2026';
    const response = await fetch(url);
    if (!response.ok) throw new Error(`ESPN API ${response.status}`);
    const data = await response.json();

    const teams = [];
    for (const group of data.children) {
      const conf = group.abbreviation === 'East' ? 'E' : 'W';
      for (const entry of group.standings.entries) {
        const t = entry.team;
        const stats = {};
        for (const s of entry.stats) stats[s.name] = s.value;

        const wins   = stats['wins']   ?? 0;
        const losses = stats['losses'] ?? 0;
        const confW  = stats['leagueWinPercent'] ? 0 : 0; // conf record not in this endpoint
        teams.push({
          teamId:     parseInt
