"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";

export function TossupOfDayButton({ clue }: { clue: string }) {
  const [reading, setReading] = useState(false);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const readTossup = () => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clue);
    utterance.rate = 0.92;
    utterance.pitch = 0.92;
    utterance.onend = () => setReading(false);
    utterance.onerror = () => setReading(false);
    setReading(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button className="tossup-read-button" type="button" onClick={readTossup} aria-pressed={reading}>
      <Volume2 size={16} aria-hidden="true" />
      <span>{reading ? "Reading..." : "Read tossup"}</span>
    </button>
  );
}
