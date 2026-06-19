import { getMatch } from "@/lib/data";

function toneForDelta(delta: number) {
  if (delta > 0) return "tone-positive";
  if (delta < 0) return "tone-negative";
  return "";
}

function signed(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  const winner = match.winnerId === match.player1.id ? match.player1 : match.winnerId === match.player2.id ? match.player2 : null;

  return (
    <main className="broadsheet">
      <div className="container" style={{ paddingTop: 96 }}>
        <section className="section">
          <div className="section-header">
            <div className="eyebrow">Match review</div>
            <h1 className="page-title">
              {match.player1.username} {match.player1Score}-{match.player2Score} {match.player2.username}
            </h1>
            <p className="section-copy">{match.isDraw ? "Drawn match." : `${winner?.username ?? "Player"} won the duel.`}</p>
          </div>
          <div className="stats-line">
            <span>
              Difficulty <strong>{match.difficulty}</strong>
            </span>
            <span className="stat-divider">/</span>
            <span>
              Status <strong>{match.status}</strong>
            </span>
            <span className="stat-divider">/</span>
            <span>
              Tossups <strong>{match.tossups.length}</strong>
            </span>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div className="eyebrow">Tossup record</div>
            <h2 className="section-title">Buzz ledger</h2>
          </div>
          <div className="result-list">
            {match.tossups.map((result) => {
              const player =
                result.playerId === match.player1.id ? match.player1 : result.playerId === match.player2.id ? match.player2 : null;
              return (
                <div className="result-row" key={result.id}>
                  <span className="eyebrow">TU {result.order}</span>
                  <span>
                    <span className="result-outcome">{result.outcome}</span>
                    <span className="ledger-meta">
                      <span>{player?.username ?? "dead tossup"}</span>
                      <span>{result.buzzWordIndex === null ? "no buzz" : `word ${result.buzzWordIndex}`}</span>
                      {result.answerGiven ? <span>{result.answerGiven}</span> : null}
                    </span>
                  </span>
                  <span className={result.points >= 0 ? "tone-positive ledger-elo" : "tone-negative ledger-elo"}>{signed(result.points)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div className="eyebrow">Rating movement</div>
            <h2 className="section-title">ELO breakdown</h2>
          </div>
          <div className="rating-ledger">
            {match.ratingEvents.map((event) => {
              const player = event.playerId === match.player1.id ? match.player1 : match.player2;
              return (
                <div className="rating-row" key={event.playerId}>
                  <span className="ledger-name">{player.username}</span>
                  <span className="ledger-number">{event.before}</span>
                  <span>to</span>
                  <span className="ledger-number">{event.after}</span>
                  <span className={toneForDelta(event.delta)}>{signed(event.delta)} ELO</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
