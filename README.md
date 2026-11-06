# Tandem Tactics

A Next.js character showcase and a dedicated, full-screen multiplayer arena, backed by an authoritative Express/Socket.IO server. Four humans jointly control two champions: one teammate moves, the other aims/fires.

## Launch

Node.js 22.15+ and npm are required (verified on Node 24).

```sh
npm install
npm run dev
```

Open http://localhost:3000. The homepage explains the game and shows Archer, Wizard, Bomber and Ice Wizard stats, shooting intervals, strengths and weaknesses. Select a champion and map, enter a name, and create a room. The page changes to `/arena`; all combat, room controls and results stay inside a viewport-filling game interface.

Share the room code or use the copy-invitation button. Invitation links prefill the code and opposing side on the homepage. A teammate selects a side and controls before joining. Shared-device seats own movement and fire together; individual seats own exactly one function. The host starts when both teams have both functions occupied. Either teammate can select their team's troop in the lobby; the host chooses the map. Settings lock during combat. After results the host returns everyone to the lobby for another round.

Controls: WASD moves; mouse aims; hold left mouse to shoot whenever the server cooldown allows. Escape opens settings and releases your controls without pausing online combat. Focus loss immediately clears client inputs; the server clears stale intentions after 300 ms. Menus adapt to narrow screens; gameplay requires a desktop keyboard and mouse.

## Arenas and mechanics

- Forest Outpost: stone walls, destructible crates, edge streams and bridges.
- Ancient Sanctuary: broken stone passages, pools and flanking routes.
- Frozen Fortress: frosted cover and cyan patches with authoritative movement sliding.

All maps have mirrored spawn positions and connected routes. Static walls and pools block movement; water permits projectiles. Walls and live crates stop projectiles. Crates have 180 HP and synchronized destruction. Decorative edge trees/rocks and flowers are noncollidable.

Spike traps telegraph with a warning color before activating for 1.5 seconds in a five-second cycle. They deal 80 damage with a per-troop 0.8-second damage interval. Environmental damage never increases the opponent's damage score. Blue haste runes give +20% movement speed for three seconds and reduce the current cooldown by 0.5 seconds; they respawn after 20 seconds. These mechanics are simulated on the server.

Troop tuning is centralized in `shared/config.ts`: Archer 1000 HP / 100 damage / 1s interval; Wizard 1200 / up to 450 splash / 5s; Bomber 1100 / up to 260 splash / 3s; Ice Wizard 950 / 140 damage / 2s and a nonstacking 20% slow for one second. Bomb throws are range-clamped, stop before solid cover, and have an explicitly visible 0.8-second fuse. Splash decreases with distance and is radial rather than wall-occluded. Shots are finite, nonhoming and checked in four collision substeps per tick. No self-damage, healing or respawns.

Rounds last 120 seconds. Elimination wins immediately; both teams' damage resolves before deciding a simultaneous draw. Timeout compares actual enemy health removed, excluding overkill and scenery. Trap-caused elimination is valid, while the trap damage adds no score.

## Assets and typography

Actual official Supercell fan-kit troop renders, tree/rock props and Clash Regular/Bold fonts are stored locally. The portraits have been trimmed/resized to WebP; separate small sprites are loaded for combat. See `ASSETS.md` and `/credits` for exact sources, transformations and attribution. This is unofficial fan content and is not endorsed by Supercell.

## Backend and rendering optimization

- The homepage starts no game socket or rendering loop. The game route loads its canvas client separately.
- Static terrain and official props are composited once into a cached offscreen canvas. Dynamic cover, hazards, projectiles and hit feedback draw over it. React HUD updates at 10 Hz; rendering stays outside React.
- A single bounded accumulator drives 30 Hz authoritative simulation. Only active rooms are traversed; empty rooms are removed immediately.
- Snapshots are room-isolated, emitted at 15 Hz, and volatile during combat to avoid queues on slow connections. Final state is sent reliably. Short-lived event batches preserve feedback across simulation ticks.
- Inputs are validated, role-restricted, token-bucket limited and bounded to 2 KB messages. Per-room projectiles, effect batches and client particles are bounded. WebSocket compression is disabled to avoid compression work on small frequent messages.
- Cached local assets use one-day caching with stale revalidation. `MAX_ROOMS` (default 200) is a resource guard, not a certified capacity target.

`artifacts/load-report.json` records a 30-second local benchmark of **50 simultaneous matches / 100 teams / 100 shared-device clients**, sending inputs at 30 Hz. It received all 45,000 expected snapshots, with no dropped simulation time. The simulation/network tick p95 across the final 600 measured callbacks was 7.84 ms; its maximum was 12.00 ms against a 33.3 ms tick budget. The server and synthetic clients shared one process/machine; this is a bounded local result, not a production or high-latency capacity guarantee.

```sh
npm test
npm run typecheck
npm run test:load
npm run build
npm start
```

Set `BENCH_ROOMS` and `BENCH_SECONDS` in the process environment for other load-test sizes. The benchmark owns an ephemeral server and cleans up its clients. It writes its measurements to `artifacts/load-report.json`.

## Wi-Fi and deployment

Copy `.env.example` to `.env.local` to customize settings. Next uses `PORT` (default 3000); Express uses `BACKEND_PORT` (default 3001), avoiding port collisions when both services run together. Both development and production backend commands load `.env.local`.

For Wi-Fi play use the host's LAN address, such as `http://192.168.0.104:3000`, on every device. Include that exact origin in `ALLOWED_ORIGINS` and allow private-network traffic in your firewall. Share invites from the LAN URL; localhost invitations only work on the same computer.

For production run `npm run build`, then `npm start`. Use an HTTPS reverse proxy: route `/socket.io/`, including WebSocket upgrades, directly to Express; route other traffic to Next. The Next rewrite preserves the trailing slash required by Engine.IO, and trailing-slash redirects are disabled so both WebSocket upgrades and polling work. Run npm run test:smoke while the app is running to verify both transports end to end. Allow exact production frontend origins and use HTTPS/WSS consistently. Separately hosted frontends can set `NEXT_PUBLIC_SERVER_URL` before building.

Rooms live in one process. Disconnecting a required player stops the round and releases that seat; there is no private reconnect grace period in this version. Server restarts clear rooms. Horizontal scaling requires assigning each room to one simulation owner and routing its clients there; a Redis Socket.IO adapter alone does not distribute game simulation. Accounts, public matchmaking, persistence and a practice bot are outside this version.

See `VERIFICATION.md` for the checks actually performed and their limits.


