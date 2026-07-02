import Link from "next/link";
import type { CSSProperties } from "react";
import type { LeaderboardEntry } from "@/lib/domain/types";

export function LeaderboardPreview({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId?: string }) {
  if (entries.length === 0) {
    return (
      <div className="empty-state empty-state-large">
        <strong>No ranked players yet.</strong>
        <span>Finish onboarding and play a match to seed the ladder.</span>
      </div>
    );
  }

  return (
    <div className="ledger-list">
      {entries.map((entry, index) => (
        <Link
          className="ledger-row leaderboard-row"
          data-current={entry.id === currentUserId}
          data-rank={entry.rank}
          href={`/profile/${entry.username}`}
          key={entry.id}
          style={{ "--row-index": index } as CSSProperties}
        >
          <span className="rank-number">{entry.rank}</span>
          <span>
            <span className="ledger-name">{entry.username}</span>
            <span className="ledger-meta">
              <span>{entry.tier}</span>
              <span>{entry.matchCount} matches</span>
              <span>{Math.round(entry.winRate * 100)}% win rate</span>
            </span>
          </span>
          <span className="ledger-elo">{entry.elo}</span>
        </Link>
      ))}
    </div>
  );
}
