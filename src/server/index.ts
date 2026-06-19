import http from "node:http";
import { Server } from "socket.io";
import { z } from "zod";
import { MatchQueue } from "./queue";
import { MatchEngine } from "./match-engine";
import { HybridRepository } from "./repository";
import type { QueuePlayer } from "./types";

const playerSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  elo: z.number().int().nonnegative(),
  matchCount: z.number().int().nonnegative(),
  placementCount: z.number().int().nonnegative(),
});

const port = Number(process.env.WS_PORT ?? 4000);
const origin = process.env.APP_ORIGIN ? process.env.APP_ORIGIN.split(",").map((entry) => entry.trim()) : ["http://localhost:3000", "http://localhost:3001"];

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin,
    credentials: true,
  },
});

const queue = new MatchQueue();
const engine = new MatchEngine(io, new HybridRepository());

io.use((socket, next) => {
  const parsed = playerSchema.safeParse(socket.handshake.auth.player);
  if (!parsed.success) {
    next(new Error("Invalid player auth payload"));
    return;
  }

  socket.data.player = parsed.data;
  next();
});

io.on("connection", (socket) => {
  const player = socket.data.player as z.infer<typeof playerSchema>;

  socket.on("queue.join", async () => {
    if (engine.getMatchForPlayer(player.id)) {
      socket.emit("match.error", { message: "You are already in a match." });
      return;
    }

    const queuedPlayer: QueuePlayer = { ...player, socketId: socket.id, queuedAt: Date.now() };
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
    void engine.forfeit(player.id);
  });
});

server.listen(port, () => {
  console.log(`QB Duel WebSocket server listening on http://localhost:${port}`);
});
