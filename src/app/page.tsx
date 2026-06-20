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
    <main className="broadsheet dashboard-page">
      <div className="container dashboard-bento">
        <section className="welcome-panel dashboard-card" aria-labelledby="dashboard-title">
          <span className="eyebrow">Ranked 1v1 quiz bowl</span>
          <h1 className="dashboard-title" id="dashboard-title">
            {["Welcome", "back,", profile.username].map((word, index) => (
              <span className="kinetic-word" style={{ "--word-index": index } as CSSProperties} key={word}>
                {word}
              </span>
            ))}
          </h1>
          <p className="hero-subhead">
            Pick up a live duel, sharpen categories in practice, or review the last few reads before climbing the ladder.
          </p>
          <div className="hero-metrics" aria-label="Player snapshot">
            <span>
              Rating <strong>{profile.elo}</strong>
            </span>
            <span>
              Record <strong>{stats.wins}-{stats.losses}</strong>
            </span>
            <span>
              Power <strong>{Math.round(stats.powerRate * 100)}%</strong>
            </span>
          </div>
        </section>

        <section className="play-bento-card" aria-label="Start a match">
          <DashboardMatchClient profile={profile} stats={stats} wsUrl={wsUrl} />
        </section>

        <section className="section performance-section dashboard-card">
          <div className="section-header">
            <div className="eyebrow">Performance</div>
            <h2 className="section-title">Today&apos;s form</h2>
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
            Rating movement is earned after each completed match. Current record: {stats.wins}-{stats.losses}
            {stats.draws > 0 ? `-${stats.draws}` : ""} across {profile.matchCount} ranked matches.
          </p>
        </section>

        <section className="section dashboard-card recent-matches-card" aria-labelledby="recent-matches-title">
          <div className="section-header">
            <div className="eyebrow">Recent Matches</div>
            <h2 className="section-title" id="recent-matches-title">
              Your last duels
            </h2>
          </div>
          <RecentMatches matches={stats.recentMatches} playerId={profile.id} />
        </section>

        <div className="side-stack bento-side-stack">
          <aside className="section dashboard-card tossup-card" aria-labelledby="tossup-title">
            <div className="section-header">
              <div className="eyebrow">Tossup of the Day</div>
              <h2 className="section-title" id="tossup-title">
                Literature
              </h2>
            </div>
            <p>
              Lily Briscoe paints; Clarissa Dalloway hosts a London party.
            </p>
            <div className="tossup-answer">
              <span>Answer</span>
              <strong>Virginia Woolf</strong>
            </div>
          </aside>

          <aside className="section dashboard-card leaderboard-card">
            <div className="section-header">
              <div className="eyebrow">Top ladder</div>
              <h2 className="section-title">Leaderboard</h2>
            </div>
            <LeaderboardPreview entries={leaderboard.slice(0, 3)} currentUserId={profile.id} />
          </aside>
        </div>
      </div>
    </main>
  );
}
