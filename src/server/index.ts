import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { QueuePlayer } from "./types";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

loadLocalEnv();

const [{ Server }, { z }, matchConfig, supabaseAdmin, queueModule, engineModule, repositoryModule] = await Promise.all([
  import("socket.io"),
  import("zod"),
  import("@/lib/domain/match-config"),
  import("@/lib/supabase/admin"),
  import("./queue"),
  import("./match-engine"),
  import("./repository"),
]);

const { defaultReadingWpm, normalizeReadingWpm, readingWpmOptions } = matchConfig;
const { createSupabaseAdminClient } = supabaseAdmin;
const { MatchQueue } = queueModule;
const { MatchEngine } = engineModule;
const { HybridRepository } = repositoryModule;

type AuthenticatedPlayer = {
  id: string;
  username: string;
  elo: number;
  matchCount: number;
  placementCount: number;
};

const playerSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  elo: z.number().int().nonnegative(),
  matchCount: z.number().int().nonnegative(),
  placementCount: z.number().int().nonnegative(),
});

const port = Number(process.env.WS_PORT ?? 4000);
const origin = process.env.APP_ORIGIN ? process.env.APP_ORIGIN.split(",").map((entry) => entry.trim()) : ["http://localhost:3000", "http://localhost:3001"];

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  response.writeHead(404);
  response.end();
});
const io = new Server(server, {
  cors: {
    origin,
    credentials: true,
  },
});

const queue = new MatchQueue();
const repository = new HybridRepository();
const engine = new MatchEngine(io, repository);
const supabase = createSupabaseAdminClient();
const disconnectGraceMs = 10_000;

const authSchema = z.object({
  accessToken: z.string().min(1).optional(),
  player: playerSchema.optional(),
});

const queueSettingsSchema = z
  .object({
    readingWpm: z.number().refine((value) => readingWpmOptions.includes(value as (typeof readingWpmOptions)[number])),
  })
  .partial()
  .optional();

io.use(async (socket, next) => {
  const parsed = authSchema.safeParse(socket.handshake.auth);
  if (!parsed.success) {
    next(new Error("Invalid auth payload"));
    return;
  }

  if (supabase && parsed.data.accessToken) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(parsed.data.accessToken);

    if (error || !user) {
      next(new Error("Invalid or expired session"));
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile) {
      next(new Error("Finish onboarding before queueing"));
      return;
    }

    socket.data.player = {
      id: profile.id,
      username: profile.username,
      elo: profile.elo,
      matchCount: profile.match_count,
      placementCount: profile.placement_count,
    };
    next();
    return;
  }

  if (!supabase && parsed.data.player) {
    socket.data.player = parsed.data.player;
    next();
    return;
  }

  next(new Error("Sign in required"));
});

io.on("connection", (socket) => {
  const player = socket.data.player as AuthenticatedPlayer;
  engine.reconnectPlayer(player.id, socket.id);

  socket.on("queue.join", async (payload: unknown) => {
    if (engine.getMatchForPlayer(player.id)) {
      socket.emit("match.error", { message: "You are already in a match." });
      return;
    }

    const parsedSettings = queueSettingsSchema.safeParse(payload);
    const queuedPlayer: QueuePlayer = {
      ...player,
      socketId: socket.id,
      queuedAt: Date.now(),
      readingWpm: parsedSettings.success ? normalizeReadingWpm(parsedSettings.data?.readingWpm) : defaultReadingWpm,
    };
    const opponent = queue.add(queuedPlayer);
    socket.emit("queue.status", { queued: !opponent, message: opponent ? "Opponent found." : "Searching within +/-100 ELO." });

    if (opponent) {
      io.to(opponent.socketId).emit("queue.status", { queued: false, message: "Opponent found." });
      await engine.createMatch(opponent, queuedPlayer);
    }
  });

  socket.on("queue.leave", () => {
    queue.remove(player.id);
    socket.emit("queue.status", { queued: false, message: "Left queue." });
  });

  socket.on("match.ready", () => {
    socket.emit("queue.status", { queued: queue.has(player.id), message: queue.has(player.id) ? "Still searching." : "Ready." });
  });

  socket.on("match.buzz", (payload: { matchId?: string }) => {
    engine.buzz(player.id, payload?.matchId);
  });

  socket.on("match.answer.submit", (payload: { matchId?: string; answer?: string }) => {
    void engine.handleAnswer(player.id, payload?.answer ?? "", payload?.matchId);
  });

  socket.on("match.disconnect.intent", () => {
    queue.remove(player.id);
  });

  socket.on("disconnect", () => {
    queue.remove(player.id);
    if (engine.markDisconnected(player.id)) {
      setTimeout(() => {
        void engine.forfeit(player.id);
      }, disconnectGraceMs);
    }
  });
});

server.listen(port, () => {
  console.log(`QB Duel WebSocket server listening on http://localhost:${port}`);
});
