import type { CSSProperties } from "react";
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

  return (
    <main className="broadsheet">
      <section className="hero-section">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Ranked 1v1 quiz bowl</span>
            <h1 className="hero-title" aria-label="Enter the reading room">
              {["Enter", "the", "reading", "room"].map((word, index) => (
                <span style={{ "--word-index": index } as CSSProperties} key={word}>
                  {word}
                </span>
              ))}
            </h1>
            <p className="hero-subhead">
              A midnight ladder for clean powers, disciplined buzzes, and tossups read under brass light.
            </p>
          </div>
          <DashboardMatchClient profile={profile} stats={stats} wsUrl={wsUrl} />
        </div>
      </section>

      <div className="container">
        <section className="section performance-section">
          <div className="section-header">
            <div className="eyebrow">Performance</div>
            <h2 className="section-title">The player ledger</h2>
          </div>
          <div className="stats-line" aria-label="Performance statistics">
            <span>
              Power <strong>{Math.round(stats.powerRate * 100)}%</strong>
            </span>
            <span className="stat-divider">/</span>
            <span>
              Neg <strong>{Math.round(stats.negRate * 100)}%</strong>
            </span>
            <span className="stat-divider">/</span>
            <span>
              Avg <strong>{stats.averageBuzzPosition}w</strong>
            </span>
          </div>
          <p className="section-copy">
            Rating movement is earned after each completed match. The current record is {stats.wins}-{stats.losses}
            {stats.draws > 0 ? `-${stats.draws}` : ""} across {profile.matchCount} ranked matches.
          </p>
        </section>

        <div className="content-grid">
          <section className="section">
            <div className="section-header">
              <div className="eyebrow">Match ledger</div>
              <h2 className="section-title">Recent matches</h2>
            </div>
            <RecentMatches matches={stats.recentMatches} playerId={profile.id} />
          </section>

          <aside className="section">
            <div className="section-header">
              <div className="eyebrow">Ranking</div>
              <h2 className="section-title">Leaderboard</h2>
            </div>
            <LeaderboardPreview entries={leaderboard.slice(0, 3)} currentUserId={profile.id} />
          </aside>
        </div>
      </div>
    </main>
  );
}
