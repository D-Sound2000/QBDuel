import { LeaderboardPreview } from "@/components/leaderboard-preview";
import { getCurrentProfile, getLeaderboard } from "@/lib/data";

export default async function LeaderboardPage() {
  const [entries, profile] = await Promise.all([getLeaderboard(), getCurrentProfile()]);

  return (
    <main className="broadsheet">
      <div className="container" style={{ paddingTop: 120 }}>
        <section className="section">
          <div className="section-header">
            <div className="section-kicker">Ranked list</div>
            <h1 className="page-title">Leaderboard</h1>
            <p className="section-copy">The current order of QB Duel players, set by ELO and recorded match results.</p>
          </div>
          <LeaderboardPreview entries={entries} currentUserId={profile?.id} />
        </section>
      </div>
    </main>
  );
}
