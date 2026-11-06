# Verification · 3 November 2026

## Automated

- All **24 regression tests pass**, including strict input bounds, room isolation, both controller modes and permissions, configuration/host locks, rematch synchronization, disconnect cleanup, troop stats/cooldowns, direct and splash combat, bombs, slow refresh/expiry, traps, haste respawns, destructible cover, diagonal movement, boundaries, connected routes on all three maps, simultaneous elimination and timeout outcomes.
- Production transport smoke tests pass for direct Express WebSockets, WebSocket-only clients through Next, and polling-only clients through Next. Each pair joined a real room and received live snapshots. Next trailing-slash redirects are disabled for Engine.IO compatibility.
- Strict TypeScript checking and the production frontend/backend build pass. The build prerenders the homepage, arena shell and credits page.
- `scripts/load-test.ts` ran 50 simultaneous matches with 100 independent WebSocket clients for 30.009 seconds. Inputs ran at 30 Hz, simulation at 30 Hz and snapshots at 15 Hz. All 100 clients remained connected and received 450 snapshots each (45,000 total); 45,000 room simulation steps completed with zero dropped simulation seconds.
- Measured callback p95 (rolling final 600 callbacks): 7.8443 ms; maximum: 12.0006 ms. These callbacks include authoritative simulation and snapshot emission. The tick budget is 33.3 ms. Event-loop delay p95: 31.26 ms. Total process RSS, including synthetic clients: 116.37 MiB.
- Full machine-readable evidence is in `artifacts/load-report.json`. This is a local loopback benchmark with server and clients in one process, not a production capacity guarantee or WAN soak test.

## Browser

- The homepage renders official Archer, Wizard, Bomber and Ice Wizard artwork, real Clash fonts and character statistics. Character and arena selection work.
- Create changes the route to `/arena`, replacing the homepage with a full-screen arena. Two independent browser sessions joined opposing teams using a homepage invitation link; its code and opposing side were prefilled correctly.
- Host map selection, troop changes and start worked. Forest Outpost, Frozen Fortress and Ancient Sanctuary all loaded in live multiplayer rounds.
- Keyboard movement and firing were exercised. The Wizard HUD showed a remaining cooldown of 4.6 seconds after a shot, consistent with its five-second interval.
- A live Frozen Fortress round ended by trap elimination with zero credited enemy damage. A Forest round ended naturally at timeout with a draw. Returning to the rematch lobby updated both browser sessions.
- Settings opened within the arena. At 1440 × 1000 the document height matched the viewport, and all checked DOM images loaded. At 1280 × 720 the homepage had no horizontal overflow; the arena document was exactly 720px high and its lobby stayed within the game region (internally scrollable where necessary).
- A browser-only module-resolution failure (`config.js` versus TypeScript source) was found during development and fixed. No errors were reported in the fresh opposing-player browser session after that fix.

## Practical limits

Four individual roles were exercised through independent Socket.IO test clients rather than four simultaneously operated physical computers. No physical Wi-Fi session, public HTTPS deployment, sustained WAN load test or certified 60 FPS benchmark was performed. Troop artwork uses posed sprites, not directional animation sheets. This version supports three maps; missing earlier features and deployment limits are documented in README.md.



## Room-entry crash fix

The join acknowledgement could set lobby visibility before its room payload arrived, causing a null troops lookup. Room and phase now update atomically through a reducer. Acknowledgements cannot open or rewind the lobby, reconnect clears stale data, invalid lobby payloads are rejected, and rendering has null-safe troop lookups. Five regression tests cover acknowledgement ordering, atomic room delivery, late acknowledgements, reconnect and malformed payloads.


After the null-room fix, the production browser successfully created three consecutive rooms (713B5A, 39B91E, A80677) with no console errors. A second browser joined the final room and combat started successfully. The direct/proxied WebSocket and polling smoke tests passed again. Evidence: artifacts/room-entry-fixed.png.

