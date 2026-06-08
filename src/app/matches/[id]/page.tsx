import { getMatch } from "@/lib/data";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);

  return (
    <main className="container" style={{ padding: "28px 0" }}>
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="kicker">Match replay</div>
            <h1 style={{ margin: 0 }}>
              {match.player1.username} {match.player1Score}-{match.player2Score} {match.player2.username}
            </h1>
          </div>
          <span className="badge">{match.isDraw ? "Draw" : `${match.winnerId === match.player1.id ? match.player1.username : match.player2.username} won`}</span>
        </div>
        <div className="panel-body">
          <div className="result-grid">
            {match.tossups.map((result) => (
              <div className="result-tile" key={result.id}>
                <div className="kicker">Tossup {result.order}</div>
                <strong>{result.outcome}</strong>
                <p style={{ color: "var(--muted)" }}>
                  {result.points > 0 ? "+" : ""}
                  {result.points} at word {result.buzzWordIndex ?? "end"}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="panel-header">
          <h2 style={{ margin: 0 }}>ELO breakdown</h2>
        </div>
        <div className="panel-body" style={{ paddingTop: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Before</th>
                <th>After</th>
                <th>Delta</th>
                <th>Modifiers</th>
              </tr>
            </thead>
            <tbody>
              {match.ratingEvents.map((event) => {
                const player = event.playerId === match.player1.id ? match.player1 : match.player2;
                return (
                  <tr key={event.playerId}>
                    <td>{player.username}</td>
                    <td>{event.before}</td>
                    <td>{event.after}</td>
                    <td>{event.delta > 0 ? `+${event.delta}` : event.delta}</td>
                    <td>{event.modifiers.join(", ") || "base"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
