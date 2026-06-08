import Link from "next/link";
import type { MatchSummary } from "@/lib/domain/types";

export function RecentMatches({ matches }: { matches: MatchSummary[] }) {
  return (
    <div className="panel-body" style={{ paddingTop: 0 }}>
      <table className="table">
        <thead>
          <tr>
            <th>Opponent</th>
            <th>Score</th>
            <th>Replay</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr key={match.id}>
              <td>{match.player2.username}</td>
              <td>
                {match.player1Score}-{match.player2Score}
              </td>
              <td>
                <Link href={`/matches/${match.id}`}>Open</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
