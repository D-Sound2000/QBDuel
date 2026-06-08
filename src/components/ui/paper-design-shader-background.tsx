"use client";

import { GrainGradient } from "@paper-design/shaders-react";

export function GradientBackground() {
  return (
    <div
      className="absolute inset-0 -z-10"
      style={{
        background:
          "radial-gradient(120% 90% at 12% 12%, hsla(14, 100%, 57%, 0.72), transparent 45%), radial-gradient(120% 90% at 88% 10%, hsla(45, 100%, 51%, 0.55), transparent 45%), radial-gradient(140% 100% at 50% 100%, hsla(340, 82%, 52%, 0.5), transparent 50%), hsl(0, 0%, 0%)",
      }}
    >
      <GrainGradient
        style={{ height: "100%", width: "100%" }}
        colorBack="hsl(0, 0%, 0%)"
        softness={0.76}
        intensity={0.45}
        noise={0}
        shape="corners"
        offsetX={0}
        offsetY={0}
        scale={1}
        rotation={0}
        speed={1}
        colors={["hsl(14, 100%, 57%)", "hsl(45, 100%, 51%)", "hsl(340, 82%, 52%)"]}
      />
    </div>
  );
}
