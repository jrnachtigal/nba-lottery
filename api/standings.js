module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  const SEASON = '2025-26';
  let teams = [];

  try {
    const r = await fetch('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    if (r.ok) {
      const d = await r.json();
      for (const group of (d.children || [])) {
        const conf = (group.name || '').toLowerCase().includes('east') ? 'E' : 'W';
        for (const entry of (group.standings?.entries || [])) {
          const t = entry.team || {};
          const stats = Object.fromEntries((entry.stats || []).map(s => [s.name, s.value]));
          const wins = Math.round(stats.wins ?? 0);
          const losses = Math.round(stats.losses ?? 0);
          if (!t.displayName || wins + losses === 0) continue;
          teams.push({
            teamId: parseInt(t.id) || 0,
            fullName: t.displayName,
            city: t.location || '',
            name: t.name || '',
            abbr: t.abbreviation || '',
            wins, losses,
            winPct: wins / (wins + losses),
            conf, confW: 0, confL: 0, confWinPct: 0,
          });
        }
      }
    }
  } catch (e) {
    console.warn('ESPN failed:', e.message);
  }

  if (teams.length < 18) {
    teams = [
      {teamId:1610612754,fullName:'Indiana Pacers',        city:'Indiana',     name:'Pacers',        abbr:'IND',conf:'E',wins:17,losses:58,winPct:.227,confW:0,confL:0,confWinPct:0},
      {teamId:1610612764,fullName:'Washington Wizards',    city:'Washington',  name:'Wizards',       abbr:'WAS',conf:'E',wins:17,losses:58,winPct:.227,confW:0,confL:0,confWinPct:0},
      {teamId:1610612751,fullName:'Brooklyn Nets',         city:'Brooklyn',    name:'Nets',          abbr:'BKN',conf:'E',wins:18,losses:57,winPct:.240,confW:0,confL:0,confWinPct:0},
      {teamId:1610612758,fullName:'Sacramento Kings',      city:'Sacramento',  name:'Kings',         abbr:'SAC',conf:'W',wins:19,losses:57,winPct:.250,confW:0,confL:0,confWinPct:0},
      {teamId:1610612762,fullName:'Utah Jazz',             city:'Utah',        name:'Jazz',          abbr:'UTA',conf:'W',wins:21,losses:55,winPct:.276,confW:0,confL:0,confWinPct:0},
      {teamId:1610612742,fullName:'Dallas Mavericks',      city:'Dallas',      name:'Mavericks',     abbr:'DAL',conf:'W',wins:24,losses:51,winPct:.320,confW:0,confL:0,confWinPct:0},
      {teamId:1610612763,fullName:'Memphis Grizzlies',     city:'Memphis',     name:'Grizzlies',     abbr:'MEM',conf:'W',wins:25,losses:50,winPct:.333,confW:0,confL:0,confWinPct:0},
      {teamId:1610612740,fullName:'New Orleans Pelicans',  city:'New Orleans', name:'Pelicans',      abbr:'NOP',conf:'W',wins:25,losses:51,winPct:.329,confW:0,confL:0,confWinPct:0},
      {teamId:1610612741,fullName:'Chicago Bulls',         city:'Chicago',     name:'Bulls',         abbr:'CHI',conf:'E',wins:29,losses:46,winPct:.387,confW:0,confL:0,confWinPct:0},
      {teamId:1610612749,fullName:'Milwaukee Bucks',       city:'Milwaukee',   name:'Bucks',         abbr:'MIL',conf:'E',wins:29,losses:45,winPct:.392,confW:0,confL:0,confWinPct:0},
      {teamId:1610612744,fullName:'Golden State Warriors', city:'Golden State',name:'Warriors',      abbr:'GSW',conf:'W',wins:36,losses:39,winPct:.480,confW:0,confL:0,confWinPct:0},
      {teamId:1610612757,fullName:'Portland Trail Blazers',city:'Portland',    name:'Trail Blazers', abbr:'POR',conf:'W',wins:38,losses:38,winPct:.500,confW:0,confL:0,confWinPct:0},
      {teamId:1610612766,fullName:'Charlotte Hornets',     city:'Charlotte',   name:'Hornets',       abbr:'CHA',conf:'E',wins:39,losses:36,winPct:.520,confW:0,confL:0,confWinPct:0},
      {teamId:1610612746,fullName:'LA Clippers',           city:'LA',          name:'Clippers',      abbr:'LAC',conf:'W',wins:39,losses:36,winPct:.520,confW:0,confL:0,confWinPct:0},
      {teamId:1610612748,fullName:'Miami Heat',            city:'Miami',       name:'Heat',          abbr:'MIA',conf:'E',wins:40,losses:36,winPct:.526,confW:0,confL:0,confWinPct:0},
      {teamId:1610612753,fullName:'Orlando Magic',         city:'Orlando',     name:'Magic',         abbr:'ORL',conf:'E',wins:39,losses:35,winPct:.527,confW:0,confL:0,confWinPct:0},
      {teamId:1610612755,fullName:'Philadelphia 76ers',    city:'Philadelphia',name:'76ers',         abbr:'PHI',conf:'E',wins:41,losses:34,winPct:.547,confW:0,confL:0,confWinPct:0},
      {teamId:1610612756,fullName:'Phoenix Suns',          city:'Phoenix',     name:'Suns',          abbr:'PHX',conf:'W',wins:42,losses:33,winPct:.560,confW:0,confL:0,confWinPct:0},
    ];
  }

  teams.sort((a, b) => b.losses !== a.losses ? b.losses - a.losses : a.wins - b.wins);

  const lottery = teams.slice(0, 18).map((t, i) => ({
    ...t,
    recordRank: i,
    group: Math.floor(i / 6),
    groupRank: 5 - (i % 6),
    ballCount: 5 - (i % 6) + 1,
  }));

  const tiedPairs = [];
  for (let i = 0; i < lottery.length - 1; i++) {
    const a = lottery[i], b = lottery[i + 1];
    if (a.wins === b.wins && a.losses === b.losses) {
      const seen = tiedPairs.some(p =>
        p[0].teamId === a.teamId || p[0].teamId === b.teamId ||
        p[1].teamId === a.teamId || p[1].teamId === b.teamId
      );
      if (!seen) tiedPairs.push([a, b]);
    }
  }

  return res.status(200).json({
    success: true, season: SEASON, isFallback: teams.length === 18 && teams[0].wins === 17,
    lastUpdated: new Date().toISOString(),
    teams: lottery,
    tiedPairs: tiedPairs.map(([a, b]) => ({
      teamA: { teamId: a.teamId, fullName: a.fullName, abbr: a.abbr },
      teamB: { teamId: b.teamId, fullName: b.fullName, abbr: b.abbr },
    })),
  });
};
