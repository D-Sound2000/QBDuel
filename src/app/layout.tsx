import type { Metadata } from "next";
import Link from "next/link";
import { RadioTower } from "lucide-react";
import { GradientBackground } from "@/components/ui/paper-design-shader-background";
import "./globals.css";

export const metadata: Metadata = {
  title: "QB Duel",
  description: "Ranked real-time 1v1 quiz bowl matches.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <GradientBackground />
          <div className="background-tint" aria-hidden="true" />
          <header className="container topbar">
            <Link className="brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                <RadioTower size={20} />
              </span>
              <span>
                <strong>QB</strong> <em>Duel</em>
              </span>
            </Link>
            <nav className="nav" aria-label="Primary navigation">
              <Link href="/">Lobby</Link>
              <Link href="/leaderboard">Leaderboard</Link>
              <Link href="/profile/dhruv">Profile</Link>
              <Link href="/matches/match-demo-001">Replay</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
