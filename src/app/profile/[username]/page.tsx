import { notFound } from "next/navigation";
import { RecentMatches } from "@/components/recent-matches";
import { getProfileStats } from "@/lib/data";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const stats = await getProfileStats(username);
  if (!stats.profile) notFound();

  return (
    <main className="broadsheet">
      <div className="container" style={{ paddingTop: 96 }}>
        <section className="section">
          <div className="profile-masthead">
            <div>
              <div className="eyebrow">Player profile</div>
              <h1 className="profile-name">{stats.profile.username}</h1>
            </div>
            <div className="stats-line">
              <span>
                ELO <strong>{stats.profile.elo}</strong>
              </span>
              <span className="stat-divider">/</span>
              <span>
                Tier <strong>{stats.profile.tier}</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div className="eyebrow">Performance</div>
            <h2 className="section-title">Ranked form</h2>
          </div>
          <div className="stats-line">
            <span>
              Record <strong>{stats.wins}-{stats.losses}-{stats.draws}</strong>
            </span>
            <span className="stat-divider">/</span>
            <span>
              Win rate <strong>{Math.round(stats.winRate * 100)}%</strong>
            </span>
            <span className="stat-divider">/</span>
            <span>
              Power <strong>{Math.round(stats.powerRate * 100)}%</strong>
            </span>
            <span className="stat-divider">/</span>
            <span>
              Neg <strong>{Math.round(stats.negRate * 100)}%</strong>
            </span>
            <span className="stat-divider">/</span>
            <span>
              Avg buzz <strong>{stats.averageBuzzPosition}w</strong>
            </span>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div className="eyebrow">{stats.profile.matchCount} matches played</div>
            <h2 className="section-title">Match ledger</h2>
          </div>
          <RecentMatches matches={stats.recentMatches} playerId={stats.profile.id} />
        </section>
      </div>
    </main>
  );
}
