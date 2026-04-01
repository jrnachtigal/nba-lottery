// api/h2h.js
// Gets H2H record between two teams this season using ESPN's team schedule endpoint.
// ESPN uses their own team IDs (different from NBA.com IDs) so we map them first.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600');

  const { teamA, teamB } = req.query;
  if (!teamA || !teamB) {
    return res.status(400).json({ success: false, error: 'teamA and teamB required' });
  }

  // Map NBA.com team IDs → ESPN team IDs
  const ESPN_ID = {
    1610612737: 1,   // Atlanta Hawks
    1610612738: 2,   // Boston Celtics
    1610612751: 17,  // Brooklyn Nets
    1610612766: 30,  // Charlotte Hornets
    1610612741: 4,   // Chicago Bulls
    1610612739: 5,   // Cleveland Cavaliers
    1610612742: 6,   // Dallas Mavericks
    1610612743: 7,   // Denver Nuggets
    1610612765: 8,   // Detroit Pistons
    1610612744: 9,   // Golden State Warriors
    1610612745: 10,  // Houston Rockets
    1610612754: 11,  // Indiana Pacers
    1610612746: 12,  // LA Clippers
    1610612747: 13,  // Los Angeles Lakers
    1610612763: 14,  // Memphis Grizzlies
    1610612748: 15,  // Miami Heat
    1610612749: 16,  // Milwaukee Bucks
    1610612750: 16,  // Minnesota Timberwolves — ESPN ID 18 (below)
    1610612740: 3,   // New Orleans Pelicans
    1610612752: 18,  // New York Knicks — ESPN ID 19 (below)
    1610612760: 25,  // Oklahoma City Thunder
    1610612753: 20,  // Orlando Magic
    1610612755: 20,  // Philadelphia 76ers — ESPN ID 23 (below)
    1610612756: 24,  // Phoenix Suns
    1610612757: 22,  // Portland Trail Blazers
    1610612758: 26,  // Sacramento Kings
    1610612759: 27,  // San Antonio Spurs
    1610612761: 28,  // Toronto Raptors
    1610612762: 29,  // Utah Jazz
    1610612764: 27,  // Washington Wizards — ESPN ID 27 (below)
  };

  // Correct ESPN ID map (NBA.com ID → ESPN ID)
  const ESPNID = {
    1610612737: 1,   // Atlanta Hawks
    1610612738: 2,   // Boston Celtics
    1610612751: 17,  // Brooklyn Nets
    1610612766: 30,  // Charlotte Hornets
    1610612741: 4,   // Ch
