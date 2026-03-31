// api/standings.js
// Proxies NBA Stats API — returns lottery teams with tiebreak info + movement arrows
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  const SEASON = '2025-26';

  try {
    const url =
      `https://stats.nba.com/stats/leaguestandingsv3` +
      `?LeagueID=00&Season=${SEASON}&SeasonType=Regular+Season&SeasonYear=${SEASON}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.nba.com',
        'Referer': 'https://www.nba.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'x-nba-stats-origin': 'stats',
        'x-nba-stats-token': 'true',
      },
    });

    if (!response.ok) throw new Error(`NBA API ${response.status}`);

    const data = await response.json();
    const rs = data.resultSets[0];
    const headers = rs.headers;
    const rows = rs.rowSet;

    const col = (name) => headers.indexOf(name);
    const TEAM_ID   = col('TeamID');
    const CITY      = col('TeamCity');
    const NAME      = col('TeamName');
    const WINS      = col('WINS');
    const LOSSES    = col('LOSSES');
    const WIN_PCT   = col('WinPCT');
    const CONF      = col('Conference');
    const CONF_REC  = col('ConferenceRecord');

    // Build raw team list sorted worst→best record
    const teams = rows.map(row => {
      const confParts = (row[CONF_REC] || '0-0').split('-');
      const cw = parseInt(confParts[0]) || 0;
      const cl = parseInt(confParts[1]) || 0;
      return {
        teamId:      row[TEAM_ID],
        city:        row[CITY],
        name:        row[NAME],
        fullName:    `${row[CITY]} ${row[NAME]}`,
        abbr:        abbr(`${row[CITY]} ${row[NAME]}`),
        wins:        row[WINS],
        losses:      row[LOSSES],
        winPct:      row[WIN_PCT],
        conf:        row[CONF] === 'East' ? 'E' : 'W',
        confW: cw, confL: cl,
        confWinPct:  cw + cl > 0 ? cw / (cw + cl) : 0,
      };
    });

    // Sort: most losses first, then fewest wins
    teams.sort((a, b) => {
      if (b.losses !== a.losses) return b.losses - a.losses;
      return a.wins - b.wins;
    });

    // Lottery = bottom 18
    const lottery = teams.slice(0, 18);

    // Pure record-based rank (before tiebreaks) — used for movement arrows
    // We store the raw sort position as "recordRank" so after H2H tiebreaks
    // we can compare to final groupRank and show ↑ / ↓ / —
    const withRanks = lottery.map((t, i) => ({
      ...t,
      recordRank: i,           // 0 = worst record (1 ball if no tiebreak)
      group:      Math.floor(i / 6),
      groupRank:  i % 6,       // 0 = worst in group, 5 = best in group
      ballCount:  (i % 6) + 1,
    }));

    // Detect tied pairs
    const tiedPairs = [];
    for (let i = 0; i < withRanks.length - 1; i++) {
      const a = withRanks[i];
      const b = withRanks[i + 1];
      if (a.wins === b.wins && a.losses === b.losses) {
        const seen = tiedPairs.some(
          p => p[0].teamId === a.teamId || p[0].teamId === b.teamId ||
               p[1].teamId === a.teamId || p[1].teamId === b.teamId
        );
        if (!seen) tiedPairs.push([a, b]);
      }
    }

    return res.status(200).json({
      success: true,
      season: SEASON,
      lastUpdated: new Date().toISOString(),
      teams: withRanks,
      tiedPairs: tiedPairs.map(([a, b]) => ({
        teamA: { teamId: a.teamId, fullName: a.fullName, abbr: a.abbr },
        teamB: { teamId: b.teamId, fullName: b.fullName, abbr: b.abbr },
      })),
    });

  } catch (err) {
    console.error('Standings error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

function abbr(fullName) {
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
