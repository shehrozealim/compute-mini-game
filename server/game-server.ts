import express from "express";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { Server } from "socket.io";
import { performance } from "node:perf_hooks";
import {
  createMatch,
  idle,
  step,
  valid,
  DT,
  type Input,
  type Match,
  type GameEvent,
} from "../shared/game.js";
import {
  MAP_IDS,
  TROOP_IDS,
  type MapId,
  type TroopId,
} from "../shared/config.js";
export type Seat = {
  id: string;
  name: string;
  team: number;
  role: string;
  input: Input;
  holding?: boolean;
  fireUntil?: number;
  last: number;
  tokens: number;
  refill: number;
};
export type Room = {
  seats: Seat[];
  match: Match;
  active: boolean;
  created: number;
  map: MapId;
  troops: TroopId[];
  events: GameEvent[];
};
export function createGameServer() {
  const app = express(),
    http = createServer(app),
    rawOrigins = (
      process.env.ALLOWED_ORIGINS ||
      "http://localhost:3000,http://127.0.0.1:3000,*.vercel.app,*"
    )
      .split(",")
      .map((v) => v.trim().replace(/\/+$/, ""));

  const isOriginAllowed = (origin?: string): boolean => {
    if (!origin) return true;
    const clean = origin.replace(/\/+$/, "");
    if (rawOrigins.includes("*")) return true;
    if (rawOrigins.includes(clean)) return true;
    try {
      const parsed = new URL(clean);
      const host = parsed.hostname;
      if (host === "localhost" || host === "127.0.0.1") return true;
      if (host.endsWith(".vercel.app") || host.endsWith(".trycloudflare.com")) return true;
      for (const pattern of rawOrigins) {
        if (pattern === "*") return true;
        if (pattern.startsWith("*.") && host.endsWith(pattern.slice(2))) return true;
        if (pattern.startsWith("http://*.") || pattern.startsWith("https://*.")) {
          const suffix = pattern.replace(/^https?:\/\/\*\./, "");
          if (host.endsWith(suffix)) return true;
        }
      }
    } catch {}
    return false;
  };

  const io = new Server(http, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error("CORS origin not allowed: " + origin));
        }
      },
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
    maxHttpBufferSize: 2048,
    perMessageDeflate: false,
    allowRequest: (req, cb) => {
      let same = false;
      try {
        same =
          !!req.headers.origin &&
          new URL(req.headers.origin).host === req.headers.host;
      } catch {}
      cb(
        null,
        !req.headers.origin || same || isOriginAllowed(req.headers.origin),
      );
    },
  });
  const rooms = new Map<string, Room>(),
    activeRooms = new Set<string>(),
    limit = Number(process.env.MAX_ROOMS) || 200;
  const metrics = {
    ticks: 0,
    steps: 0,
    peakRooms: 0,
    droppedSeconds: 0,
    tickMs: [] as number[],
  };
  const publicRoom = (code: string, r: Room) => ({
    code,
    host: r.seats[0]?.id,
    seats: r.seats.map(({ id, name, team, role }) => ({
      id,
      name,
      team,
      role,
    })),
    map: r.map,
    troops: r.troops,
    active: r.active,
  });
  const publish = (code: string, r: Room) =>
    io.to(code).emit("lobby", publicRoom(code, r));
  app.get("/health", (_, res) => {
    const sorted = [...metrics.tickMs].sort((a, b) => a - b);
    res.json({
      ok: true,
      rooms: rooms.size,
      activeRooms: activeRooms.size,
      players: io.engine.clientsCount,
      tickRate: 30,
      snapshotRate: 15,
      simulationP95Ms: sorted[Math.floor(sorted.length * 0.95)] || 0,
      droppedSeconds: metrics.droppedSeconds,
    });
  });
  io.on("connection", (s) => {
    let code = "";
    let joinAttempts = 0;
    const leave = () => {
      const old = code,
        r = rooms.get(old);
      s.leave(old);
      code = "";
      if (!r) return;
      r.seats = r.seats.filter((p) => p.id !== s.id);
      r.active = false;
      activeRooms.delete(old);
      for (const p of r.seats) {
        p.input = idle();
        p.last = 0;
      }
      if (!r.seats.length) rooms.delete(old);
      else {
        publish(old, r);
        io.to(old).emit(
          "notice",
          "A required player left. The match stopped; fill the seat and start a new round.",
        );
      }
    };
    s.on("join", (data, ack) => {
      if (typeof ack !== "function") return;
      if (++joinAttempts > 40)
        return ack({
          error: "Too many join attempts. Reconnect to try again.",
        });
      if (code) return ack({ error: "Leave your current room first." });
      if (
        !data ||
        ![0, 1].includes(data.team) ||
        !["both", "move", "shoot"].includes(data.role)
      )
        return ack({ error: "Invalid team or role." });
      let key =
        typeof data.code === "string" ? data.code.trim().toUpperCase() : "";
      if (key && !/^[A-F0-9]{6}$/.test(key))
        return ack({ error: "Invalid room code." });
      let r = rooms.get(key);
      if (key && !r) return ack({ error: "Room not found." });
      if (!key) {
        if (rooms.size >= limit)
          return ack({ error: "Server capacity reached." });
        do {
          key = randomBytes(3).toString("hex").toUpperCase();
        } while (rooms.has(key));
        const map: MapId = MAP_IDS.includes(data.map) ? data.map : "forest";
        r = {
          seats: [],
          match: createMatch(map),
          active: false,
          created: Date.now(),
          map,
          troops: ["archer", "wizard"],
          events: [],
        };
        rooms.set(key, r);
      }
      if (!r) return;
      if (r.active) return ack({ error: "Match in progress." });
      if (
        r.seats.some(
          (p) =>
            p.team === data.team &&
            (p.role === "both" || data.role === "both" || p.role === data.role),
        )
      )
        return ack({ error: "That role is occupied." });
      code = key;
      s.join(key);
      r.seats.push({
        id: s.id,
        name:
          typeof data.name === "string"
            ? data.name.trim().slice(0, 20) || "Player"
            : "Player",
        team: data.team,
        role: data.role,
        input: idle(),
        last: 0,
        tokens: 60,
        refill: performance.now(),
      });
      if (TROOP_IDS.includes(data.troop)) r.troops[data.team] = data.troop;
      r.match = createMatch(r.map, r.troops);
      io.to(code).emit("snapshot", r.match);
      ack({ code: key });
      publish(code, r);
    });
    s.on("configure", (data, ack) => {
      const r = rooms.get(code),
        p = r?.seats.find((p) => p.id === s.id);
      const reply = (error?: string) => {
        if (typeof ack === "function") ack(error ? { error } : { ok: true });
      };
      if (!r || !p || r.active) return reply("Configuration is locked.");
      if (!data || typeof data !== "object") return reply("Invalid settings.");
      if (data.map !== undefined) {
        if (r.seats[0].id !== s.id || !MAP_IDS.includes(data.map))
          return reply("Only the host can select an arena.");
        r.map = data.map;
      }
      if (data.troop !== undefined) {
        if (!TROOP_IDS.includes(data.troop)) return reply("Unknown troop.");
        r.troops[p.team] = data.troop;
      }
      r.match = createMatch(r.map, r.troops);
      io.to(code).emit("snapshot", r.match);
      publish(code, r);
      reply();
    });
    s.on("rematch", () => {
      const r = rooms.get(code);
      if (r && !r.active && r.seats[0]?.id === s.id) {
        r.match = createMatch(r.map, r.troops);
        io.to(code).emit("snapshot", r.match);
        publish(code, r);
      }
    });
    s.on("start", () => {
      const r = rooms.get(code);
      if (!r || r.active || r.seats[0]?.id !== s.id) return;
      if (
        ![0, 1].every((t) =>
          ["move", "shoot"].every((role) =>
            r.seats.some(
              (p) => p.team === t && (p.role === role || p.role === "both"),
            ),
          ),
        )
      )
        return;
      r.match = createMatch(r.map, r.troops);
      r.events = [];
      r.active = true;
      activeRooms.add(code);
      metrics.peakRooms = Math.max(metrics.peakRooms, activeRooms.size);
      for (const p of r.seats) {
        p.input = idle();
        p.holding = false;
        p.fireUntil = 0;
        p.last = 0;
      }
      io.to(code).emit("started", r.match);
    });
    s.on("input", (i: Input) => {
      const r = rooms.get(code),
        p = r?.seats.find((p) => p.id === s.id);
      if (!r?.active || !p || !valid(i)) return;
      const now = performance.now();
      p.tokens = Math.min(60, p.tokens + (now - p.refill) * 0.06);
      p.refill = now;
      if (p.tokens < 1) return;
      p.tokens--;
      p.input.x = p.role === "shoot" ? 0 : i.x;
      p.input.y = p.role === "shoot" ? 0 : i.y;
      p.input.angle = i.angle;
      p.input.aimX = i.aimX;
      p.input.aimY = i.aimY;
      const fireAllowed = p.role !== "move" && i.fire;
      p.holding = fireAllowed;
      if (fireAllowed) {
        p.input.fire = true;
        p.fireUntil = now + 220;
      } else if (p.role === "move") {
        p.input.fire = false;
        p.fireUntil = 0;
      }
      p.last = now;
    });
    s.on("leave", leave);
    s.on("disconnect", leave);
  });
  let last = performance.now(),
    acc = 0,
    tick = 0;
  const timer = setInterval(() => {
    const now = performance.now(),
      start = now,
      delta = (now - last) / 1000;
    last = now;
    const total = acc + delta;
    acc = Math.min(total, DT * 5);
    metrics.droppedSeconds += Math.max(0, total - acc);
    let changed = false;
    while (acc >= DT) {
      acc -= DT;
      tick++;
      metrics.ticks++;
      changed = true;
      for (const code of activeRooms) {
        const r = rooms.get(code)!;
        const inputs = [idle(), idle()];
        inputs.forEach((i, t) => (i.angle = r.match.heroes[t].angle));
        for (const p of r.seats) {
          if (now - p.last > 300) continue;
          const i = inputs[p.team];
          if (p.role !== "shoot") {
            i.x = p.input.x;
            i.y = p.input.y;
          }
          if (p.role !== "move") {
            i.angle = p.input.angle;
            i.aimX = p.input.aimX;
            i.aimY = p.input.aimY;
            const ready = r.match.heroes[p.team].cd <= DT;
            i.fire =
              p.input.fire || (p.holding ?? false) || now < (p.fireUntil ?? 0);
            if (ready) {
              p.input.fire = p.holding ?? false;
              if (!p.holding) p.fireUntil = 0;
            }
          }
        }
        step(r.match, inputs);
        metrics.steps++;
        r.events.push(...r.match.events);
        if (r.events.length > 96) r.events.splice(0, r.events.length - 96);
        if (r.match.winner !== null) {
          r.active = false;
          activeRooms.delete(code);
          io.to(code).emit("snapshot", { ...r.match, events: r.events });
          io.to(code).emit("finished", r.match.winner);
          r.events = [];
        }
      }
    }
    if (changed) {
      for (const code of activeRooms) {
        const r = rooms.get(code)!;
        io.to(code).volatile.emit("snapshot", { ...r.match, events: r.events });
        r.events = [];
      }
    }
    if (changed) {
      metrics.tickMs.push(performance.now() - start);
      if (metrics.tickMs.length > 600) metrics.tickMs.shift();
    }
  }, 8);
  return {
    http,
    io,
    rooms,
    metrics,
    close: () => {
      clearInterval(timer);
      return new Promise<void>((resolve) => io.close(() => resolve()));
    },
  };
}
