"use client";

import { GrainGradient } from "@paper-design/shaders-react";

export function GradientBackground() {
  return (
    <div className="paper-shader fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
      <GrainGradient
        style={{ height: "100%", width: "100%" }}
        colorBack="hsl(39, 22%, 4%)"
        softness={0.9}
        intensity={0.2}
        noise={0.12}
        shape="corners"
        offsetX={0.08}
        offsetY={-0.08}
        scale={1.04}
        rotation={8}
        speed={0.14}
        colors={["hsl(43, 60%, 50%)", "hsl(45, 68%, 62%)", "hsl(47, 72%, 72%)", "hsl(40, 52%, 42%)"]}
      />
    </div>
  );
}
