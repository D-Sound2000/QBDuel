import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/domain/types";

export function LeaderboardPreview({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="panel-body" style={{ paddingTop: 0 }}>
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>ELO</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>#{entry.rank}</td>
              <td>
                <Link href={`/profile/${entry.username}`}>{entry.username}</Link>
              </td>
              <td>{entry.elo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
