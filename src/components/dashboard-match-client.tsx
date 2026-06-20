"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import { Clock, Crown, Search, Swords, X } from "lucide-react";
import type { Profile, ProfileStats } from "@/lib/domain/types";

type FlowStage = "dashboard" | "searching" | "lobby" | "match" | "results";

type MatchSettings = {
  ranked: boolean;
  bracket: string;
  categories: string[];
  length: number;
  answerTime: number;
};

const brackets = ["HS", "Easy College", "Regular", "Nationals", "ACF Nationals"];
const categories = ["Literature", "History", "Science", "Fine Arts", "Religion", "Myth"];

const defaultSettings: MatchSettings = {
  ranked: true,
  bracket: "Regular",
  categories: ["Literature", "History", "Science"],
  length: 8,
  answerTime: 10,
};

const sampleWords =
  "In one novel by this author, Lily Briscoe finishes a painting after Mrs. Ramsay's death, while another uses a chiming clock to frame Clarissa Dalloway's party in London.".split(
    " ",
  );

const reviewRows = [
  { order: 1, category: "Literature", buzz: "word 18", result: "Power", points: "+15", tone: "positive" },
  { order: 2, category: "Science", buzz: "word 31", result: "Correct", points: "+10", tone: "positive" },
  { order: 3, category: "History", buzz: "word 14", result: "Neg", points: "-5", tone: "negative" },
  { order: 4, category: "Fine Arts", buzz: "dead", result: "Miss", points: "0", tone: "neutral" },
];

function settingSummary(settings: MatchSettings) {
  return `${settings.ranked ? "Ranked" : "Casual"} / ${settings.bracket} / ${settings.length} tossups`;
}

function useAnimatedNumber(value: number) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();
    const duration = 900;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return displayValue;
}

export function DashboardMatchClient({ profile, stats, wsUrl }: { profile: Profile; stats: ProfileStats; wsUrl: string }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [stage, setStage] = useState<FlowStage>("dashboard");
  const [setupOpen, setSetupOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [answer, setAnswer] = useState("");
  const [revealedWords, setRevealedWords] = useState(0);
  const [answering, setAnswering] = useState(false);
  const displayElo = useAnimatedNumber(profile.elo);

  useEffect(() => {
    const socket = io(wsUrl || "http://localhost:4000", {
      auth: {
        player: {
          id: profile.id,
          username: profile.username,
          elo: profile.elo,
          matchCount: profile.matchCount,
          placementCount: profile.placementCount,
        },
      },
    });

    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [profile.elo, profile.id, profile.matchCount, profile.placementCount, profile.username, wsUrl]);

  useEffect(() => {
    if (stage !== "match") {
      setRevealedWords(0);
      setAnswering(false);
      setAnswer("");
      return;
    }

    const interval = window.setInterval(() => {
      setRevealedWords((current) => Math.min(sampleWords.length, current + 1));
    }, 155);

    return () => window.clearInterval(interval);
  }, [stage]);

  const visibleWords = useMemo(() => sampleWords.slice(0, revealedWords), [revealedWords]);

  const beginSearch = () => {
    setSetupOpen(false);
    setStage("searching");
    socketRef.current?.emit("queue.join", settings);
  };

  const cancelSearch = () => {
    socketRef.current?.emit("queue.leave");
    setStage("dashboard");
  };

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAnswering(false);
    setAnswer("");
    setRevealedWords(sampleWords.length);
  };

  const toggleCategory = (category: string) => {
    setSettings((current) => {
      const exists = current.categories.includes(category);
      const nextCategories = exists ? current.categories.filter((item) => item !== category) : [...current.categories, category];
      return { ...current, categories: nextCategories.length > 0 ? nextCategories : current.categories };
    });
  };

  if (stage === "searching") {
    return (
      <section className="flow-stage matchmaking-stage" aria-label="Matchmaking">
        <div className="stage-orbit" aria-hidden="true">
          <Search size={34} />
        </div>
        <div className="flow-copy">
          <span className="eyebrow">Finding opponent</span>
          <h2>Scanning the midnight ladder.</h2>
          <p>{settingSummary(settings)}. Current range is {profile.elo - 85} to {profile.elo + 85} ELO and widening.</p>
        </div>
        <div className="queue-meter" aria-label="Estimated wait">
          <span>Estimated wait</span>
          <strong>0:12</strong>
          <span>Range +25 every 10 seconds</span>
        </div>
        <div className="flow-actions">
          <button className="primary-button" type="button" onClick={() => setStage("lobby")}>
            Accept found match
          </button>
          <button className="ghost-button" type="button" onClick={cancelSearch}>
            Cancel
          </button>
        </div>
      </section>
    );
  }

  if (stage === "lobby") {
    return (
      <section className="flow-stage lobby-stage" aria-label="Pre-match lobby">
        <div className="versus-grid">
          <div className="duelist-card">
            <span className="eyebrow">You</span>
            <strong>{profile.username}</strong>
            <span>{profile.elo} ELO</span>
          </div>
          <div className="countdown-seal" aria-label="Countdown to match">
            3
          </div>
          <div className="duelist-card">
            <span className="eyebrow">Opponent</span>
            <strong>neginator</strong>
            <span>1224 ELO</span>
          </div>
        </div>
        <div className="flow-copy centered">
          <span className="eyebrow">{settingSummary(settings)}</span>
          <h2>The reading room is set.</h2>
          <p>Players are seated, packets are loaded, and the lamp is dropping onto tossup one.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setStage("match")}>
          Enter match
        </button>
      </section>
    );
  }

  if (stage === "match") {
    return (
      <section className="match-stage" aria-label="Live match">
        <div className="match-topline">
          <span>{settingSummary(settings)}</span>
          <span>TU 1 / {settings.length}</span>
          <span>Power until word 22</span>
        </div>
        <div className="score-row">
          <div className="score-card">
            <span className="eyebrow">You</span>
            <strong>{answering ? 0 : 15}</strong>
            <span>{profile.username}</span>
          </div>
          <div className="timer-ring" aria-label={`${settings.answerTime} second answer timer`}>
            <Clock size={18} />
            <span>{settings.answerTime}</span>
          </div>
          <div className="score-card">
            <span className="eyebrow">Opponent</span>
            <strong>0</strong>
            <span>neginator</span>
          </div>
        </div>

        <div className="question-box" aria-live="polite">
          {visibleWords.length === 0 ? (
            <div className="question-placeholder">Tossup one is being drawn.</div>
          ) : (
            visibleWords.map((word, index) => (
              <span className="question-word" data-power={index < 22} key={`${word}-${index}`}>
                {word}{" "}
              </span>
            ))
          )}
        </div>

        <div className="buzz-row">
          <button className="buzz-button" type="button" onClick={() => setAnswering(true)} disabled={answering || revealedWords === 0}>
            Buzz <span>space</span>
          </button>
          <form className="answer-form" onSubmit={submitAnswer}>
            <input
              aria-label="Answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              disabled={!answering}
              placeholder={answering ? "Type your answer..." : "Buzz to open your answer line"}
            />
            <button className="primary-button" type="submit" disabled={!answering || !answer.trim()}>
              Submit
            </button>
          </form>
        </div>

        <div className="flow-actions">
          <button className="ghost-button" type="button" onClick={() => setStage("results")}>
            Finish demo match
          </button>
        </div>
      </section>
    );
  }

  if (stage === "results") {
    return (
      <section className="flow-stage results-stage" aria-label="Match results">
        <div className="verdict-block">
          <span className="eyebrow">Final verdict</span>
          <h2>Victory by power.</h2>
          <p>55-35 over neginator. Rating moves from 1165 to 1186.</p>
          <strong className="elo-delta">+21 ELO</strong>
        </div>
        <div className="review-list" aria-label="Tossup review">
          {reviewRows.map((row) => (
            <div className="review-row" data-tone={row.tone} key={row.order}>
              <span>TU {row.order}</span>
              <span>{row.category}</span>
              <strong>{row.result}</strong>
              <span>{row.buzz}</span>
              <b>{row.points}</b>
            </div>
          ))}
        </div>
        <div className="flow-actions">
          <button className="primary-button" type="button" onClick={beginSearch}>
            Rematch queue
          </button>
          <button className="ghost-button" type="button" onClick={() => setSetupOpen(true)}>
            New match
          </button>
          <button className="ghost-button" type="button" onClick={() => setStage("dashboard")}>
            Home
          </button>
        </div>
        {setupOpen ? renderSetupModal() : null}
      </section>
    );
  }

  return (
    <>
      <section className="duel-console" aria-label="Play controls">
        <div className="quick-match">
          <span className="eyebrow">Ready queue</span>
          <h2>{settingSummary(settings)}</h2>
          <p>Start from your saved ladder setup and sit for an instant ranked duel.</p>
          <div className="flow-actions">
            <button className="primary-button large" type="button" onClick={beginSearch}>
              <Swords size={18} /> Start Match
            </button>
            <button className="ghost-button" type="button" onClick={() => setSetupOpen(true)}>
              Customize
            </button>
          </div>
        </div>

        <div className="rating-slate">
          <Crown size={18} />
          <span className="eyebrow">Current form</span>
          <strong>{displayElo}</strong>
          <span>{profile.tier} tier / {stats.wins}-{stats.losses} record</span>
          <span className="status-dot" data-online={connected} aria-label={connected ? "Realtime connected" : "Demo mode"} />
        </div>
      </section>
      {setupOpen ? renderSetupModal() : null}
    </>
  );

  function renderSetupModal() {
    return (
      <div className="modal-backdrop" role="presentation">
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-match-title">
          <div className="modal-header">
            <div>
              <span className="eyebrow">New match</span>
              <h2 id="new-match-title">Set the table.</h2>
            </div>
            <button className="icon-button" type="button" onClick={() => setSetupOpen(false)} aria-label="Close new match settings">
              <X size={18} />
            </button>
          </div>

          <label className="toggle-row">
            <span>
              <strong>Ranked ladder</strong>
              <small>Rating changes after the result.</small>
            </span>
            <input
              type="checkbox"
              checked={settings.ranked}
              onChange={(event) => setSettings((current) => ({ ...current, ranked: event.target.checked }))}
            />
          </label>

          <div className="field-group">
            <span className="eyebrow">Difficulty bracket</span>
            <div className="segmented-control">
              {brackets.map((bracket) => (
                <button
                  data-active={settings.bracket === bracket}
                  key={bracket}
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, bracket }))}
                >
                  {bracket}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <span className="eyebrow">Categories</span>
            <div className="chip-grid">
              {categories.map((category) => (
                <button data-active={settings.categories.includes(category)} key={category} type="button" onClick={() => toggleCategory(category)}>
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-grid">
            <label className="number-field">
              <span>Length</span>
              <input
                min={4}
                max={20}
                type="number"
                value={settings.length}
                onChange={(event) => setSettings((current) => ({ ...current, length: Number(event.target.value) }))}
              />
            </label>
            <label className="number-field">
              <span>Answer time</span>
              <input
                min={5}
                max={20}
                type="number"
                value={settings.answerTime}
                onChange={(event) => setSettings((current) => ({ ...current, answerTime: Number(event.target.value) }))}
              />
            </label>
          </div>

          <button className="primary-button large" type="button" onClick={beginSearch}>
            Find match
          </button>
        </section>
      </div>
    );
  }
}
