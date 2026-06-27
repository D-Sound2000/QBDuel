"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Clock, Pause, Play, RotateCcw, Swords } from "lucide-react";
import { defaultReadingWpm, readingWpmOptions, wordDelayMsForWpm } from "@/lib/domain/match-config";
import type { AnswerJudgment, Tossup } from "@/lib/domain/types";

export function PracticeClient({ initialTossups, mode = "practice" }: { initialTossups: Tossup[]; mode?: "practice" | "daily" }) {
  const [tossups, setTossups] = useState(initialTossups);
  const [index, setIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [reading, setReading] = useState(false);
  const [readingWpm, setReadingWpm] = useState(defaultReadingWpm);
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("Choose a speed, start the reader, and buzz when you know it.");
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const tossup = tossups[index];
  const visibleWords = useMemo(() => tossup?.words.slice(0, wordIndex + 1) ?? [], [tossup, wordIndex]);
  const delayMs = wordDelayMsForWpm(readingWpm);
  const complete = Boolean(tossup && wordIndex >= tossup.words.length - 1);

  useEffect(() => {
    if (!reading || answering || !tossup) return;
    if (wordIndex >= tossup.words.length - 1) {
      setReading(false);
      setMessage("Tossup fully read. Buzz or move to the next tossup.");
      return;
    }

    const id = window.setTimeout(() => setWordIndex((current) => Math.min(tossup.words.length - 1, current + 1)), delayMs);
    return () => window.clearTimeout(id);
  }, [answering, delayMs, reading, tossup, wordIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || answering || !tossup) return;
      event.preventDefault();
      buzz();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const startReading = () => {
    if (!tossup) return;
    if (complete) setWordIndex(0);
    setAnswering(false);
    setReading(true);
    setMessage(`Reading at ${readingWpm} WPM.`);
  };

  const pauseReading = () => {
    setReading(false);
    setMessage("Reader paused.");
  };

  const buzz = () => {
    if (!tossup) return;
    setReading(false);
    setAnswering(true);
    setMessage("Answer line open.");
  };

  const resetTossup = () => {
    setReading(false);
    setAnswering(false);
    setAnswer("");
    setWordIndex(0);
    setMessage("Tossup reset.");
  };

  const nextTossup = () => {
    setIndex((current) => Math.min(tossups.length - 1, current + 1));
    setWordIndex(0);
    setReading(false);
    setAnswering(false);
    setAnswer("");
    setMessage("Next tossup loaded.");
  };

  const reloadPractice = async () => {
    setLoading(true);
    try {
      const response = await fetch(mode === "daily" ? "/api/tossup-of-day" : "/api/practice", { cache: "no-store" });
      const payload = (await response.json()) as { tossups?: Tossup[]; tossup?: Tossup };
      const nextTossups = payload.tossups ?? (payload.tossup ? [payload.tossup] : []);
      if (nextTossups.length > 0) {
        setTossups(nextTossups);
        setIndex(0);
        setWordIndex(0);
        setReading(false);
        setAnswering(false);
        setAnswer("");
        setScore(0);
        setMessage(mode === "daily" ? "Daily tossup reloaded." : "New practice set loaded.");
      }
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tossup || !answer.trim()) return;

    const response = await fetch("/api/check-answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer: answer.trim(), answerLine: tossup.answerLine }),
    });
    const payload = (await response.json()) as { judgment: AnswerJudgment };

    if (payload.judgment === "correct") {
      const points = wordIndex < tossup.powerMarkIndex ? 15 : 10;
      setScore((current) => current + points);
      setMessage(`Correct: ${tossup.answer}.`);
    } else if (payload.judgment === "prompt") {
      setMessage("Prompt. Add more detail.");
      return;
    } else {
      setScore((current) => current - 5);
      setMessage(`Incorrect. Answer: ${tossup.answer}.`);
    }

    setReading(false);
    setAnswering(false);
    setAnswer("");
    setWordIndex(tossup.words.length - 1);
  };

  if (!tossup) {
    return (
      <section className="section">
        <div className="empty-state">
          <strong>No tossups loaded.</strong>
          <span>QBReader may be slow. Try loading again.</span>
        </div>
        <button className="primary-button" type="button" onClick={reloadPractice} disabled={loading}>
          {loading ? "Loading..." : "Load tossups"}
        </button>
      </section>
    );
  }

  return (
    <section className="match-stage practice-stage" aria-label={mode === "daily" ? "Daily tossup reader" : "Solo practice"}>
      <div className="match-topline">
        <span>{tossup.category} / difficulty {tossup.difficulty}</span>
        <span>TU {index + 1} / {tossups.length}</span>
        <span>{readingWpm} WPM / Score {score}</span>
      </div>
      <div className="reader-toolbar" aria-label="Reader controls">
        <div className="reader-speed-controls" aria-label="Reading speed">
          {readingWpmOptions.map((option) => (
            <button className="speed-chip" data-active={readingWpm === option} type="button" key={option} onClick={() => setReadingWpm(option)}>
              {option} WPM
            </button>
          ))}
        </div>
        <div className="flow-actions">
          <button className="primary-button" type="button" onClick={reading ? pauseReading : startReading}>
            {reading ? <Pause size={16} /> : <Play size={16} />}
            {reading ? "Pause" : complete ? "Restart read" : "Start read"}
          </button>
          <button className="ghost-button" type="button" onClick={resetTossup}>
            Reset
          </button>
        </div>
      </div>
      <div className="score-row">
        <div className="score-card">
          <span className="eyebrow">Practice</span>
          <strong>{score}</strong>
          <span>{mode === "daily" ? "daily" : "unranked"}</span>
        </div>
        <div className="timer-ring" aria-label="Read progress">
          <Clock size={18} />
          <span>{wordIndex + 1}/{tossup.words.length}w</span>
        </div>
        <div className="score-card">
          <span className="eyebrow">Answer</span>
          <strong>{answering ? "open" : reading ? "reading" : "ready"}</strong>
          <span>{wordIndex < tossup.powerMarkIndex ? "power" : "10"}</span>
        </div>
      </div>
      <div className="question-box reader-question-box" aria-live="polite">
        {visibleWords.map((word, wordPosition) => (
          <span key={`${word}-${wordPosition}`}>
            <span className="question-word" data-power={wordPosition < tossup.powerMarkIndex}>
              {word}
            </span>{" "}
          </span>
        ))}
      </div>
      <p className="match-message">{message}</p>
      <div className="buzz-row">
        <button className="buzz-button" type="button" onClick={buzz} disabled={answering}>
          Buzz <span>space</span>
        </button>
        <form className="answer-form" onSubmit={submitAnswer}>
          <input value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={!answering} placeholder={answering ? "Type your answer..." : "Buzz to answer"} />
          <button className="primary-button" type="submit" disabled={!answering || !answer.trim()}>
            Check
          </button>
        </form>
      </div>
      <div className="flow-actions">
        <button className="ghost-button" type="button" onClick={nextTossup} disabled={index >= tossups.length - 1}>
          Next tossup
        </button>
        <button className="ghost-button" type="button" onClick={reloadPractice} disabled={loading}>
          <RotateCcw size={16} /> {loading ? "Loading..." : mode === "daily" ? "Reload daily" : "New set"}
        </button>
        <a className="primary-button" href="/">
          <Swords size={16} /> Ranked queue
        </a>
      </div>
    </section>
  );
}
