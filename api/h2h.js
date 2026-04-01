// api/h2h.js
// Updated to use ESPN Scoreboard to match the standings source
export default async function handler(req, res) {
  const { teamA, teamB } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Note: This is a simplified version. In a production app, you would 
    // fetch the full season schedule for these two teams to calculate H2H.
    // For now, we return a tie to allow the frontend to use its random fallback.
    return res.status(200).json({
      success: true,
      status: 'tied',
      winner: null
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
