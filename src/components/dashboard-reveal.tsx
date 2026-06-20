"use client";

import { useEffect, useState, type ReactNode } from "react";
import { InfinityLoader } from "@/components/ui/loader-13";

export function DashboardReveal({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setReady(true);
      return;
    }

    const id = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="dashboard-reveal" data-ready={ready}>
      <div className="dashboard-loader" aria-hidden={ready}>
        <InfinityLoader size={132} className="dashboard-infinity-loader" />
        <span className="loader-copy">Lighting the reading room</span>
      </div>
      <div className="dashboard-reveal-content" aria-hidden={!ready}>
        {children}
      </div>
    </div>
  );
}
