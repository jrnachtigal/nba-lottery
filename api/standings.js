// api/standings.js
// Tries two NBA endpoints. If both fail, returns hardcoded fallback standings
// so the app always loads successfully.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  const SEASON = '2025-26';

  // NBA requests need to look exactly like a real browser or they get blocked
  const NBA_HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Host': 'stats.nba.com',
    'Origin': 'https://www.nba.com',
    'Pragma': 'no-cache',
    'Referer': 'https://www.nba.com/',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'x-nba-stats-origin': 'stats',
    'x-nba-stats-token': 'true',
  };

  // Attempt 1: leaguestandingsv3
  try {
    const url = `https://stats.nba.com/stats/leaguestandingsv3?LeagueID=00&Season=${SEASON}&SeasonType=Regular+Season&SeasonYear=${SEASON}`;
    const response = await fetch(url, { headers: NBA_HEADERS });
    if (response.ok) {
      const data = await response.json();
      const result = parseStandings(data, SEASON);
      if (result) return res.status(200).json(result);
    }
  } catch (e) {
    console.warn('Attempt 1 failed:', e.message);
  }

  // Attempt 2: older leaguestandings endpoint
  try {
    const url = `https://stats.nba.com/stats/leaguestandings?LeagueID=00&Season=${SEASON}&SeasonType=Regular+Season`;
    const response = await fetch(url, { headers: NBA_HEADERS });
    if (response.ok) {
      const data = await response.json();
      const result = parseStandings(data, SEASON);
      if (result) return res.status(200).json(result);
    }
  } catch (e) {
    console.warn('Attempt 2 failed:', e.message);
  }

  // Fallback: hardcoded standings — app always works even if NBA API is down
  console.log('Both NBA API attempts failed — returning hardcoded fallback');
  return res.status(200).json(buildFallback(SEASON));
}

function parseStandings(data, season) {
  try {
    const rs = data.resultSets[0];
    const headers = rs.headers;
    const rows = rs.rowSet;
    if (!rows || rows.length === 0) return null;

    const col = n => headers.indexOf(n);
    const TEAM_ID  = col('TeamID');
    const CITY     = col('TeamCity');
    const NAME     = col('TeamName');
    const WINS     = col('WINS');
    const LOSSES   = col('LOSSES');
    const WIN_PCT  = col('WinPCT');
    const CONF     = col('Conference');
    const CONF_REC = col('ConferenceRecord');

    const teams = rows.map(row => {
      const cp = (row[CONF_REC] || '0-0').split('-');
      const cw = parseInt(cp[0]) || 0;
      const cl = parseInt(cp[1]) || 0;
      return {
        teamId:     row[TEAM_ID],
        city:       row[CITY],
        name:       row[NAME],
        fullName:   `${row[CITY]} ${row[NAME]}`,
        abbr:       teamAbbr(`${row[CITY]} ${row[NAME]}`),
        wins:       row[WINS],
        losses:     row[LOSSES],
        winPct:     row[WIN_PCT],
        conf:       row[CONF] === 'East' ? 'E' : 'W',
        confW: cw, confL: cl,
        confWinPct: cw + cl > 0 ? cw / (cw + cl) : 0,
      };
    });

    return buildResponse(teams, season, false);
  } catch (e) {
    console.warn('Parse failed:', e.message);
    return null;
  }
}

function buildResponse(teams, season, isFallback) {
  teams.sort((a, b) => b.losses !== a.losses ? b.losses - a.losses : a.wins - b.wins);

  const lottery = teams.slice(0, 18).map((t, i) => ({
    ...t,
    recordRank: i,
    group:      Math.floor(i / 6),
    groupRank:  i % 6,
    ballCount:  (i % 6) + 1,
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
    success: true,
    season,
    isFallback,
    lastUpdated: new Date().toISOString(),
    teams: lottery,
    tiedPairs: tiedPairs.map(([a, b]) => ({
      teamA: { teamId: a.teamId, fullName: a.fullName, abbr: a.abbr },
      teamB: { teamId: b.teamId, fullName: b.fullName, abbr: b.abbr },
    })),
  };
}

// Hardcoded fallback — update wins/losses periodically to keep current
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

  const teams = raw.map(t => ({
    ...t,
    fullName:   `${t.city} ${t.name}`,
    abbr:       teamAbbr(`${t.city} ${t.name}`),
    winPct:     t.wins / (t.wins + t.losses),
    confW: 0, confL: 0, confWinPct: 0,
  }));

  return buildResponse(teams, season, true);
}

function teamAbbr(fullName) {
  const map = {
    'Atlanta Hawks':'ATL','Boston Celtics':'BOS','Brooklyn Nets':'BKN',
    'Charlotte Hornets':'CHA','Chicago Bulls':'CHI','Cleveland Cavaliers':'CLE',
    'Dallas Mavericks':'DAL','Denver Nuggets':'DEN','Detroit Pistons':'DET',
    'Golden State Warriors':'GSW','Houston Rockets':'HOU','Indiana Pacers':'IND',
    'LA Clippers':'LAC','Los Angeles Lakers':'LAL','Memphis Grizzlies':'MEM',
    'Miami Heat':'MIA','Milwaukee Bucks':'MIL','Minnesota Timberwolves':'MIN',
    'New Orleans Pelicans':'NOP','New York Knicks':'NYK','Oklahoma City Thunder':'OKC',
    'Orlando Magic':'ORL','Philadelphia 76ers':'PHI','Phoenix Suns':'PHX',
    'Portland Trail Blazers':'POR','Sacramento Kings':'SAC','San Antonio Spurs':'SAS',
    'Toronto Raptors':'TOR','Utah Jazz':'UTA','Washington Wizards':'WAS',
  };
  return map[fullName] || fullName.substring(0, 3).toUpperCase();
}
