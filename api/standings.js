export default async function handler(req, res) {
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
    teams = FALLBACK;
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
    success: true, season: SEASON,
    isFallback: teams === FALLBACK,
    lastUpdated: new Date().toISOString(),
    teams: lottery,
    tiedPairs: tiedPairs.map(([a, b]) => ({
      teamA: { teamId: a.teamId, fullName: a.fullName, abbr: a.abbr },
      teamB: { teamId: b.teamId, fullName: b.fullName, abbr: b.abbr },
    })),
  });
}

const FALLBACK = [
  {teamId:1610612754,city:'Indiana',     name:'Pacers',        abbr:'IND',fullName:'Indiana Pacers',        conf:'E',wins:17,losses:58,winPct:.227,confW:0,confL:0,confWinPct:0},
  {teamId:1610612764,city:'Washington',  name:'Wizards',       abbr:'WAS',fullName:'Washington Wizards',     conf:'E',wins:17,losses:58,winPct:.227,confW:0,confL:0,confWinPct:0},
  {teamId:1610612751,city:'Brooklyn',    name:'Nets',          abbr:'BKN',fullName:'Brooklyn Nets',          conf:'E',wins:18,losses:57,winPct:.240,confW:0,confL:0,confWinPct:0},
  {teamId:1610612758,city:'Sacramento',  name:'Kings',         abbr:'SAC',fullName:'Sacramento Kings',       conf:'W',wins:19,losses:57,winPct:.250,confW:0,confL:0,confWinPct:0},
  {teamId:1610612762,city:'Utah',        name:'Jazz',          abbr:'UTA',fullName:'Utah Jazz',              conf:'W',wins:21,losses:55,winPct:.276,confW:0,confL:0,confWinPct:0},
  {teamId:1610612742,city:'Dallas',      name:'Mavericks',     abbr:'DAL',fullName:'Dallas Mavericks',       conf:'W',wins:24,losses:51,winPct:.320,confW:0,confL:0,confWinPct:0},
  {teamId:1610612763,city:'Memphis',     name:'Grizzlies',     abbr:'MEM',fullName:'Memphis Grizzlies',      conf:'W',wins:25,losses:50,winPct:.333,confW:0,confL:0,confWinPct:0},
  {teamId:1610612740,city:'New Orleans', name:'Pelicans',      abbr:'NOP',fullName:'New Orleans Pelicans',   conf:'W',wins:25,losses:51,winPct:.329,confW:0,confL:0,confWinPct:0},
  {teamId:1610612741,city:'Chicago',     name:'Bulls',         abbr:'CHI',fullName:'Chicago Bulls',          conf:'E',wins:29,losses:46,winPct:.387,confW:0,confL:0,confWinPct:0},
  {teamId:1610612749,city:'Milwaukee',   name:'Bucks',         abbr:'MIL',fullName:'Milwaukee Bucks',        conf:'E',wins:29,losses:45,winPct:.392,confW:0,confL:0,confWinPct:0},
  {teamId:1610612744,city:'Golden State',name:'Warriors',      abbr:'GSW',fullName:'Golden State Warriors',  conf:'W',wins:36,losses:39,winPct:.480,confW:0,confL:0,confWinPct:0},
  {teamId:1610612757,city:'Portland',    name:'Trail Blazers', abbr:'POR',fullName:'Portland Trail Blazers', conf:'W',wins:38,losses:38,winPct:.500,confW:0,confL:0,confWinPct:0},
  {teamId:1610612766,city:'Charlotte',   name:'Hornets',       abbr:'CHA',fullName:'Charlotte Hornets',      conf:'E',wins:39,losses:36,winPct:.520,confW:0,confL:0,confWinPct:0},
  {teamId:1610612746,city:'LA',          name:'Clippers',      abbr:'LAC',fullName:'LA Clippers',            conf:'W',wins:39,losses:36,winPct:.520,confW:0,confL:0,confWinPct:0},
  {teamId:1610612748,city:'Miami',       name:'Heat',          abbr:'MIA',fullName:'Miami Heat',             conf:'E',wins:40,losses:36,winPct:.526,confW:0,confL:0,confWinPct:0},
  {teamId:1610612753,city:'Orlando',     name:'Magic',         abbr:'ORL',fullName:'Orlando Magic',          conf:'E',wins:39,losses:35,winPct:.527,confW:0,confL:0,confWinPct:0},
  {teamId:1610612755,city:'Philadelphia',name:'76ers',         abbr:'PHI',fullName:'Philadelphia 76ers',     conf:'E',wins:41,losses:34,winPct:.547,confW:0,confL:0,confWinPct:0},
  {teamId:1610612756,city:'Phoenix',     name:'Suns',          abbr:'PHX',fullName:'Phoenix Suns',           conf:'W',wins:42,losses:33,winPct:.560,confW:0,confL:0,confWinPct:0},
];
