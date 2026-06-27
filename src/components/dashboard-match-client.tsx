"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import { Clock, Crown, Search, Swords, X } from "lucide-react";
import { defaultReadingWpm, matchTossupCount, readingWpmOptions } from "@/lib/domain/match-config";
import type { Profile, ProfileStats, RatingEvent } from "@/lib/domain/types";

type FlowStage = "dashboard" | "searching" | "countdown" | "match" | "results";

type MatchSettings = {
  ranked: boolean;
  bracket: string;
  categories: string[];
  length: number;
  answerTime: number;
  readingWpm: number;
};

type PublicMatchPlayer = {
  id: string;
  username: string;
  elo: number;
  score: number;
};

const brackets = ["HS", "Easy College", "Regular", "Nationals", "ACF Nationals"];
const categories = ["Literature", "History", "Science", "Fine Arts", "Religion", "Myth"];

const defaultSettings: MatchSettings = {
  ranked: true,
  bracket: "Regular",
  categories: ["Literature", "History", "Science"],
  length: matchTossupCount,
  answerTime: 10,
  readingWpm: defaultReadingWpm,
};

function settingSummary(settings: MatchSettings) {
  return `${settings.ranked ? "Ranked" : "Casual"} / ${settings.bracket} / ${settings.length} tossups / ${settings.readingWpm} WPM`;
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

async function fetchRealtimeAccessToken(retries = 5) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch("/api/realtime-token", { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { accessToken?: string };
        if (payload.accessToken) return payload.accessToken;
      }
    } catch {
      // Retry below. The first request after a sign-in redirect can race cookie refresh.
    }

    await new Promise((resolve) => window.setTimeout(resolve, 250 + attempt * 250));
  }

  return null;
}

export function DashboardMatchClient({ profile, stats, wsUrl }: { profile: Profile; stats: ProfileStats; wsUrl: string }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [stage, setStage] = useState<FlowStage>("dashboard");
  const [setupOpen, setSetupOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [answer, setAnswer] = useState("");
  const [players, setPlayers] = useState<PublicMatchPlayer[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState("Regular");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [powerMarkIndex, setPowerMarkIndex] = useState(Number.POSITIVE_INFINITY);
  const [tossupNumber, setTossupNumber] = useState(1);
  const [answeringPlayerId, setAnsweringPlayerId] = useState<string | null>(null);
  const [answerDeadline, setAnswerDeadline] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [connectionMessage, setConnectionMessage] = useState("Connecting realtime...");
  const [ratingEvents, setRatingEvents] = useState<RatingEvent[]>([]);
  const displayElo = useAnimatedNumber(profile.elo);

  const you = players.find((player) => player.id === profile.id) ?? { id: profile.id, username: profile.username, elo: profile.elo, score: 0 };
  const opponent = players.find((player) => player.id !== profile.id);
  const visibleWords = useMemo(() => words.slice(0, Math.min(words.length, wordIndex + 1)), [wordIndex, words]);
  const isAnswering = answeringPlayerId === profile.id;

  useEffect(() => {
    let cancelled = false;
    let authRetryCount = 0;

    async function connect() {
      const accessToken = await fetchRealtimeAccessToken();
      if (cancelled) return;
      if (!accessToken) {
        setConnected(false);
        setConnectionMessage("Sign in required. Refresh or sign in again.");
        setMessage("Sign in required. Refresh or sign in again.");
        return;
      }

      const socket = io(wsUrl || "http://localhost:4000", {
        autoConnect: false,
        auth: { accessToken },
        reconnectionAttempts: 5,
        timeout: 8_000,
      });

      socketRef.current = socket;
      socket.on("connect", () => {
        setConnected(true);
        setConnectionMessage("Realtime online.");
        setMessage("");
      });
      socket.on("disconnect", () => {
        setConnected(false);
        setConnectionMessage("Realtime disconnected. Retrying...");
      });
      socket.on("connect_error", (error) => {
        setConnected(false);
        setStage((current) => (current === "searching" ? "dashboard" : current));
        setConnectionMessage(error.message || "Realtime connection failed.");
        setMessage(error.message || "Realtime connection failed.");
        if (/sign in|required|expired|session/i.test(error.message) && authRetryCount < 3) {
          authRetryCount += 1;
          void fetchRealtimeAccessToken(3).then((nextAccessToken) => {
            if (!nextAccessToken || cancelled) return;
            socket.auth = { accessToken: nextAccessToken };
            socket.connect();
          });
        }
      });
      socket.on("queue.status", (payload: { queued: boolean; message: string }) => {
        setMessage(payload.message);
        if (payload.queued) setStage("searching");
      });
      socket.on("match.error", (payload: { message: string }) => setMessage(payload.message));
      socket.on("match.found", (payload: { matchId: string; players: PublicMatchPlayer[]; difficulty: string; readingWpm?: number }) => {
        setMatchId(payload.matchId);
        setPlayers(payload.players);
        setDifficulty(payload.difficulty);
        if (payload.readingWpm) setSettings((current) => (current.readingWpm === payload.readingWpm ? current : { ...current, readingWpm: payload.readingWpm ?? current.readingWpm }));
        setCountdown(3);
        setStage("countdown");
        setMessage("Opponent found.");
      });
      socket.on("match.countdown", (payload: { seconds: number }) => {
        setCountdown(payload.seconds);
        setStage("countdown");
      });
      socket.on("tossup.tick", (payload: { tossupNumber: number; words: string[]; powerMarkIndex: number; wordIndex: number; readingWpm?: number }) => {
        setStage("match");
        setAnsweringPlayerId(null);
        setTossupNumber(payload.tossupNumber);
        setWords(payload.words);
        setPowerMarkIndex(payload.powerMarkIndex);
        setWordIndex(payload.wordIndex);
        if (payload.readingWpm) setSettings((current) => (current.readingWpm === payload.readingWpm ? current : { ...current, readingWpm: payload.readingWpm ?? current.readingWpm }));
        setAnswerDeadline(null);
      });
      socket.on("tossup.paused", (payload: { playerId: string; buzzWordIndex: number }) => {
        setAnsweringPlayerId(payload.playerId);
        setWordIndex(payload.buzzWordIndex);
        setMessage(payload.playerId === profile.id ? "Answer now." : "Opponent buzzed.");
      });
      socket.on("answer.window", (payload: { playerId: string; deadline: number }) => {
        setAnsweringPlayerId(payload.playerId);
        setAnswerDeadline(payload.deadline);
      });
      socket.on("answer.result", (payload: { message: string; players: PublicMatchPlayer[] }) => {
        setMessage(payload.message);
        setPlayers(payload.players);
        setAnsweringPlayerId(null);
        setAnswer("");
      });
      socket.on("match.score", (payload: { players: PublicMatchPlayer[] }) => setPlayers(payload.players));
      socket.on("match.ended", (payload: { players: PublicMatchPlayer[]; ratingEvents?: RatingEvent[]; message: string }) => {
        setPlayers(payload.players);
        setRatingEvents(payload.ratingEvents ?? []);
        setMessage(payload.message);
        setAnsweringPlayerId(null);
        setStage("results");
      });
      socket.connect();
    }

    void connect();
    return () => {
      cancelled = true;
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [profile.elo, profile.id, profile.matchCount, profile.placementCount, profile.username, wsUrl]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && stage === "match" && !answeringPlayerId && visibleWords.length > 0) {
        event.preventDefault();
        buzz();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const beginSearch = () => {
    if (!connected || !socketRef.current) {
      setMessage(connectionMessage || "Realtime is not connected yet.");
      return;
    }

    setSetupOpen(false);
    setStage("searching");
    setMessage("Searching for an opponent.");
    socketRef.current.emit("queue.join", { readingWpm: settings.readingWpm });
  };

  const cancelSearch = () => {
    socketRef.current?.emit("queue.leave");
    setStage("dashboard");
    setMessage("Left queue.");
  };

  const buzz = () => {
    if (!matchId) return;
    socketRef.current?.emit("match.buzz", { matchId });
  };

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matchId || !answer.trim()) return;
    socketRef.current?.emit("match.answer.submit", { matchId, answer: answer.trim() });
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
          <h2>Scanning the live ladder.</h2>
          <p>{settingSummary(settings)}. {message || "Waiting for another signed-in player. Open a second browser session to test PvP locally."}</p>
        </div>
        <div className="queue-meter" aria-label="Connection status">
          <span>Realtime</span>
          <strong>{connected ? "online" : "offline"}</strong>
          <span>{profile.elo - 100} to {profile.elo + 100} initial ELO window</span>
        </div>
        <div className="flow-actions">
          <button className="ghost-button" type="button" onClick={cancelSearch}>
            Cancel
          </button>
        </div>
      </section>
    );
  }

  if (stage === "countdown") {
    return (
      <section className="flow-stage lobby-stage" aria-label="Pre-match countdown">
        <div className="versus-grid">
          <div className="duelist-card">
            <span className="eyebrow">You</span>
            <strong>{you.username}</strong>
            <span>{you.elo} ELO</span>
          </div>
          <div className="countdown-seal" aria-label="Countdown to match">
            {countdown ?? 3}
          </div>
          <div className="duelist-card">
            <span className="eyebrow">Opponent</span>
            <strong>{opponent?.username ?? "matched"}</strong>
            <span>{opponent?.elo ?? "?"} ELO</span>
          </div>
        </div>
        <div className="flow-copy centered">
          <span className="eyebrow">{difficulty}</span>
          <h2>The reading room is set.</h2>
          <p>Seven tossups, live scoring, rating movement after the result.</p>
        </div>
      </section>
    );
  }

  if (stage === "match") {
    const secondsLeft = answerDeadline ? Math.max(0, Math.ceil((answerDeadline - Date.now()) / 1000)) : settings.answerTime;

    return (
      <section className="match-stage" aria-label="Live match">
        <div className="match-topline">
          <span>{settings.ranked ? "Ranked" : "Casual"} / {difficulty} / {settings.readingWpm} WPM</span>
          <span>TU {tossupNumber} / {matchTossupCount}</span>
          <span>{Number.isFinite(powerMarkIndex) ? `Power until word ${powerMarkIndex}` : "No powermark"}</span>
        </div>
        <div className="score-row">
          <div className="score-card">
            <span className="eyebrow">You</span>
            <strong>{you.score}</strong>
            <span>{you.username}</span>
          </div>
          <div className="timer-ring" aria-label={`${secondsLeft} second answer timer`}>
            <Clock size={18} />
            <span>{isAnswering ? secondsLeft : "live"}</span>
          </div>
          <div className="score-card">
            <span className="eyebrow">Opponent</span>
            <strong>{opponent?.score ?? 0}</strong>
            <span>{opponent?.username ?? "opponent"}</span>
          </div>
        </div>

        <div className="question-box" aria-live="polite">
          {visibleWords.length === 0 ? (
            <div className="question-placeholder">Tossup is being drawn.</div>
          ) : (
            visibleWords.map((word, index) => (
              <span key={`${word}-${index}`}>
                <span className="question-word" data-power={index < powerMarkIndex}>
                  {word}
                </span>{" "}
              </span>
            ))
          )}
        </div>

        {message ? <p className="match-message">{message}</p> : null}

        <div className="buzz-row">
          <button className="buzz-button" type="button" onClick={buzz} disabled={Boolean(answeringPlayerId) || visibleWords.length === 0}>
            Buzz <span>space</span>
          </button>
          <form className="answer-form" onSubmit={submitAnswer}>
            <input
              aria-label="Answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              disabled={!isAnswering}
              placeholder={isAnswering ? "Type your answer..." : answeringPlayerId ? "Opponent is answering" : "Buzz to open your answer line"}
            />
            <button className="primary-button" type="submit" disabled={!isAnswering || !answer.trim()}>
              Submit
            </button>
          </form>
        </div>
      </section>
    );
  }

  if (stage === "results") {
    const yourEvent = ratingEvents.find((event) => event.playerId === profile.id);

    return (
      <section className="flow-stage results-stage" aria-label="Match results">
        <div className="verdict-block">
          <span className="eyebrow">Final verdict</span>
          <h2>{message || "Match complete."}</h2>
          <p>
            {you.username} {you.score}-{opponent?.score ?? 0} {opponent?.username ?? "opponent"}
          </p>
          {yourEvent ? <strong className="elo-delta">{yourEvent.delta > 0 ? "+" : ""}{yourEvent.delta} ELO</strong> : null}
        </div>
        <div className="review-list" aria-label="Rating review">
          {ratingEvents.map((event) => {
            const player = players.find((entry) => entry.id === event.playerId);
            return (
              <div className="review-row" data-tone={event.delta >= 0 ? "positive" : "negative"} key={event.playerId}>
                <span>{player?.username ?? "Player"}</span>
                <span>{event.before} to {event.after}</span>
                <strong>{event.actualScore === 1 ? "Win" : event.actualScore === 0.5 ? "Draw" : "Loss"}</strong>
                <span>{event.modifiers.join(", ") || "standard"}</span>
                <b>{event.delta > 0 ? "+" : ""}{event.delta}</b>
              </div>
            );
          })}
        </div>
        <div className="flow-actions">
          <button className="primary-button" type="button" onClick={beginSearch}>
            Rematch queue
          </button>
          {matchId ? (
            <a className="ghost-button" href={`/matches/${matchId}`}>
              View replay
            </a>
          ) : null}
          <button className="ghost-button" type="button" onClick={() => setStage("dashboard")}>
            Home
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="duel-console" aria-label="Play controls">
        <div className="quick-match">
          <span className="eyebrow">Ready queue</span>
          <h2>{settingSummary(settings)}</h2>
          <p>{message || "Start from your saved ladder setup. Local PvP needs a second signed-in client to match."}</p>
          <div className="flow-actions">
            <button className="primary-button large" type="button" onClick={beginSearch} disabled={!connected}>
              <Swords size={18} /> {connected ? "Start Match" : "Connecting..."}
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
          <span>{connectionMessage}</span>
          <span className="status-dot" data-online={connected} aria-label={connected ? "Realtime connected" : "Realtime offline"} />
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
                <button data-active={settings.bracket === bracket} key={bracket} type="button" onClick={() => setSettings((current) => ({ ...current, bracket }))}>
                  {bracket}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <span className="eyebrow">Reading speed</span>
            <div className="segmented-control">
              {readingWpmOptions.map((readingWpm) => (
                <button data-active={settings.readingWpm === readingWpm} key={readingWpm} type="button" onClick={() => setSettings((current) => ({ ...current, readingWpm }))}>
                  {readingWpm} WPM
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
              <input readOnly type="number" value={matchTossupCount} />
            </label>
            <label className="number-field">
              <span>Answer time</span>
              <input readOnly type="number" value={settings.answerTime} />
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
