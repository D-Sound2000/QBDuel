import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, BookOpenCheck, Dumbbell, Settings, Swords, Trophy, UserRound, UsersRound } from "lucide-react";
import { CursorRisoTrail } from "@/components/cursor-riso-trail";
import { GradientBackground } from "@/components/ui/paper-design-shader-background";
import "./globals.css";

export const metadata: Metadata = {
  title: "QB Duel",
  description: "Ranked real-time 1v1 quiz bowl matches.",
};

const primaryActions = [
  { href: "/", label: "Play", icon: Swords },
  { href: "/matches/match-demo-001", label: "Practice", icon: Dumbbell },
  { href: "/leaderboard", label: "Leaderboards", icon: Trophy },
] as const;

const secondaryActions = [
  { href: "/profile/dhruv", label: "Profile", icon: UserRound },
  { href: "/profile/dhruv", label: "Stats", icon: BarChart3 },
  { href: "/", label: "Friends", icon: UsersRound },
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="vignette" aria-hidden="true" />
        <CursorRisoTrail />
        <div className="app-shell">
          <GradientBackground />
          <header className="topbar">
            <Link className="brand" href="/">
              <BookOpenCheck size={34} aria-hidden="true" />
              <span>
                <strong>QBDUEL</strong>
                <em>Reading room</em>
              </span>
            </Link>
            <nav className="nav" aria-label="Primary navigation">
              <span className="sidebar-label">Primary</span>
              {primaryActions.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.href} key={item.label}>
                    <Icon size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <span className="sidebar-label">Secondary</span>
              {secondaryActions.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.href} key={item.label}>
                    <Icon size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="sidebar-footer">
              <Link className="sidebar-profile" href="/profile/dhruv">
                <span className="profile-avatar" aria-hidden="true">
                  D
                </span>
                <span>
                  <strong>dhruv</strong>
                  <small>Gold tier</small>
                </span>
              </Link>
              <Link className="sidebar-settings" href="/profile/dhruv" aria-label="Settings">
                <Settings size={18} />
              </Link>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
