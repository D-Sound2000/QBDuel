"use client";

import { useEffect } from "react";

export function CursorRisoTrail() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    let lastDotAt = 0;
    let dotIndex = 0;

    const handlePointerMove = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastDotAt < 28) return;
      lastDotAt = now;

      const dot = document.createElement("span");
      const spread = 8;
      const offsetX = ((dotIndex * 7) % spread) - spread / 2;
      const offsetY = ((dotIndex * 11) % spread) - spread / 2;

      dot.className = "riso-cursor-dot";
      dot.style.left = `${event.clientX + offsetX}px`;
      dot.style.top = `${event.clientY + offsetY}px`;
      dot.style.setProperty("--dot-size", `${7 + (dotIndex % 3) * 3}px`);
      dotIndex += 1;

      document.body.appendChild(dot);
      window.setTimeout(() => dot.remove(), 760);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return null;
}
