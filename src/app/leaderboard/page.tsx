import { Trophy } from "lucide-react";
import { getLeaderboard } from "@/lib/data";

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  return (
    <main className="container" style={{ padding: "28px 0" }}>
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="kicker">Global top 100</div>
            <h1 style={{ margin: 0 }}>Leaderboard</h1>
          </div>
          <Trophy aria-hidden="true" color="var(--gold)" />
        </div>
        <div className="panel-body" style={{ paddingTop: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Tier</th>
                <th>ELO</th>
                <th>Matches</th>
                <th>Win rate</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>#{entry.rank}</td>
                  <td>{entry.username}</td>
                  <td>{entry.tier}</td>
                  <td>{entry.elo}</td>
                  <td>{entry.matchCount}</td>
                  <td>{Math.round(entry.winRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
