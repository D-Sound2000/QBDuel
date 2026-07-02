"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Clock, Play, RotateCcw, Settings, X } from "lucide-react";
import { defaultReadingWpm, wordDelayMsForWpm } from "@/lib/domain/match-config";
import {
  difficultyLabel,
  expandDifficulties,
  MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  qbTaxonomy,
} from "@/lib/qb-taxonomy";
import type { AnswerJudgment, Tossup } from "@/lib/domain/types";

type Phase = "ready" | "reading" | "grace" | "answering" | "revealed";
type ResultOutcome = "power" | "correct" | "neg" | "miss";

const GRACE_MS = 3_000; // seconds to buzz after the question finishes reading
const ANSWER_MS = 7_000; // seconds to answer after buzzing
const MIN_WPM = 60;
const MAX_WPM = 300;
const WPM_STEP = 5;
const STORAGE_KEY = "qbduel.practice.filters";

interface StoredFilters {
  wpm: number;
  diffMin: number;
  diffMax: number;
  categories: string[];
  subcategories: string[];
}

const outcomeCopy: Record<ResultOutcome, string> = {
  power: "Power",
  correct: "Correct",
  neg: "Neg",
  miss: "No answer",
};

export function PracticeClient({ initialTossups, mode = "practice" }: { initialTossups: Tossup[]; mode?: "practice" | "daily" }) {
  const isDaily = mode === "daily";

  const [tossups, setTossups] = useState(initialTossups);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [wordIndex, setWordIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("Set your filters, then start the reader.");
  const [loading, setLoading] = useState(false);

  // Scoring + tallies
  const [score, setScore] = useState(0);
  const [tally, setTally] = useState({ powers: 0, corrects: 0, negs: 0, seen: 0 });
  const [lastResult, setLastResult] = useState<{ outcome: ResultOutcome; delta: number; correctAnswer: string; given: string } | null>(null);

  // Buzz bookkeeping
  const [buzzIndex, setBuzzIndex] = useState(0);
  const [buzzedBeforeEnd, setBuzzedBeforeEnd] = useState(false);
  const [attempt, setAttempt] = useState(0); // bumped on prompt to re-arm the answer timer

  // Countdown
  const [deadline, setDeadline] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(0);

  // Filters
  const [wpm, setWpm] = useState(defaultReadingWpm);
  const [diffMin, setDiffMin] = useState(3);
  const [diffMax, setDiffMax] = useState(6);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const tossup = tossups[index];
  const delayMs = wordDelayMsForWpm(wpm);
  const visibleWords = useMemo(() => tossup?.words.slice(0, wordIndex + 1) ?? [], [tossup, wordIndex]);
  const remainingMs = deadline ? Math.max(0, deadline - nowTs) : 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  // ---- Load persisted filters once (client only) ----
  useEffect(() => {
    if (isDaily || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<StoredFilters>;
      if (typeof stored.wpm === "number") setWpm(Math.min(MAX_WPM, Math.max(MIN_WPM, stored.wpm)));
      if (typeof stored.diffMin === "number") setDiffMin(stored.diffMin);
      if (typeof stored.diffMax === "number") setDiffMax(stored.diffMax);
      if (Array.isArray(stored.categories)) setSelectedCategories(new Set(stored.categories));
      if (Array.isArray(stored.subcategories)) setSelectedSubcategories(new Set(stored.subcategories));
    } catch {
      // Ignore malformed storage.
    }
  }, [isDaily]);

  // ---- Persist filters ----
  useEffect(() => {
    if (isDaily || typeof window === "undefined") return;
    const payload: StoredFilters = {
      wpm,
      diffMin,
      diffMax,
      categories: Array.from(selectedCategories),
      subcategories: Array.from(selectedSubcategories),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [isDaily, wpm, diffMin, diffMax, selectedCategories, selectedSubcategories]);

  // ---- Word reveal ----
  useEffect(() => {
    if (phase !== "reading" || !tossup) return;
    if (wordIndex >= tossup.words.length - 1) {
      setPhase("grace");
      setMessage("Question finished — buzz within 3 seconds.");
      return;
    }
    const id = window.setTimeout(() => setWordIndex((current) => Math.min(tossup.words.length - 1, current + 1)), delayMs);
    return () => window.clearTimeout(id);
  }, [phase, wordIndex, tossup, delayMs]);

  // ---- Countdown timers (grace + answering) ----
  const resolveOutcome = useCallback(
    (isCorrect: boolean, timedOut = false) => {
      if (!tossup) return;
      let outcome: ResultOutcome;
      let delta: number;
      if (isCorrect) {
        const power = buzzIndex < tossup.powerMarkIndex;
        outcome = power ? "power" : "correct";
        delta = power ? 15 : 10;
      } else if (buzzedBeforeEnd) {
        outcome = "neg";
        delta = -5;
      } else {
        outcome = "miss";
        delta = 0;
      }

      setScore((current) => current + delta);
      setTally((current) => ({
        powers: current.powers + (outcome === "power" ? 1 : 0),
        corrects: current.corrects + (outcome === "correct" ? 1 : 0),
        negs: current.negs + (outcome === "neg" ? 1 : 0),
        seen: current.seen + 1,
      }));
      setLastResult({ outcome, delta, correctAnswer: tossup.answer, given: answer.trim() });
      setDeadline(null);
      setWordIndex(tossup.words.length - 1);
      setPhase("revealed");
      setMessage(
        timedOut
          ? "Out of time."
          : isCorrect
            ? `${outcomeCopy[outcome]} — the answer was ${tossup.answer}.`
            : `Incorrect — the answer was ${tossup.answer}.`,
      );
    },
    [answer, buzzIndex, buzzedBeforeEnd, tossup],
  );

  const expireGrace = useCallback(() => {
    if (!tossup) return;
    setTally((current) => ({ ...current, seen: current.seen + 1 }));
    setLastResult({ outcome: "miss", delta: 0, correctAnswer: tossup.answer, given: "" });
    setDeadline(null);
    setWordIndex(tossup.words.length - 1);
    setPhase("revealed");
    setMessage(`No buzz — the answer was ${tossup.answer}.`);
  }, [tossup]);

  // Keep latest handlers in refs so the countdown effect only re-arms on
  // phase/prompt changes — not on every keystroke (which mutates resolveOutcome).
  const resolveRef = useRef(resolveOutcome);
  const expireRef = useRef(expireGrace);
  useEffect(() => {
    resolveRef.current = resolveOutcome;
    expireRef.current = expireGrace;
  });

  useEffect(() => {
    if (phase !== "grace" && phase !== "answering") return;
    const windowMs = phase === "grace" ? GRACE_MS : ANSWER_MS;
    const localDeadline = Date.now() + windowMs;
    setDeadline(localDeadline);
    setNowTs(Date.now());

    let fired = false;
    const id = window.setInterval(() => {
      const now = Date.now();
      setNowTs(now);
      if (now >= localDeadline && !fired) {
        fired = true;
        window.clearInterval(id);
        if (phase === "grace") expireRef.current();
        else resolveRef.current(false, true);
      }
    }, 100);
    return () => window.clearInterval(id);
    // attempt re-arms the answer timer after a prompt.
  }, [phase, attempt]);

  // ---- Focus the answer field when the answer window opens ----
  useEffect(() => {
    if (phase === "answering") inputRef.current?.focus();
  }, [phase]);

  // ---- Keyboard: space to buzz; enter/space to advance when revealed ----
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.code === "Space" && !typing && (phase === "reading" || phase === "grace")) {
        event.preventDefault();
        buzz();
      } else if (event.code === "Space" && !typing && phase === "revealed") {
        event.preventDefault();
        nextTossup();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const startReading = () => {
    if (!tossup) return;
    setWordIndex(0);
    setAnswer("");
    setLastResult(null);
    setPhase("reading");
    setMessage(`Reading at ${wpm} WPM.`);
  };

  const buzz = () => {
    if (phase !== "reading" && phase !== "grace") return;
    if (!tossup) return;
    setBuzzIndex(wordIndex);
    setBuzzedBeforeEnd(wordIndex < tossup.words.length - 1);
    setDeadline(null);
    setPhase("answering");
    setMessage("Answer within 7 seconds.");
  };

  const submitAnswer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phase !== "answering" || !tossup || !answer.trim()) return;

    let judgment: AnswerJudgment = "incorrect";
    try {
      const response = await fetch("/api/check-answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answer: answer.trim(), answerLine: tossup.answerLine }),
      });
      const payload = (await response.json()) as { judgment?: AnswerJudgment };
      judgment = payload.judgment ?? "incorrect";
    } catch {
      // Treat a failed check as incorrect rather than hanging the reader.
    }

    if (judgment === "prompt") {
      setMessage("Prompt — be more specific.");
      setAnswer("");
      setAttempt((current) => current + 1); // re-arm the 7s window
      inputRef.current?.focus();
      return;
    }

    resolveOutcome(judgment === "correct");
  };

  const nextTossup = () => {
    const nextIndex = index + 1;
    if (nextIndex >= tossups.length) {
      void loadSet(true);
      return;
    }
    setIndex(nextIndex);
    setWordIndex(0);
    setAnswer("");
    setLastResult(null);
    setPhase(isDaily ? "ready" : "reading");
    setMessage(isDaily ? "Press start to read." : `Reading at ${wpm} WPM.`);
  };

  const loadSet = useCallback(
    async (autostart: boolean) => {
      setLoading(true);
      try {
        let nextTossups: Tossup[] = [];
        if (isDaily) {
          const response = await fetch("/api/tossup-of-day", { cache: "no-store" });
          const payload = (await response.json()) as { tossup?: Tossup; tossups?: Tossup[] };
          nextTossups = payload.tossups ?? (payload.tossup ? [payload.tossup] : []);
        } else {
          const params = new URLSearchParams();
          params.set("difficulties", expandDifficulties(diffMin, diffMax).join(","));
          params.set("count", "12");
          if (selectedCategories.size) params.set("categories", Array.from(selectedCategories).join(","));
          if (selectedSubcategories.size) params.set("subcategories", Array.from(selectedSubcategories).join(","));
          const response = await fetch(`/api/practice?${params.toString()}`, { cache: "no-store" });
          const payload = (await response.json()) as { tossups?: Tossup[] };
          nextTossups = payload.tossups ?? [];
        }

        if (nextTossups.length > 0) {
          setTossups(nextTossups);
          setIndex(0);
          setWordIndex(0);
          setAnswer("");
          setLastResult(null);
          setPhase(autostart && !isDaily ? "reading" : "ready");
          setMessage(autostart && !isDaily ? `Reading at ${wpm} WPM.` : "New set loaded — press start.");
        } else {
          setMessage("No tossups matched those filters. Try widening them.");
        }
      } catch {
        setMessage("Could not load tossups. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [diffMax, diffMin, isDaily, selectedCategories, selectedSubcategories, wpm],
  );

  const applyFilters = () => {
    setSidebarOpen(false);
    void loadSet(true);
  };

  // ---- Filter interactions ----
  const toggleCategory = (name: string, hasSubs: boolean) => {
    setSelectedCategories((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    if (hasSubs) {
      // Selecting a whole category clears its individual sub-selections.
      const subs = qbTaxonomy.find((category) => category.name === name)?.subcategories ?? [];
      setSelectedSubcategories((current) => {
        const next = new Set(current);
        for (const sub of subs) next.delete(sub);
        return next;
      });
    }
  };

  const toggleSubcategory = (categoryName: string, sub: string) => {
    setSelectedCategories((current) => {
      if (!current.has(categoryName)) return current;
      const next = new Set(current);
      next.delete(categoryName); // partial selection supersedes whole-category
      return next;
    });
    setSelectedSubcategories((current) => {
      const next = new Set(current);
      if (next.has(sub)) next.delete(sub);
      else next.add(sub);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedCategories(new Set());
    setSelectedSubcategories(new Set());
  };

  const activeFilterCount = selectedCategories.size + selectedSubcategories.size;

  const handleDiffMin = (value: number) => setDiffMin(Math.min(value, diffMax));
  const handleDiffMax = (value: number) => setDiffMax(Math.max(value, diffMin));
  const fillLeft = ((diffMin - MIN_DIFFICULTY) / (MAX_DIFFICULTY - MIN_DIFFICULTY)) * 100;
  const fillWidth = ((diffMax - diffMin) / (MAX_DIFFICULTY - MIN_DIFFICULTY)) * 100;

  if (!tossup) {
    return (
      <section className="section">
        <div className="empty-state">
          <strong>No tossups loaded.</strong>
          <span>QBReader may be slow. Try loading again.</span>
        </div>
        <button className="primary-button" type="button" onClick={() => void loadSet(false)} disabled={loading}>
          {loading ? "Loading..." : "Load tossups"}
        </button>
      </section>
    );
  }

  const timerDisplay =
    phase === "answering" || phase === "grace" ? `${secondsLeft}s` : phase === "reading" ? "live" : "ready";
  const timerWindowMs = phase === "grace" ? GRACE_MS : phase === "answering" ? ANSWER_MS : 0;
  const timerFillPct = timerWindowMs ? Math.max(0, Math.min(100, (remainingMs / timerWindowMs) * 100)) : 0;
  const answerOpen = phase === "answering";
  const buzzable = phase === "reading" || phase === "grace";
  const difficultyRangeLabel = diffMin === diffMax ? difficultyLabel(diffMin) : `${difficultyLabel(diffMin)} → ${difficultyLabel(diffMax)}`;

  return (
    <>
    <section className="match-stage practice-stage" aria-label={isDaily ? "Daily tossup reader" : "Solo practice"}>
      <div className="match-topline">
        <span>
          {tossup.category}
          {tossup.difficulty ? ` / difficulty ${tossup.difficulty}` : ""}
        </span>
        <span>
          TU {index + 1} / {tossups.length}
        </span>
        <span>
          {wpm} WPM / Score {score}
        </span>
      </div>

      <div className="reader-toolbar">
        <div className="flow-actions">
          <button className="primary-button" type="button" onClick={startReading} disabled={phase === "reading"}>
            <Play size={16} /> {phase === "reading" ? "Reading" : phase === "revealed" ? "Re-read" : "Start read"}
          </button>
          {!isDaily ? (
            <button className="ghost-button" type="button" onClick={() => void loadSet(true)} disabled={loading}>
              <RotateCcw size={16} /> {loading ? "Loading..." : "New set"}
            </button>
          ) : (
            <button className="ghost-button" type="button" onClick={() => void loadSet(false)} disabled={loading}>
              <RotateCcw size={16} /> {loading ? "Loading..." : "Reload daily"}
            </button>
          )}
        </div>
        {!isDaily ? (
          <button className="ghost-button filter-toggle" type="button" onClick={() => setSidebarOpen(true)}>
            <Settings size={16} /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </button>
        ) : null}
      </div>

      {!isDaily ? (
        <div className="filter-summary" aria-label="Active filters">
          <span>{difficultyRangeLabel}</span>
          <span className="stat-divider">/</span>
          <span>{activeFilterCount ? `${activeFilterCount} categor${activeFilterCount === 1 ? "y" : "ies"}` : "All categories"}</span>
        </div>
      ) : null}

      <div className="score-row">
        <div className="score-card">
          <span className="eyebrow">Score</span>
          <strong>{score}</strong>
          <span>
            {tally.powers}P / {tally.corrects}G / {tally.negs}N
          </span>
        </div>
        <div
          className="timer-ring"
          data-phase={phase}
          data-danger={remainingMs > 0 && remainingMs <= 2000}
          style={{ "--timer-fill": `${timerFillPct}%` } as CSSProperties}
          aria-label="Reader timer"
        >
          <Clock size={18} />
          <span>{timerDisplay}</span>
        </div>
        <div className="score-card">
          <span className="eyebrow">Reader</span>
          <strong>
            {wordIndex + 1}/{tossup.words.length}
          </strong>
          <span>{wordIndex < tossup.powerMarkIndex ? "power zone" : "10 pts"}</span>
        </div>
      </div>

      <div className="question-box reader-question-box" aria-live="polite">
        {phase === "ready" ? (
          <div className="question-placeholder">Press start to read.</div>
        ) : (
          visibleWords.map((word, wordPosition) => (
            <span key={`${word}-${wordPosition}`}>
              <span className="question-word" data-power={wordPosition < tossup.powerMarkIndex}>
                {word}
              </span>{" "}
            </span>
          ))
        )}
      </div>

      {lastResult ? (
        <div className="reveal-panel" data-outcome={lastResult.outcome}>
          <div className="reveal-head">
            <span className="outcome-tag" data-outcome={lastResult.outcome}>
              {outcomeCopy[lastResult.outcome]}
              {lastResult.delta !== 0 ? ` ${lastResult.delta > 0 ? "+" : ""}${lastResult.delta}` : ""}
            </span>
            {lastResult.given ? <span className="reveal-given">You said: {lastResult.given}</span> : null}
          </div>
          <div className="reveal-answer">
            <span>Answer</span>
            <strong>{lastResult.correctAnswer}</strong>
          </div>
        </div>
      ) : (
        <p className="match-message">{message}</p>
      )}

      <div className="buzz-row">
        {phase === "revealed" ? (
          <button className="buzz-button" type="button" onClick={nextTossup}>
            Next tossup <span>space</span>
          </button>
        ) : (
          <button className="buzz-button" type="button" onClick={buzz} disabled={!buzzable}>
            Buzz <span>space</span>
          </button>
        )}
        <form className="answer-form" onSubmit={submitAnswer}>
          <input
            ref={inputRef}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            disabled={!answerOpen}
            placeholder={answerOpen ? "Type your answer..." : "Buzz to answer"}
            aria-label="Answer"
          />
          <button className="primary-button" type="submit" disabled={!answerOpen || !answer.trim()}>
            Check
          </button>
        </form>
      </div>
    </section>

      {sidebarOpen ? (
        <>
          <div className="filter-backdrop" role="presentation" onClick={() => setSidebarOpen(false)} />
          <aside className="filter-sidebar" aria-label="Practice filters">
            <div className="filter-head">
              <div>
                <span className="eyebrow">Practice filters</span>
                <h2>Set the room.</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close filters">
                <X size={18} />
              </button>
            </div>

            <div className="filter-section">
              <div className="filter-heading">
                <span className="eyebrow">Reading speed</span>
                <strong>{wpm} WPM</strong>
              </div>
              <input
                className="single-slider"
                type="range"
                min={MIN_WPM}
                max={MAX_WPM}
                step={WPM_STEP}
                value={wpm}
                onChange={(event) => setWpm(Number(event.target.value))}
                aria-label="Reading speed in words per minute"
              />
              <div className="range-scale">
                <span>{MIN_WPM}</span>
                <span>{MAX_WPM} WPM</span>
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-heading">
                <span className="eyebrow">Difficulty</span>
                <strong>{difficultyRangeLabel}</strong>
              </div>
              <div className="range-slider">
                <div className="range-track" />
                <div className="range-fill" style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }} />
                <input
                  type="range"
                  min={MIN_DIFFICULTY}
                  max={MAX_DIFFICULTY}
                  step={1}
                  value={diffMin}
                  onChange={(event) => handleDiffMin(Number(event.target.value))}
                  aria-label="Minimum difficulty"
                />
                <input
                  type="range"
                  min={MIN_DIFFICULTY}
                  max={MAX_DIFFICULTY}
                  step={1}
                  value={diffMax}
                  onChange={(event) => handleDiffMax(Number(event.target.value))}
                  aria-label="Maximum difficulty"
                />
              </div>
              <div className="range-scale">
                <span>Middle School</span>
                <span>Open</span>
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-heading">
                <span className="eyebrow">Categories</span>
                <button className="text-button" type="button" onClick={clearFilters} disabled={!activeFilterCount}>
                  Clear
                </button>
              </div>
              <p className="filter-note">{activeFilterCount ? "Only the selected areas will be read." : "Nothing selected reads every category."}</p>
              <div className="cat-list">
                {qbTaxonomy.map((category) => {
                  const hasSubs = category.subcategories.length > 0;
                  return (
                    <div className="cat-group" key={category.name}>
                      <button
                        className="cat-header"
                        type="button"
                        data-active={selectedCategories.has(category.name)}
                        onClick={() => toggleCategory(category.name, hasSubs)}
                      >
                        {category.name}
                      </button>
                      {hasSubs ? (
                        <div className="subcat-row">
                          {category.subcategories.map((sub) => (
                            <button
                              key={sub}
                              className="subcat-chip"
                              type="button"
                              data-active={selectedSubcategories.has(sub)}
                              onClick={() => toggleSubcategory(category.name, sub)}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="filter-actions">
              <button className="primary-button large" type="button" onClick={applyFilters} disabled={loading}>
                {loading ? "Loading..." : "Apply & start"}
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
