"use client";

import type { ReactNode } from "react";

export function DashboardReveal({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-reveal" data-ready="true">
      <div className="dashboard-reveal-content">
        {children}
      </div>
    </div>
  );
}
