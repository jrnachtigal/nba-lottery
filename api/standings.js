// api/standings.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  try {
    const response = await fetch(`http://site.api.espn.com/apis/v2/sports/basketball/nba/standings`);
    const data = await response.json();
    
    let allTeams = [];
    data.children.forEach(conf => {
      conf.standings.entries.forEach(entry => {
        const getStat = (n) => entry.stats.find(s => s.name === n)?.value || 0;
        allTeams.push({
          teamId: entry.team.id,
          name: entry.team.shortDisplayName,
          fullName: entry.team.displayName,
          abbr: entry.team.abbreviation,
          wins: getStat('wins'),
          losses: getStat('losses'),
          winPct: getStat('winPercent')
        });
      });
    });

    // 1. Get the 18 WORST records (ascending wins)
    allTeams.sort((a, b) => a.wins - b.wins || b.losses - a.losses);
    const bottom18 = allTeams.slice(0, 18);

    // 2. Slice into your 3 specific groups
    const g1Raw = bottom18.slice(0, 6);  // Worst 1-6
    const g2Raw = bottom18.slice(6, 12); // Worst 7-12
    const g3Raw = bottom18.slice(12, 18); // Worst 13-18

    // 3. INTERNAL SORT: Within each group, Best Record (most wins) is Rank 0
    const sortByBest = (a, b) => b.wins - a.wins || a.losses - b.losses;
    
    const finalTeams = [
      ...g1Raw.sort(sortByBest).map((t, i) => ({ ...t, group: 0, groupRank: i })),
      ...g2Raw.sort(sortByBest).map((t, i) => ({ ...t, group: 1, groupRank: i })),
      ...g3Raw.sort(sortByBest).map((t, i) => ({ ...t, group: 2, groupRank: i }))
    ];

    return res.status(200).json({ success: true, teams: finalTeams });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
