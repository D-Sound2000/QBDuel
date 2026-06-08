"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Keyboard, Send, Swords } from "lucide-react";
import type { Profile } from "@/lib/domain/types";

interface PlayerState {
  id: string;
  username: string;
  elo: number;
  score: number;
}

interface MatchState {
  id: string | null;
  phase: string;
  tossupNumber: number;
  words: string[];
  powerMarkIndex: number;
  wordIndex: number;
  answerWindow: boolean;
  answerDeadline: number | null;
  players: PlayerState[];
  message: string;
}

const initialMatchState: MatchState = {
  id: null,
  phase: "idle",
  tossupNumber: 0,
  words: [],
  powerMarkIndex: Number.POSITIVE_INFINITY,
  wordIndex: 0,
  answerWindow: false,
  answerDeadline: null,
  players: [],
  message: "Ready to enter the ranked queue.",
};

export function DashboardMatchClient({ profile, wsUrl }: { profile: Profile; wsUrl: string }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [queued, setQueued] = useState(false);
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<MatchState>(initialMatchState);

  useEffect(() => {
    const socket = io(wsUrl, {
      transports: ["websocket"],
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
    socket.on("queue.status", (payload: { queued: boolean; message: string }) => {
      setQueued(payload.queued);
      setState((current) => ({ ...current, message: payload.message }));
    });
    socket.on("match.found", (payload: { matchId: string; players: PlayerState[] }) => {
      setQueued(false);
      setState((current) => ({ ...current, id: payload.matchId, players: payload.players, phase: "matched", message: "Opponent found." }));
    });
    socket.on("match.countdown", (payload: { seconds: number }) => {
      setState((current) => ({ ...current, phase: "countdown", message: `Match starts in ${payload.seconds}.` }));
    });
    socket.on("tossup.tick", (payload: { tossupNumber: number; words: string[]; powerMarkIndex: number; wordIndex: number }) => {
      setState((current) => ({ ...current, ...payload, phase: "reading", answerWindow: false, message: "Reading." }));
    });
    socket.on("tossup.paused", (payload: { playerId: string; buzzWordIndex: number }) => {
      setState((current) => ({ ...current, phase: "buzzed", wordIndex: payload.buzzWordIndex, message: `${payload.playerId === profile.id ? "You" : "Opponent"} buzzed.` }));
    });
    socket.on("answer.window", (payload: { playerId: string; deadline: number }) => {
      setState((current) => ({ ...current, answerWindow: payload.playerId === profile.id, answerDeadline: payload.deadline, phase: "answering", message: payload.playerId === profile.id ? "Submit your answer." : "Opponent is answering." }));
    });
    socket.on("answer.result", (payload: { message: string; players: PlayerState[] }) => {
      setAnswer("");
      setState((current) => ({ ...current, answerWindow: false, players: payload.players, phase: "result", message: payload.message }));
    });
    socket.on("match.score", (payload: { players: PlayerState[] }) => {
      setState((current) => ({ ...current, players: payload.players }));
    });
    socket.on("match.ended", (payload: { players: PlayerState[]; message: string }) => {
      setState((current) => ({ ...current, answerWindow: false, players: payload.players, phase: "ended", message: payload.message }));
    });
    socket.on("match.error", (payload: { message: string }) => {
      setState((current) => ({ ...current, message: payload.message }));
    });

    return () => {
      socket.emit("match.disconnect.intent");
      socket.disconnect();
    };
  }, [profile.elo, profile.id, profile.matchCount, profile.placementCount, profile.username, wsUrl]);

  const visibleWords = useMemo(() => state.words.slice(0, state.wordIndex + 1), [state.wordIndex, state.words]);

  const joinQueue = useCallback(() => {
    socketRef.current?.emit("queue.join");
  }, []);

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit("queue.leave");
  }, []);

  const buzz = useCallback(() => {
    socketRef.current?.emit("match.buzz", { matchId: state.id });
  }, [state.id]);

  const submitAnswer = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      socketRef.current?.emit("match.answer.submit", { matchId: state.id, answer });
    },
    [answer, state.id],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !state.answerWindow && state.phase === "reading") {
        event.preventDefault();
        buzz();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [buzz, state.answerWindow, state.phase]);

  const me = state.players.find((player) => player.id === profile.id);
  const opponent = state.players.find((player) => player.id !== profile.id);
  const isMatchActive = ["matched", "countdown", "reading", "buzzed", "answering", "result", "ended"].includes(state.phase);

  if (queued && !isMatchActive) {
    return (
      <div className="duel-lobby" aria-live="polite">
        <div className="queue-compass" aria-hidden="true" />
        <div style={{ marginTop: 36 }}>
          <div className="title" style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}>
            Seeking opponent...
          </div>
          <p style={{ color: "var(--text-secondary)", marginTop: 18 }}>
            Searching within the ranked ELO window. The range expands if the queue runs long.
          </p>
        </div>
        <div style={{ marginTop: 30, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <button className="ghost-button" type="button" onClick={leaveQueue}>
            Withdraw from queue
          </button>
          <span className="badge">{state.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="match-room">
      {!isMatchActive ? (
        <div className="duel-lobby">
          <span className="rank-badge">◆ {profile.tier} Tier</span>
          <strong
            style={{
              display: "block",
              marginTop: 22,
              color: "var(--text-primary)",
              fontFamily: "var(--font-numerics)",
              fontSize: "clamp(4rem, 11vw, 7rem)",
              lineHeight: 0.9,
              textShadow: "0 0 40px var(--accent-glow)",
            }}
          >
            {profile.elo}
          </strong>
          <div className="eyebrow" style={{ marginTop: 14 }}>
            Current Rating
          </div>
          <div className="divider">
            <span>◆</span>
          </div>
          <div style={{ marginTop: 34 }}>
            <button className="primary-button" type="button" onClick={joinQueue} disabled={!connected} style={{ minWidth: 260, minHeight: 58 }}>
              <Swords size={17} aria-hidden="true" /> Find Match
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
            <span className="badge">{connected ? "Socket connected" : "Socket offline"}</span>
            <span className="badge">
              <Keyboard size={15} aria-hidden="true" /> Space to buzz
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="score-row">
            <div className="score-card">
              <span className="kicker">You</span>
              <strong>{me?.score ?? 0}</strong>
              <span>{profile.username}</span>
            </div>
            <span className="badge">TU {state.tossupNumber || 1} / 8</span>
            <div className="score-card" style={{ textAlign: "right" }}>
              <span className="kicker">Opponent</span>
              <strong style={{ color: "var(--foe)" }}>{opponent?.score ?? 0}</strong>
              <span>{opponent?.username ?? "Waiting"}</span>
            </div>
          </div>

          <div className="question-box" aria-live="polite">
            {visibleWords.length === 0 ? (
              <div className="question-placeholder">{state.message}</div>
            ) : (
              visibleWords.map((word, index) => (
                <span key={`${word}-${index}`} className={index <= state.powerMarkIndex && word.includes("(*)") ? "power-mark" : undefined} style={{ animation: "wordAppear 0.12s ease" }}>
                  {word}{" "}
                </span>
              ))
            )}
          </div>

          <div className="buzz-row">
            <button className="buzz-button" type="button" onClick={buzz} disabled={!connected || state.phase !== "reading"}>
              Buzz <span style={{ fontSize: "var(--text-xs)", letterSpacing: "0.1em", opacity: 0.7 }}>[ space ]</span>
            </button>
            <form className="answer-form" onSubmit={submitAnswer}>
              <input
                aria-label="Answer"
                suppressHydrationWarning
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={!state.answerWindow}
                placeholder={state.answerWindow ? "Type your answer..." : "Answer window opens after your buzz"}
              />
              <button className="primary-button" type="submit" disabled={!state.answerWindow || !answer.trim()}>
                <Send size={16} aria-hidden="true" /> Submit
              </button>
            </form>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <span className="badge">{state.message}</span>
            <span className="source-tag">qbreader · server-clocked</span>
          </div>
        </>
      )}
    </div>
  );
}
