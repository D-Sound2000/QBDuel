"use client";

import { GrainGradient } from "@paper-design/shaders-react";

export function GradientBackground() {
  return (
    <div className="paper-shader fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
      <GrainGradient
        style={{ height: "100%", width: "100%" }}
        colorBack="hsl(39, 22%, 4%)"
        softness={0.86}
        intensity={0.32}
        noise={0.14}
        shape="corners"
        offsetX={0.08}
        offsetY={-0.08}
        scale={1.04}
        rotation={8}
        speed={0.28}
        colors={["hsl(38, 94%, 48%)", "hsl(43, 92%, 62%)", "hsl(47, 86%, 76%)", "hsl(35, 88%, 58%)"]}
      />
    </div>
  );
}
