import { notFound } from "next/navigation";
import { getProfileStats } from "@/lib/data";
import { RecentMatches } from "@/components/recent-matches";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const stats = await getProfileStats(username);
  if (!stats.profile) notFound();

  return (
    <main className="container main-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="kicker">Player profile</div>
            <h1 style={{ margin: 0 }}>{stats.profile.username}</h1>
          </div>
          <span className="badge">{stats.profile.tier}</span>
        </div>
        <div className="panel-body">
          <div className="stat-grid">
            <div className="stat">
              <span>ELO</span>
              <strong>{stats.profile.elo}</strong>
            </div>
            <div className="stat">
              <span>Record</span>
              <strong>
                {stats.wins}-{stats.losses}-{stats.draws}
              </strong>
            </div>
            <div className="stat">
              <span>Win rate</span>
              <strong>{Math.round(stats.winRate * 100)}%</strong>
            </div>
            <div className="stat">
              <span>Avg buzz</span>
              <strong>{stats.averageBuzzPosition}</strong>
            </div>
            <div className="stat">
              <span>Power rate</span>
              <strong>{Math.round(stats.powerRate * 100)}%</strong>
            </div>
            <div className="stat">
              <span>Neg rate</span>
              <strong>{Math.round(stats.negRate * 100)}%</strong>
            </div>
          </div>
        </div>
      </section>
      <aside className="panel">
        <div className="panel-header">
          <h2 style={{ margin: 0 }}>Recent matches</h2>
          <span className="badge">{stats.profile.matchCount} played</span>
        </div>
        <RecentMatches matches={stats.recentMatches} />
      </aside>
    </main>
  );
}
