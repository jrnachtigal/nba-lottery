export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  const SEASON = '2025-26';

  try {
    const response = await fetch(
      'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings',
      { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } }
    );

    if (response.ok) {
      const data = await response.json();
      const teams = [];
      const groups = data.children || [];

      for (const group of groups) {
        const conf = (group.abbreviation || group.name || '').toLowerCase().includes('east') ? 'E' : 'W';
        const entries = group.standings?.entries || [];
        for (const entry of entries) {
          const t = entry.team || {};
          const stats = {};
          for (const s of (entry.stats || [])) stats[s.name] = s.value;
          const wins   = Math.round(stats.wins   ?? 0);
          const losses = Math.round(stats.losses ?? 0);
          if (!t.displayName) continue;
          teams.push({
            teamId:     parseInt(t.id) || 0,
            city:       t.location || '',
            name:       t.name || '',
            fullName:   t.displayName,
            abbr:       t.abbreviation || t.displayName.substring(0, 3).toUpperCase(),
            wins, losses,
            winPct:     wins + losses > 0 ? wins / (wins + losses) : 0,
            conf,
            confW: 0, confL: 0, confWinPct: 0,
          });
        }
      }

      if (teams.length >= 18) {
        return res.status(200).json(buildResponse(teams, SEASON, false));
      }
    }
  } catch (e) {
    console.warn('ESPN fetch failed:', e.message);
  }

  return res.status(200).json(buildFallback(SEASON));
}

function buildResponse(teams, season, isFallback) {
  teams.sort((a, b) => b.losses !== a.losses ? b.losses - a.losses : a.wins - b.wins);

  const lottery = teams.slice(0, 18).map((t, i) => ({
    ...t,
    recordRank: i,
    group:     Math.floor(i / 6),
    groupRank: 5 - (i % 6),
    ballCount: 5 - (i % 6) + 1,
  }));

  const tiedPairs = [];
  for (let i = 0; i < lottery.length - 1; i++) {
    const a = lottery[i], b = lottery[i + 1];
    if (a.wins === b.wins && a.losses === b.losses) {
      const seen = tiedPairs.some(
        p => p[0].teamId === a.teamId || p[0].teamId === b.teamId ||
             p[1].teamId === a.teamId || p[1].teamId === b.teamId
      );
      if (!seen) tiedPairs.push([a, b]);
    }
  }

  return {
    success: true, season, isFallback,
    lastUpdated: new Date().toISOString(),
    teams: lottery,
    tiedPairs: tiedPairs.map(([a, b]) => ({
      teamA: { teamId: a.teamId, fullName: a.fullName, abbr: a.abbr },
      teamB: { teamId: b.teamId, fullName: b.fullName, abbr: b.abbr },
    })),
  };
}

function buildFallback(season) {
  const raw = [
    {teamId:1610612754,city:'Indiana',     name:'Pacers',        conf:'E',wins:17,losses:58},
    {teamId:1610612764,city:'Washington',  name:'Wizards',       conf:'E',wins:17,losses:58},
    {teamId:1610612751,city:'Brooklyn',    name:'Nets',          conf:'E',wins:18,losses:57},
    {teamId:1610612758,city:'Sacramento',  name:'Kings',         conf:'W',wins:19,losses:57},
    {teamId:1610612762,city:'Utah',        name:'Jazz',          conf:'W',wins:21,losses:55},
    {teamId:1610612742,city:'Dallas',      name:'Mavericks',     conf:'W',wins:24,losses:51},
    {teamId:1610612763,city:'Memphis',     name:'Grizzlies',     conf:'W',wins:25,losses:50},
    {teamId:1610612740,city:'New Orleans', name:'Pelicans',      conf:'W',wins:25,losses:51},
    {teamId:1610612741,city:'Chicago',     name:'Bulls',         conf:'E',wins:29,losses:46},
    {teamId:1610612749,city:'Milwaukee',   name:'Bucks',         conf:'E',wins:29,losses:45},
    {teamId:1610612744,city:'Golden State',name:'Warriors',      conf:'W',wins:36,losses:39},
    {teamId:1610612757,city:'Portland',    name:'Trail Blazers', conf:'W',wins:38,losses:38},
    {teamId:1610612766,city:'Charlotte',   name:'Hornets',       conf:'E',wins:39,losses:36},
    {teamId:1610612746,city:'LA',          name:'Clippers',      conf:'W',wins:39,losses:36},
    {teamId:1610612748,city:'Miami',       name:'Heat',          conf:'E',wins:40,losses:36},
    {teamId:1610612753,city:'Orlando',     name:'Magic',         conf:'E',wins:39,losses:35},
    {teamId:1610612755,city:'Philadelphia',name:'76ers',         conf:'E',wins:41,losses:34},
    {teamId:1610612756,city:'Phoenix',     name:'Suns',          conf:'W',wins:42,losses:33},
  ];

  const ABBR = {
    'Indiana Pacers':'IND','Washington Wizards':'WAS','Brooklyn Nets':'BKN',
    'Sacramento Kings':'SAC','Utah Jazz':'UTA','Dallas Mavericks':'DAL',
    'Memphis Grizzlies':'MEM','New Orleans Pelicans':'NOP','Chicago Bulls':'CHI',
    'Milwaukee Bucks':'MIL','Golden State Warriors':'GSW','Portland Trail Blazers':'POR',
    'Charlotte Hornets':'CHA','LA Clippers':'LAC','Miami Heat':'MIA',
    'Orlando Magic':'ORL','Philadelphia 76ers':'PHI','Phoenix Suns':'PHX',
  };

  return buildResponse(raw.map(t => ({
    ...t,
    fullName:   `${t.city} ${t.name}`,
    abbr:       ABBR[`${t.city} ${t.name}`] || t.name.substring(0, 3).toUpperCase(),
    winPct:     t.wins / (t.wins + t.losses),
    confW: 0, confL: 0, confWinPct: 0,
  })), season, true);
}
