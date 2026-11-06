"use client";
import { useEffect, useRef, useState, useReducer } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { createMatch, idle, type Match } from "../shared/game";
import {
  TROOPS,
  TROOP_IDS,
  MAPS,
  MAP_IDS,
  type TroopId,
  type MapId,
} from "../shared/config";
import { createRenderer } from "./renderer";
import { MapMini } from "./Home";
import {initialEntry,reduceEntry,isLobby,type Phase} from '../shared/room-entry';
const clock = (t: number) =>
  `${Math.floor(Math.max(0, t) / 60)}:${Math.floor(Math.max(0, t) % 60)
    .toString()
    .padStart(2, "0")}`;
export default function Game() {
  const canvas = useRef<HTMLCanvasElement>(null),
    socket = useRef<Socket | null>(null),
    latest = useRef<Match>(createMatch()),
    active = useRef(false),
    team = useRef(0),
    version = useRef(0),
    reducedRef = useRef(false);
  const [{room,phase},dispatchEntry]=useReducer(reduceEntry,initialEntry);
  const setPhase=(phase:Phase)=>dispatchEntry({type:'phase',phase});
  const [hud, setHud] = useState(createMatch()),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [settings, setSettings] = useState(false),
    [reduced, setReduced] = useState(false),
    [id, setId] = useState("");
  const playing = phase === "playing",
    host = room?.host === id;
  useEffect(() => {
    reducedRef.current = reduced;
    active.current = playing && !settings;
    if (playing && !settings) {
      requestAnimationFrame(() => canvas.current?.focus({ preventScroll: true }));
    }
  }, [reduced, playing, settings]);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    team.current = p.get("team") === "1" ? 1 : 0;
    const role = ["move", "shoot"].includes(p.get("role") || "")
      ? p.get("role")!
      : "both";
    const request = {
      code: p.get("room") || "",
      name: p.get("name") || "Adventurer",
      team: team.current,
      role,
      troop: p.get("troop") || "archer",
      map: p.get("map") || "forest",
    };
    const s = io(process.env.NEXT_PUBLIC_SERVER_URL || undefined, {
      reconnection: true,
      extraHeaders: {
        "ngrok-skip-browser-warning": "true",
      },
    });
    socket.current = s;
    s.on("connect", () => {
      setId(s.id || "");
      setError("");
      setPhase("connecting");
      s.timeout(5000).emit(
        "join",
        request,
        (err: Error | null, r: { code?: string; error?: string }) => {
          if (err || r?.error || !r?.code) {
            setError(
              r?.error ||
                "Room request timed out. Check your server connection.",
            );
            setPhase("error");
            return;
          }
          request.code = r.code!;
          const url = new URL(location.href);
          url.searchParams.set("room", r.code!);
          history.replaceState(null, "", url);
          dispatchEntry({type:'ack'});
        },
      );
    });
    s.on("connect_error", () => {
      setError(
        "Cannot reach the arena server. Make sure both services are running.",
      );
      setPhase("error");
    });
    s.on("disconnect", () => {
      active.current = false;
      setPhase("connecting");
      setNotice(
        "Connection lost. Reconnecting and trying to restore your role…",
      );
    });
    s.on("lobby", (r: unknown) => {
      if(!isLobby(r)){setError('The server returned incomplete room data. Please create or join the room again.');setPhase('error');return;}
      dispatchEntry({type:'lobby',room:r});
      active.current = false;
      version.current++;
    });
    s.on("snapshot", (m: Match) => {
      latest.current = m;
    });
    s.on("started", (m: Match) => {
      latest.current = m;
      setHud(m);
      version.current++;
      active.current = true;
      setPhase("playing");
      setSettings(false);
      setNotice("");
      requestAnimationFrame(() => canvas.current?.focus({ preventScroll: true }));
    });
    s.on("finished", () => {
      active.current = false;
      setPhase("results");
    });
    s.on("notice", (n: string) => setNotice(n));
    const timer = setInterval(() => setHud({ ...latest.current }), 100);
    return () => {
      clearInterval(timer);
      s.removeAllListeners();
      s.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!canvas.current) return;
    return createRenderer(canvas.current, {
      getMatch: () => latest.current,
      getTeam: () => team.current,
      isActive: () => active.current,
      getVersion: () => version.current,
      send: (i) => socket.current?.emit("input", i),
      reduced: () => reducedRef.current,
    });
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettings((v) => !v);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  const configure = (data: { map?: MapId; troop?: TroopId }) =>
    socket.current
      ?.timeout(4000)
      .emit("configure", data, (e: Error | null, r: { error?: string }) => {
        if (e || r?.error) setNotice(r?.error || "Could not update the room.");
      });
  const copy = async () => {
    if (!room) return;
    try {
      const url = new URL(location.origin + "/");
      url.hash = "play";
      url.searchParams.set("room", room.code);
      url.searchParams.set("team", String(1 - team.current));
      await navigator.clipboard.writeText(url.href);
      setNotice(
        "Invite link copied. Your friend can pick a team and role on the homepage.",
      );
    } catch {
      setNotice("Share room code " + room.code);
    }
  };
  const selectedTroops = room?.troops ?? hud.heroes.map(h=>h.troop);
  const complete =
    room &&
    [0, 1].every((t) =>
      ["move", "shoot"].every((role) =>
        room.seats.some(
          (p) => p.team === t && (p.role === role || p.role === "both"),
        ),
      ),
    );
  const leave = () => {
    socket.current?.emit("leave");
    active.current = false;
    location.href = "/";
  };
  return (
    <div className="game-shell">
      <header className="game-header">
        <Link
          href="/"
          className="game-wordmark"
          onClick={() => socket.current?.emit("leave")}
        >
          ⚔ TANDEM
        </Link>
        <span className="game-map-name">⌖ {MAPS[hud.map].name}</span>
        <div>
          <button
            className="code-button"
            onClick={() => void copy()}
            title="Copy room invitation"
          >
            ROOM {room?.code || "…"} ⧉
          </button>
          <button
            className="icon-button"
            title="Settings"
            onClick={() => setSettings(true)}
          >
            ⚙
          </button>
          <button className="icon-button" title="Exit arena" onClick={leave}>
            ↗
          </button>
        </div>
      </header>
      <div className="battle-score">
        <div className="team-score blue">
          <span className="shield">Ⅰ</span>
          <div>
            <b>TEAM BLUE</b>
            <small>
              DAMAGE <strong>{hud.damage[0]}</strong>
            </small>
          </div>
          <div className="score-health">
            <span>
              {hud.heroes[0].hp}{" "}
              <small>/ {TROOPS[hud.heroes[0].troop].health} HP</small>
            </span>
            <i
              style={{
                width: `${(hud.heroes[0].hp / TROOPS[hud.heroes[0].troop].health) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="battle-clock">
          <strong>{clock(hud.time)}</strong>
          <small>
            {phase === "playing" ? "BATTLE LIVE" : "TWO MINDS. ONE HERO."}
          </small>
        </div>
        <div className="team-score red">
          <div className="score-health">
            <span>
              {hud.heroes[1].hp}{" "}
              <small>/ {TROOPS[hud.heroes[1].troop].health} HP</small>
            </span>
            <i
              style={{
                width: `${(hud.heroes[1].hp / TROOPS[hud.heroes[1].troop].health) * 100}%`,
              }}
            />
          </div>
          <div>
            <b>TEAM RED</b>
            <small>
              DAMAGE <strong>{hud.damage[1]}</strong>
            </small>
          </div>
          <span className="shield">Ⅱ</span>
        </div>
      </div>
      <div className="game-stage">
        <div className="canvas-wrap">
          <canvas
            ref={canvas}
            width={1200}
            height={700}
            tabIndex={0}
            aria-label="Fantasy arena battlefield"
          />
          <span className="stage-tag">
            RANDOM TRAPS · BREAKABLE TIMBER · SPELL PICKUPS
          </span>
        </div>
        {(phase === "lobby" || phase === "connecting" || phase === "error") && (
          <div className="arena-overlay">
            <section className="arena-lobby">
              {phase === "connecting" || (phase === "lobby" && !room) ? (
                <>
                  <span className="eyebrow">PREPARING YOUR CHAMPION</span>
                  <h2>Entering the arena…</h2>
                  <p>Connecting to the battle server.</p>
                </>
              ) : phase === "error" ? (
                <>
                  <span className="eyebrow">A LITTLE DETOUR</span>
                  <h2>Couldn’t enter the arena.</h2>
                  <p role="alert">{error}</p>
                  <button className="gold" onClick={leave}>
                    BACK TO HOME →
                  </button>
                </>
              ) : (
                <>
                  <div className="lobby-title">
                    <div>
                      <span className="eyebrow">YOUR NEXT GREAT TEAM-UP</span>
                      <h2>Rally your team.</h2>
                    </div>
                    <button className="invite-chip" onClick={() => void copy()}>
                      <small>ROOM CODE · COPY INVITE</small>
                      <b>{room?.code} ⧉</b>
                    </button>
                  </div>
                  <div className="lobby-teams">
                    {[0, 1].map((t) => (
                      <div
                        className={`lobby-team ${t ? "red" : "blue"}`}
                        key={t}
                      >
                        <div className="lobby-team-title">
                          <span>TEAM {t ? "RED" : "BLUE"}</span>
                          <b>{team.current === t ? "YOUR TEAM" : ""}</b>
                        </div>
                        <div className="team-hero-preview">
                          <img
                            src={TROOPS[selectedTroops[t]].image}
                            alt={TROOPS[selectedTroops[t]].name}
                          />
                          <div>
                            <h3>{TROOPS[selectedTroops[t]].name}</h3>
                            <p>
                              {TROOPS[selectedTroops[t]].interval}s shooting
                              interval
                            </p>
                          </div>
                        </div>
                        <div className="role-seats">
                          {["move", "shoot"].map((role) => {
                            const p = room?.seats.find(
                              (p) =>
                                p.team === t &&
                                (p.role === "both" || p.role === role),
                            );
                            return (
                              <div key={role}>
                                <span>
                                  {role === "move" ? "⌘ MOVE" : "⌖ AIM + FIRE"}
                                </span>
                                <b>{p?.name || "Waiting for teammate…"}</b>
                              </div>
                            );
                          })}
                        </div>
                        {team.current === t && (
                          <label className="troop-select">
                            YOUR TEAM’S CHAMPION
                            <select
                              value={selectedTroops[t]}
                              onChange={(e) =>
                                configure({ troop: e.target.value as TroopId })
                              }
                            >
                              {TROOP_IDS.map((i) => (
                                <option value={i} key={i}>
                                  {TROOPS[i].name} · {TROOPS[i].interval}s
                                  interval
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="lobby-map-heading">
                    <b>CHOOSE YOUR BATTLEGROUND</b>
                    <small>
                      {host ? "HOST’S PICK" : "THE HOST SELECTS THE MAP"}
                    </small>
                  </div>
                  <div className="lobby-map-grid">
                    {MAP_IDS.map((m) => (
                      <button
                        key={m}
                        className={`map-pick ${room?.map === m ? "chosen" : ""}`}
                        disabled={!host}
                        onClick={() => configure({ map: m })}
                      >
                        <MapMini id={m} />
                        <span>{MAPS[m].name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="lobby-bottom">
                    <p>
                      {complete
                        ? "Both heroes have movement and fire controls."
                        : `Share the code. Each team needs movement and shooting roles.`}
                    </p>
                    <button
                      className="gold"
                      disabled={!host || !complete}
                      onClick={() => socket.current?.emit("start")}
                    >
                      {!host
                        ? "WAITING FOR HOST"
                        : !complete
                          ? "WAITING FOR TEAMMATES"
                          : "START BATTLE ⚔"}
                    </button>
                  </div>
                  <div className="lobby-tip">
                    ⚠ Traps glow before striking. Pickups: haste, +250 HP, 5s rage.
                    WASD + mouse to play.
                  </div>
                </>
              )}
            </section>
          </div>
        )}
        {phase === "results" && (
          <div className="arena-overlay">
            <section className="result-card">
              <span className="result-crown">
                {hud.winner === -1 ? "⚖" : "♛"}
              </span>
              <span className="eyebrow">ROUND COMPLETE</span>
              <h1>
                {hud.winner === -1
                  ? "Evenly matched."
                  : `Team ${hud.winner === 0 ? "Blue" : "Red"} wins!`}
              </h1>
              <p>
                {hud.time <= 0
                  ? "Time expired · most damage wins"
                  : "Elimination · a champion has fallen"}
              </p>
              <div className="result-totals">
                <div className="blue">
                  <b>{hud.damage[0]}</b>
                  <small>BLUE DAMAGE</small>
                </div>
                <span>VS</span>
                <div className="red">
                  <b>{hud.damage[1]}</b>
                  <small>RED DAMAGE</small>
                </div>
              </div>
              <div className="result-actions">
                <button
                  className="gold"
                  disabled={!host}
                  onClick={() => socket.current?.emit("rematch")}
                >
                  {host ? "BACK TO LOBBY ↗" : "WAITING FOR HOST"}
                </button>
                <button className="steel" onClick={leave}>
                  LEAVE ARENA
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
      <footer className="game-controls">
        {[0, 1].map((t) => {
          const h = hud.heroes[t],
            def = TROOPS[h.troop];
          return (
            <div className={`hero-control ${t ? "red" : "blue"}`} key={t}>
              <img src={def.image} alt={def.name} />
              <div>
                <small>
                  TEAM {t ? "RED" : "BLUE"}{" "}
                  {team.current === t ? "· YOUR HERO" : ""}
                </small>
                <h3>{def.name}</h3>
                <div className="control-names">
                  <span>
                    ⌘{" "}
                    {room?.seats.find(
                      (p) =>
                        p.team === t &&
                        (p.role === "move" || p.role === "both"),
                    )?.name || "Movement"}
                  </span>
                  <span>
                    ⌖{" "}
                    {room?.seats.find(
                      (p) =>
                        p.team === t &&
                        (p.role === "shoot" || p.role === "both"),
                    )?.name || "Shooting"}
                  </span>
                </div>
              </div>
              <div
                className={`cooldown ${h.cd < 0.01 ? "ready" : ""}`}
                style={
                  {
                    "--cooldown": `${(1 - h.cd / def.interval) * 360}deg`,
                  } as React.CSSProperties
                }
              >
                <span>
                  {h.troop === "ice"
                    ? "❄"
                    : h.troop === "archer"
                      ? "➶"
                      : h.troop === "bomber"
                        ? "💣"
                        : h.troop === "wizard"
                          ? "🔥"
                          : h.troop === "musketeer"
                            ? "⚡"
                            : h.troop === "dart"
                              ? "🎋"
                              : h.troop === "princess"
                                ? "👑"
                                : h.troop === "colt"
                                  ? "🔫"
                                  : h.troop === "magic_archer"
                                    ? "✨"
                                    : "🎆"}
                </span>
                <b>{h.cd < 0.01 ? "READY" : h.cd.toFixed(1) + "s"}</b>
              </div>
            </div>
          );
        })}
      </footer>
      {notice && (
        <div className="game-notice" role="status">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {settings && (
        <div className="settings-backdrop">
          <section
            className="settings-card"
            role="dialog"
            aria-modal="true"
            aria-label="Arena settings"
          >
            <span className="eyebrow">TAKE A BREATHER</span>
            <h2>Arena settings</h2>
            <p>
              The online battle continues while this panel is open. Your
              movement and fire controls are released.
            </p>
            <label>
              Reduced motion
              <input
                type="checkbox"
                checked={reduced}
                onChange={(e) => setReduced(e.target.checked)}
              />
            </label>
            <div className="brief-controls">
              <p>
                <kbd>W A S D</kbd> Movement
              </p>
              <p>⌖ Mouse · aim & left-click fire</p>
              <p>◈ Haste: +20% speed for 3s. Heal: +250 HP. Rage: 45% faster intervals for 5s.</p>
              <p>⚠ Traps: 80 environmental damage, no damage-score credit</p>
            </div>
            <button
              className="gold"
              onClick={() => {
                setSettings(false);
                canvas.current?.focus();
              }}
            >
              BACK TO BATTLE →
            </button>
            <button className="steel" onClick={leave}>
              LEAVE ARENA
            </button>
          </section>
        </div>
      )}
    </div>
  );
}