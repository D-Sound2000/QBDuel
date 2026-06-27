import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, BookOpenCheck, Dumbbell, LogIn, LogOut, Settings, Swords, Trophy, UserRound } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { CursorRisoTrail } from "@/components/cursor-riso-trail";
import { getCurrentProfile } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "QB Duel",
  description: "Ranked real-time 1v1 quiz bowl matches.",
};

const primaryActions = [
  { href: "/", label: "Play", icon: Swords },
  { href: "/practice", label: "Practice", icon: Dumbbell },
  { href: "/leaderboard", label: "Leaderboards", icon: Trophy },
] as const;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await getCurrentProfile();
  const secondaryActions = profile
    ? [
        { href: `/profile/${profile.username}`, label: "Profile", icon: UserRound },
        { href: `/profile/${profile.username}`, label: "Stats", icon: BarChart3 },
        { href: "/settings", label: "Settings", icon: Settings },
      ]
    : [{ href: "/sign-in", label: "Sign in", icon: LogIn }];

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="vignette" aria-hidden="true" />
        <CursorRisoTrail />
        <div className="app-shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <BookOpenCheck size={34} aria-hidden="true" />
              <span>
                <strong>QBDUEL</strong>
                <em>Reading room</em>
              </span>
            </Link>
            <nav className="nav" aria-label="Primary navigation">
              {primaryActions.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.href as never} key={item.label}>
                    <Icon size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {secondaryActions.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.href as never} key={item.label}>
                    <Icon size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="sidebar-footer">
              {profile ? (
                <>
                  <Link className="sidebar-profile" href={`/profile/${profile.username}`}>
                    <span className="profile-avatar" aria-hidden="true">
                      {profile.username.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <strong>{profile.username}</strong>
                      <small>{profile.tier} tier</small>
                    </span>
                  </Link>
                  <form action={signOut}>
                    <button className="sidebar-settings" type="submit" aria-label="Sign out">
                      <LogOut size={18} />
                    </button>
                  </form>
                </>
              ) : (
                <Link className="sidebar-profile" href="/sign-in">
                  <span className="profile-avatar" aria-hidden="true">
                    ?
                  </span>
                  <span>
                    <strong>Sign in</strong>
                    <small>Ranked play</small>
                  </span>
                </Link>
              )}
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
