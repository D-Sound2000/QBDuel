import Link from "next/link";
import type { MatchSummary } from "@/lib/domain/types";

function resultFor(match: MatchSummary, playerId?: string) {
  const targetId = playerId ?? match.player1.id;
  if (match.isDraw) return { label: "draw", className: "" };
  return match.winnerId === targetId ? { label: "win", className: "match-result-win" } : { label: "loss", className: "match-result-loss" };
}

function opponentFor(match: MatchSummary, playerId?: string) {
  const targetId = playerId ?? match.player1.id;
  return match.player1.id === targetId ? match.player2 : match.player1;
}

function scoreFor(match: MatchSummary, playerId?: string) {
  const targetId = playerId ?? match.player1.id;
  return match.player1.id === targetId ? `${match.player1Score}-${match.player2Score}` : `${match.player2Score}-${match.player1Score}`;
}

export function RecentMatches({ matches, playerId }: { matches: MatchSummary[]; playerId?: string }) {
  if (matches.length === 0) {
    return <p className="section-copy">No matches yet. Play a ranked duel to begin the ledger.</p>;
  }

  return (
    <div className="ledger-list">
      {matches.map((match) => {
        const result = resultFor(match, playerId);
        const opponent = opponentFor(match, playerId);

        return (
          <div className="match-ledger-row" key={match.id}>
            <span className="eyebrow">{new Date(match.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            <span>
              <span className="ledger-name">{opponent.username}</span>
              <span className="ledger-meta">
                <span className={result.className}>{result.label}</span>
                <span>{scoreFor(match, playerId)}</span>
              </span>
            </span>
            <Link className="replay-link" href={`/matches/${match.id}`}>
              View replay
            </Link>
          </div>
        );
      })}
    </div>
  );
}
