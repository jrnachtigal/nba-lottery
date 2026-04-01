module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600');

  const { teamA, teamB } = req.query;
  if (!teamA || !teamB) {
    return res.status(400).json({ success: false, error: 'teamA and teamB required' });
  }

  const ESPNID = {
    1610612737:1,1610612738:2,1610612751:17,1610612766:30,1610612741:4,
    1610612739:5,1610612742:6,1610612743:7,1610612765:8,1610612744:9,
    1610612745:10,1610612754:11,1610612746:12,1610612747:13,1610612763:14,
    1610612748:15,1610612749:16,1610612750:18,1610612740:3,1610612752:19,
    1610612760:25,1610612753:20,1610612755:23,1610612756:24,1610612757:22,
    1610612758:26,1610612759:27,1610612761:28,1610612762:29,1610612764:27,
  };

  const espnA = ESPNID[parseInt(teamA)];
  const espnB = ESPNID[parseInt(teamB)];

  if (!espnA || !espnB) {
    return res.status(200).json({ success: true, teamA: parseInt(teamA), teamB: parseInt(teamB), teamAWins: 0, teamALosses: 0, gamesPlayed: 0, winner: null, status: 'no_games' });
  }

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${espnA}/schedule?season=2026`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`ESPN ${response.status}`);
    const data = await response.json();

    let wins = 0, losses = 0;
    for (const event of (data.events || [])) {
      if (event.season?.type !== 2) continue;
      if (event.status?.type?.completed !== true) continue;
      const competitors = event.competitions?.[0]?.competitors || [];
      const teamAComp = competitors.find(c => parseInt(c.id) === espnA);
      const teamBComp = competitors.find(c => parseInt(c.id) === espnB);
      if (!teamAComp || !teamBComp) continue;
      if (teamAComp.winner === true) wins++;
      else if (teamAComp.winner === false) losses++;
    }

    const games = wins + losses;
    let winner = null, status = 'no_games';
    if (games > 0) {
      if (wins > losses) { winner = parseInt(teamA); status = 'complete'; }
      else if (losses > wins) { winner = parseInt(teamB); status = 'complete'; }
      else status = 'tied';
    }

    return res.status(200).json({ success: true, teamA: parseInt(teamA), teamB: parseInt(teamB), teamAWins: wins, teamALosses: losses, gamesPlayed: games, winner, status });

  } catch (err) {
    return res.status(200).json({ success: true, teamA: parseInt(teamA), teamB: parseInt(teamB), teamAWins: 0, teamALosses: 0, gamesPlayed: 0, winner: null, status: 'no_games' });
  }
};
