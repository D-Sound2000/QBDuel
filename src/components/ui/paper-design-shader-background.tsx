"use client";

import { useEffect, useState } from "react";
import { GrainGradient } from "@paper-design/shaders-react";

export function GradientBackground() {
  const [renderShader, setRenderShader] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setRenderShader(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div
      className="paper-shader fixed inset-0 -z-10 pointer-events-none"
      style={{
        background:
          "radial-gradient(110% 80% at 18% 8%, hsla(44, 58%, 60%, 0.54), transparent 44%), radial-gradient(95% 76% at 78% 18%, hsla(50, 62%, 70%, 0.32), transparent 46%), radial-gradient(130% 90% at 48% 100%, hsla(42, 46%, 36%, 0.4), transparent 55%), hsl(40, 14%, 4%)",
      }}
    >
      {renderShader ? (
        <GrainGradient
          style={{ height: "100%", width: "100%" }}
          colorBack="hsl(40, 14%, 4%)"
          softness={0.78}
          intensity={0.38}
          noise={0}
          shape="corners"
          offsetX={0}
          offsetY={0}
          scale={1}
          rotation={0}
          speed={0.12}
          colors={["hsl(44, 58%, 60%)", "hsl(50, 62%, 70%)", "hsl(42, 46%, 36%)"]}
        />
      ) : null}
    </div>
  );
}
