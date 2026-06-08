import { Activity, BarChart3, Medal, Trophy } from "lucide-react";
import { DashboardMatchClient } from "@/components/dashboard-match-client";
import { LeaderboardPreview } from "@/components/leaderboard-preview";
import { RecentMatches } from "@/components/recent-matches";
import { getCurrentProfile, getLeaderboard, getProfileStats } from "@/lib/data";
import { wsUrl } from "@/lib/env";

export default async function HomePage() {
  const [profile, leaderboard, stats] = await Promise.all([
    getCurrentProfile(),
    getLeaderboard(),
    getProfileStats("dhruv"),
  ]);

  const placementRemaining = Math.max(0, 5 - profile.placementCount);

  return (
    <main className="container main-grid">
      <section className="match-room">
        <div className="panel panel--hero">
          <div className="panel-header">
            <div>
              <div className="kicker">Ranked lobby</div>
              <h1 className="title">Find a tossup duel.</h1>
              <p className="panel-copy">Server-clocked tossups, live buzz timing, and placement-safe ranked play.</p>
            </div>
            <span className="badge">{placementRemaining > 0 ? `${placementRemaining} placements left` : "Ranked ready"}</span>
          </div>
          <div className="panel-body">
            <DashboardMatchClient profile={profile} wsUrl={wsUrl} />
          </div>
        </div>
      </section>

      <aside className="match-room">
        <div className="panel panel--rating">
          <div className="panel-header">
            <div>
              <div className="kicker">Current rating</div>
              <h2 style={{ margin: 0 }}>{profile.username}</h2>
              <p className="panel-copy">Placement status and ladder standing.</p>
            </div>
            <Medal aria-hidden="true" color="var(--accent-bright)" />
          </div>
          <div className="panel-body">
            <div className="stat-grid">
              <div className="stat">
                <span>ELO</span>
                <strong>{profile.elo}</strong>
              </div>
              <div className="stat">
                <span>Tier</span>
                <strong>{profile.tier}</strong>
              </div>
              <div className="stat">
                <span>W/L</span>
                <strong>
                  {stats.wins}-{stats.losses}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="panel panel--wide">
          <div className="panel-header">
            <div>
              <div className="kicker">Form guide</div>
              <h2 style={{ margin: 0 }}>Performance</h2>
              <p className="panel-copy">Early buzz strength, risk, and average timing.</p>
            </div>
            <BarChart3 aria-hidden="true" color="var(--foe)" />
          </div>
          <div className="panel-body">
            <div className="stat-grid">
              <div className="stat">
                <span>Power rate</span>
                <strong>{Math.round(stats.powerRate * 100)}%</strong>
              </div>
              <div className="stat">
                <span>Neg rate</span>
                <strong>{Math.round(stats.negRate * 100)}%</strong>
              </div>
              <div className="stat">
                <span>Avg buzz</span>
                <strong>{stats.averageBuzzPosition}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="panel panel--leaderboard">
          <div className="panel-header">
            <div>
              <div className="kicker">Top table</div>
              <h2 style={{ margin: 0 }}>Leaderboard</h2>
            </div>
            <Trophy aria-hidden="true" color="var(--accent-bright)" />
          </div>
          <LeaderboardPreview entries={leaderboard.slice(0, 5)} />
        </div>

        <div className="panel panel--history">
          <div className="panel-header">
            <div>
              <div className="kicker">Ledger</div>
              <h2 style={{ margin: 0 }}>Recent matches</h2>
            </div>
            <Activity aria-hidden="true" color="var(--correct)" />
          </div>
          <RecentMatches matches={stats.recentMatches} />
        </div>
      </aside>
    </main>
  );
}
