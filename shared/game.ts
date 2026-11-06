import {
  MAPS,
  TROOPS,
  type TroopId,
  type MapId,
  type Obstacle,
  type Trap,
} from "./config";
export { TROOPS, MAPS };
export const W = 1200,
  H = 700,
  DT = 1 / 30;
export type Input = {
  x: number;
  y: number;
  angle: number;
  fire: boolean;
  aimX?: number;
  aimY?: number;
};
export type Hero = {
  x: number;
  y: number;
  hp: number;
  angle: number;
  cd: number;
  troop: TroopId;
  slow: number;
  haste: number;
  rapid: number;
  vx: number;
  vy: number;
  trapCd: number;
};
export type Shot = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: number;
  life: number;
  troop: TroopId;
  targetX: number;
  targetY: number;
  fuse: number;
};
export type GameEvent = {
  id: number;
  kind: "shot" | "hit" | "blast" | "trap" | "rune";
  x: number;
  y: number;
  team: number;
  amount: number;
};
export type Match = {
  heroes: Hero[];
  shots: Shot[];
  time: number;
  elapsed: number;
  damage: number[];
  winner: number | null;
  map: MapId;
  crates: Record<string, number>;
  runes: number[];
  traps: Trap[];
  pickups: { x: number; y: number; kind: "haste" | "heal" | "rapid" }[];
  seed: number;
  events: GameEvent[];
  nextId: number;
};
export const walls = MAPS.forest.obstacles.filter((o) => o.kind === "wall");
export const idle = (): Input => ({ x: 0, y: 0, angle: 0, fire: false });
export function valid(i: Input) {
  return (
    !!i &&
    [i.x, i.y, i.angle].every(Number.isFinite) &&
    Math.abs(i.x) <= 1 &&
    Math.abs(i.y) <= 1 &&
    Math.abs(i.angle) <= Math.PI * 2 &&
    typeof i.fire === "boolean" &&
    (i.aimX === undefined ||
      (Number.isFinite(i.aimX) && i.aimX >= 0 && i.aimX <= W)) &&
    (i.aimY === undefined ||
      (Number.isFinite(i.aimY) && i.aimY >= 0 && i.aimY <= H))
  );
}
export function createMatch(
  map: MapId = "forest",
  troops: TroopId[] = ["archer", "archer"],
  seed = Math.floor(Math.random() * 0xffffffff),
): Match {
  const layout = roundLayout(map, seed);
  return {
    heroes: [0, 1].map((t) => ({
      x: t ? 1030 : 170,
      y: 350,
      hp: TROOPS[troops[t]].health,
      angle: t ? Math.PI : 0,
      cd: 0,
      troop: troops[t],
      slow: 0,
      haste: 0,
      rapid: 0,
      vx: 0,
      vy: 0,
      trapCd: 0,
    })),
    shots: [],
    time: 120,
    elapsed: 0,
    damage: [0, 0],
    winner: null,
    map,
    crates: Object.fromEntries(
      MAPS[map].obstacles
        .filter((o) => o.kind === "crate")
        .map((o) => [o.id, 180]),
    ),
    runes: layout.pickups.map(() => 0),
    ...layout,
    seed,
    events: [],
    nextId: 1,
  };
}
// Seeded once by the authoritative server, mirrored for equal team access.
export function roundLayout(map: MapId, seed: number) {
  let state = seed >>> 0;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const pickups: Match["pickups"] = [
    { x: 600, y: 68, kind: "haste" },
    { x: 600, y: 632, kind: "haste" },
    { x: 205, y: 82, kind: "heal" },
    { x: 995, y: 618, kind: "heal" },
    { x: 205, y: 618, kind: "rapid" },
    { x: 995, y: 82, kind: "rapid" },
  ];
  const traps: Trap[] = [];
  for (let attempt = 0; attempt < 300 && traps.length < 6; attempt++) {
    const x = 250 + random() * 280,
      y = 105 + random() * 490,
      radius = 20;
    const pair = [
      { x, y, radius, offset: random() * 1.5 },
      { x: 1200 - x, y: 700 - y, radius, offset: 0 },
    ];
    pair[1].offset = pair[0].offset;
    if (
      pair.some(
        (p) =>
          Math.abs(p.y - 350) < 42 ||
          MAPS[map].obstacles.some((o) => touches(p.x, p.y, 46, o)) ||
          pickups.some((r) => Math.hypot(r.x - p.x, r.y - p.y) < 85) ||
          traps.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 115) ||
          [170, 1030].some((s) => Math.hypot(s - p.x, 350 - p.y) < 190),
      )
    )
      continue;
    traps.push(...pair);
  }
  return { traps, pickups };
}
export function touches(x: number, y: number, r: number, o: Obstacle) {
  if(o.kind === "water") {
    return ((x-o.x-o.w/2)/(o.w/2+r))**2 + ((y-o.y-o.h/2)/(o.h/2+r))**2 < 1;
  }
  return (
    (x - Math.max(o.x, Math.min(x, o.x + o.w))) ** 2 +
      (y - Math.max(o.y, Math.min(y, o.y + o.h))) ** 2 <
    r * r
  );
}
export function blocked(
  x: number,
  y: number,
  r = 20,
  m?: Match,
  projectile = false,
) {
  return (
    x < r ||
    y < r ||
    x > W - r ||
    y > H - r ||
    (m ? MAPS[m.map].obstacles : walls).some(
      (o) =>
        o.kind !== "ice" &&
        (!projectile || o.kind !== "water") &&
        (o.kind !== "crate" || !m || m.crates[o.id] > 0) &&
        touches(x, y, r, o),
    )
  );
}
export function trapActive(elapsed: number, offset: number) {
  return (elapsed + offset) % 5 >= 3.5;
}
export function step(m: Match, inputs: Input[]) {
  if (m.winner !== null) return;
  m.events.length = 0;
  m.time = Math.max(0, m.time - DT);
  m.elapsed += DT;
  const damage = [0, 0],
    environment = [0, 0],
    map = MAPS[m.map];
  const event = (
    kind: GameEvent["kind"],
    x: number,
    y: number,
    team: number,
    amount = 0,
  ) => m.events.push({ id: m.nextId++, kind, x, y, team, amount });
  const explode = (p: Shot, direct = false) => {
    const def = TROOPS[p.troop],
      enemy = m.heroes[1 - p.team],
      enemyY = Math.max(enemy.y - 26, Math.min(p.y, enemy.y + 8)),
      dist = Math.hypot(enemy.x - p.x, enemyY - p.y);
    if (def.splash) {
      event("blast", p.x, p.y, p.team);
      if (dist < def.splash + 24)
        damage[1 - p.team] += direct
          ? def.damage
          : Math.round(
              def.damage * Math.max(0, 1 - Math.max(0, dist - 24) / def.splash),
            );
      for (const o of map.obstacles)
        if (
          o.kind === "crate" &&
          m.crates[o.id] > 0 &&
          touches(p.x, p.y, def.splash, o)
        )
          m.crates[o.id] = Math.max(0, m.crates[o.id] - def.damage);
    } else if (direct) {
      damage[1 - p.team] += def.damage;
      if (p.troop === "ice") enemy.slow = 1;
    }
  };
  m.heroes.forEach((h, t) => {
    const i = inputs[t],
      def = TROOPS[h.troop],
      n = Math.max(1, Math.hypot(i.x, i.y));
    h.slow = Math.max(0, h.slow - DT);
    h.haste = Math.max(0, h.haste - DT);
    h.rapid = Math.max(0, h.rapid - DT);
    h.trapCd = Math.max(0, h.trapCd - DT);
    const speed = def.speed * (h.slow > 0 ? 0.8 : 1) * (h.haste > 0 ? 1.2 : 1),
      ice = map.obstacles.some(
        (o) => o.kind === "ice" && touches(h.x, h.y, 20, o),
      ),
      blend = ice ? 1 - Math.exp(-DT * 4) : 1;
    h.vx += ((i.x / n) * speed - h.vx) * blend;
    h.vy += ((i.y / n) * speed - h.vy) * blend;
    const x = h.x + h.vx * DT,
      y = h.y + h.vy * DT;
    if (!blocked(x, h.y, 20, m)) h.x = x;
    else h.vx = 0;
    if (!blocked(h.x, y, 20, m)) h.y = y;
    else h.vy = 0;
    h.angle = i.angle;
    h.cd = Math.max(0, h.cd - DT);
    if (i.fire && h.cd === 0 && m.shots.length < 64) {
      h.cd = def.interval * (h.rapid > 0 ? 0.55 : 1);
      const dist = Math.min(
        def.range,
        Math.hypot(
          (i.aimX ?? h.x + Math.cos(i.angle) * def.range) - h.x,
          (i.aimY ?? h.y + Math.sin(i.angle) * def.range) - h.y,
        ),
      );
      let tx = h.x + Math.cos(i.angle) * dist,
        ty = h.y + Math.sin(i.angle) * dist;
      if (h.troop === "bomber") {
        for (let d = 8; d < dist; d += 8) {
          const px = h.x + Math.cos(i.angle) * d,
            py = h.y + Math.sin(i.angle) * d;
          if (blocked(px, py, 8, m, true)) {
            tx = h.x + Math.cos(i.angle) * Math.max(0, d - 16);
            ty = h.y + Math.sin(i.angle) * Math.max(0, d - 16);
            break;
          }
        }
      }
      m.shots.push({
        id: m.nextId++,
        x: h.x,
        y: h.y,
        vx: Math.cos(i.angle) * def.shotSpeed,
        vy: Math.sin(i.angle) * def.shotSpeed,
        team: t,
        life: def.range / def.shotSpeed,
        troop: h.troop,
        targetX: tx,
        targetY: ty,
        fuse: -1,
      });
      event("shot", h.x, h.y, t);
    }
    for (const trap of m.traps)
      if (
        h.trapCd === 0 &&
        trapActive(m.elapsed, trap.offset) &&
        Math.hypot(h.x - trap.x, h.y - trap.y) < trap.radius + 6
      ) {
        environment[t] += 80;
        h.trapCd = 0.8;
        event("trap", h.x, h.y, t, 80);
      }
  });
  m.shots = m.shots.filter((p) => {
    const def = TROOPS[p.troop];
    if (p.troop === "bomber") {
      if (p.fuse < 0) {
        const d = Math.hypot(p.targetX - p.x, p.targetY - p.y);
        if (d < def.shotSpeed * DT) {
          p.x = p.targetX;
          p.y = p.targetY;
          p.fuse = 0.8;
        } else {
          p.x += ((p.targetX - p.x) / d) * def.shotSpeed * DT;
          p.y += ((p.targetY - p.y) / d) * def.shotSpeed * DT;
        }
      } else {
        p.fuse -= DT;
        if (p.fuse <= 0) {
          explode(p);
          return false;
        }
      }
      return true;
    }
    p.life -= DT;
    const enemy = m.heroes[1 - p.team];
    for (let j = 0; j < 8; j++) {
      p.x += (p.vx * DT) / 8;
      p.y += (p.vy * DT) / 8;
      if (blocked(p.x, p.y, 4, m, true)) {
        for (const o of map.obstacles)
          if (
            o.kind === "crate" &&
            m.crates[o.id] > 0 &&
            touches(p.x, p.y, 5, o)
          )
            m.crates[o.id] = Math.max(0, m.crates[o.id] - def.damage);
        explode(p);
        return false;
      }
      const enemyY = Math.max(enemy.y - 26, Math.min(p.y, enemy.y + 8));
      if (Math.hypot(p.x - enemy.x, p.y - enemyY) < 28) {
        explode(p, true);
        return false;
      }
    }
    return p.life > 0;
  });
  m.runes = m.runes.map((cd, index) => {
    cd = Math.max(0, cd - DT);
    if (cd === 0) {
      const rune = m.pickups[index],
        t = m.heroes.findIndex(
          (h) => Math.hypot(h.x - rune.x, h.y - rune.y) < 24,
        );
      if (t >= 0) {
        const h=m.heroes[t];
        let healed=0;
        if(rune.kind === "haste") { h.haste = 3; h.cd = Math.max(0,h.cd-0.5); }
        if(rune.kind === "rapid") { h.rapid=5; h.cd*=0.55; }
        if(rune.kind === "heal") { healed=Math.min(250,TROOPS[h.troop].health-h.hp); h.hp+=healed; }
        event("rune", rune.x, rune.y, t, healed);
        return 20;
      }
    }
    return cd;
  });
  m.heroes.forEach((h, t) => {
    const actual = Math.min(h.hp, damage[t]);
    h.hp -= actual;
    m.damage[1 - t] += actual;
    if (actual) event("hit", h.x, h.y, t, actual);
    h.hp = Math.max(0, h.hp - environment[t]);
  });
  const dead = m.heroes.map((h) => h.hp === 0);
  if (dead[0] || dead[1]) m.winner = dead[0] && dead[1] ? -1 : dead[0] ? 1 : 0;
  else if (!m.time)
    m.winner =
      m.damage[0] === m.damage[1] ? -1 : m.damage[0] > m.damage[1] ? 0 : 1;
}
