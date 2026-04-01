export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  const SEASON = '2025-26';

  // Try ESPN — no auth needed, fast, CORS-friendly from server side
  try {
    const res1 = await fetch('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });

    if (res1.ok) {
      const data = await res1.json();
      const teams = [];

      // ESPN returns standings grouped by conference under data.children
      const groups = data.children || data.standings?.entries ? [data] : (data.children || []);

      for (const group of groups) {
        const conf = (group.abbreviation || group.name || '')
