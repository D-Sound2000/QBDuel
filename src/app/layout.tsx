import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { GradientBackground } from "@/components/ui/paper-design-shader-background";
import "./globals.css";

export const metadata: Metadata = {
  title: "QB Duel",
  description: "Ranked real-time 1v1 quiz bowl matches.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script
          id="strip-extension-hydration-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  const strip = (root = document) => {
    root.querySelectorAll?.("[bis_skin_checked]").forEach((node) => {
      for (const attr of [...node.attributes]) {
        if (attr.name.startsWith("bis_")) node.removeAttribute(attr.name);
      }
    });
  };
  strip();
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName?.startsWith("bis_")) {
        mutation.target.removeAttribute(mutation.attributeName);
      }
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) strip(node);
      }
    }
  }).observe(document.documentElement, { attributes: true, childList: true, subtree: true });
})();
            `.trim(),
          }}
        />
        <div className="vignette" aria-hidden="true" />
        <div className="app-shell">
          <GradientBackground />
          <header className="container topbar">
            <Link className="brand" href="/">
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
