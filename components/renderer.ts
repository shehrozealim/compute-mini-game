import { asset, SCENERY, paintTerrain, paintProp, paintCrate } from "./scenery";
import { MAPS, TROOPS, TROOP_IDS, type MapId, type TroopId } from "../shared/config";
import { W, H, idle, trapActive, type Match, type Input, type Shot } from "../shared/game";
type Options = {
  getMatch: () => Match;
  getTeam: () => number;
  isActive: () => boolean;
  send: (i: Input) => void;
  getVersion: () => number;
  reduced: () => boolean;
};
const images = new Map<string, HTMLImageElement>();
function load(src: string) {
  if (images.has(src)) return images.get(src)!;
  const img = new Image();
  img.src = src;
  images.set(src, img);
  return img;
}
function rounded(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 5,
) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
export function createRenderer(canvas: HTMLCanvasElement, o: Options) {
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const bg = document.createElement("canvas");
  bg.width = W;
  bg.height = H;
  const g = bg.getContext("2d")!;
  const sprites = Object.fromEntries(
    TROOP_IDS.map((id) => [id, load(`/assets/${id}-sprite.webp`)]),
  );
  let lastMap = "",
    loaded = false,
    frame = 0,
    lastSend = 0,
    previous = performance.now(),
    version = o.getVersion();
  const display = [
      { x: 170, y: 350 },
      { x: 1030, y: 350 },
    ],
    seen = new Set<number>();
  const effects: {
    x: number;
    y: number;
    life: number;
    kind: string;
    amount: number;
    team: number;
  }[] = [];
  function terrain(id: MapId) { paintTerrain(g,id); }
  const keys = new Set<string>(),
    input = idle(),
    aim = { x: 600, y: 350 };
  let aimSet = false,
    holdingFire = false,
    pendingShot = false,
    fireLatchUntil = 0;
  const syncInput = () => {
    const m = o.getMatch(),
      h = m.heroes[o.getTeam()];
    const now = performance.now();
    if (pendingShot && h.cd > 0.12) {
      pendingShot = false;
      if (!holdingFire) fireLatchUntil = 0;
    }
    if (now >= fireLatchUntil) {
      pendingShot = false;
    }
    input.x =
      Number(keys.has("d") || keys.has("arrowright")) -
      Number(keys.has("a") || keys.has("arrowleft"));
    input.y =
      Number(keys.has("s") || keys.has("arrowdown")) -
      Number(keys.has("w") || keys.has("arrowup"));
    input.angle = aimSet ? Math.atan2(aim.y - h.y, aim.x - h.x) : h.angle;
    input.aimX = aimSet ? aim.x : Math.max(0, Math.min(W, h.x + Math.cos(h.angle) * 320));
    input.aimY = aimSet ? aim.y : Math.max(0, Math.min(H, h.y + Math.sin(h.angle) * 320));
    input.fire = holdingFire || pendingShot || now < fireLatchUntil;
  };
  const triggerFire = () => {
    holdingFire = true;
    pendingShot = true;
    fireLatchUntil = performance.now() + 320;
    if (o.isActive()) {
      syncInput();
      input.fire = true;
      o.send({ ...input, fire: true });
      lastSend = performance.now();
    }
  };
  const clear = () => {
    keys.clear();
    holdingFire = false;
    pendingShot = false;
    fireLatchUntil = 0;
    input.x = 0;
    input.y = 0;
    input.fire = false;
    if (o.isActive()) o.send({ ...input });
  };
  const onBlur = () => {
    keys.clear();
    holdingFire = false;
    input.x = 0;
    input.y = 0;
    if (performance.now() >= fireLatchUntil) {
      pendingShot = false;
      input.fire = false;
      if (o.isActive()) o.send({ ...input });
    }
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") clear();
  };
  const isUiControl = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return !!el?.closest?.("button, select, input, textarea, a, label, summary, [role='dialog']");
  };
  const down = (e: KeyboardEvent) => {
    if (isUiControl(e.target) && (e.target as HTMLElement).tagName !== "CANVAS") {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
    }
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      e.preventDefault();
      keys.add(k);
      if (o.isActive()) {
        syncInput();
        o.send({ ...input });
        lastSend = performance.now();
      }
      return;
    }
    if (k === " " || k === "spacebar" || k === "f") {
      e.preventDefault();
      triggerFire();
    }
  };
  const up = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    keys.delete(k);
    if (k === " " || k === "spacebar" || k === "f") {
      holdingFire = false;
    }
  };
  const move = (e: MouseEvent | PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    aim.x = Math.max(0, Math.min(W, ((e.clientX - r.left) * W) / r.width));
    aim.y = Math.max(0, Math.min(H, ((e.clientY - r.top) * H) / r.height));
    aimSet = true;
  };
  const press = (e: MouseEvent | PointerEvent) => {
    if (isUiControl(e.target)) return;
    if (e.button === 0 || e.button === 2) {
      if (e.target === canvas) e.preventDefault();
      move(e);
      canvas.focus({ preventScroll: true });
      triggerFire();
    }
  };
  const release = (e: MouseEvent | PointerEvent) => {
    if (e.button === 0 || e.button === 2) {
      holdingFire = false;
    }
  };
  const context = (e: Event) => e.preventDefault();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pointermove", move);
  window.addEventListener("mousemove", move);
  window.addEventListener("pointerdown", press);
  canvas.addEventListener("mousedown", press);
  canvas.addEventListener("contextmenu", context);
  window.addEventListener("pointerup", release);
  window.addEventListener("mouseup", release);
  function draw(now: number) {
    const dt = Math.min(0.1, (now - previous) / 1000);
    previous = now;
    const m = o.getMatch(),
      map = MAPS[m.map];
    const assetsReady = SCENERY.every(name => asset(name).complete && asset(name).naturalWidth > 0);
    if (lastMap !== m.map || (!loaded && assetsReady)) {
      terrain(m.map);
      lastMap = m.map;
      loaded = assetsReady;
    }
    if (version !== o.getVersion()) {
      version = o.getVersion();
      seen.clear();
      effects.length = 0;
      display.forEach((d, t) => {
        d.x = m.heroes[t].x;
        d.y = m.heroes[t].y;
      });
    }
    ctx.drawImage(bg, 0, 0);
    for (const ob of map.obstacles)
      if (ob.kind === "crate" && m.crates[ob.id] > 0) {
        const hpRatio = m.crates[ob.id] / 180;
        paintCrate(ctx, ob.x, ob.y, ob.w, ob.h, hpRatio);
        if (hpRatio < 1) {
          ctx.fillStyle = "#211b15";
          ctx.fillRect(ob.x, ob.y + ob.h + 3, ob.w, 4);
          ctx.fillStyle = "#e6bf72";
          ctx.fillRect(ob.x, ob.y + ob.h + 3, ob.w * hpRatio, 4);
        }
      }
    for (const trap of m.traps) {
      const phase = (m.elapsed + trap.offset) % 5,
        active = trapActive(m.elapsed, trap.offset),
        warn = !active && phase > 2.6;
      ctx.fillStyle = active ? "#f84f3948" : warn ? "#f59b4228" : "#2b322833";
      ctx.strokeStyle = active
        ? "#ffba60"
        : warn
          ? "#e99464"
          : "#6c725ca8";
      ctx.lineWidth = active || warn ? 2 : 1.5;
      ctx.beginPath();
      ctx.arc(trap.x, trap.y, trap.radius, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = active ? "#ffd689" : warn ? "#d89c6a" : "#555c4b";
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2,
          x = trap.x + Math.cos(a) * (trap.radius * 0.58),
          y = trap.y + Math.sin(a) * (trap.radius * 0.58);
        ctx.beginPath();
        ctx.moveTo(x - 3, y + 3.5);
        ctx.lineTo(x, y - (active ? 8.5 : 2.5));
        ctx.lineTo(x + 3, y + 3.5);
        ctx.fill();
      }
      if (active) {
        ctx.fillStyle = "#ffe299";
        ctx.font = "bold 11px Clash";
        ctx.textAlign = "center";
        ctx.fillText("!", trap.x, trap.y + 4);
      }
    }
    m.pickups.forEach((r, index) => {
      if (m.runes[index] > 0) {
        ctx.fillStyle = "#0e222ccc";
        ctx.font = "bold 12px Clash";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.ceil(m.runes[index])}s`, r.x, r.y + 4);
        return;
      }
      const color =
        r.kind === "heal"
          ? "#aff086"
          : r.kind === "rapid"
            ? "#ecacff"
            : "#9beaff";
      const bob = o.reduced() ? 0 : Math.sin(now / 260 + index) * 2.5;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = o.reduced() ? 0 : 12;
      ctx.fillStyle = "#19302a66";
      ctx.beginPath();
      ctx.ellipse(r.x, r.y + 7, 17, 9, 0, 0, 7);
      ctx.fill();
      paintProp(ctx, r.kind, r.x - 18, r.y - 23 + bob, 36, 36);
      ctx.restore();
      ctx.font = "bold 11px Clash";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#122620";
      ctx.lineWidth = 3.5;
      const label =
        r.kind === "heal" ? "+250 HP" : r.kind === "rapid" ? "RAGE" : "HASTE";
      ctx.strokeText(label, r.x, r.y + 23);
      ctx.fillStyle = color;
      ctx.fillText(label, r.x, r.y + 23);
    });
    if (o.isActive() && document.visibilityState === "visible") {
      const h = m.heroes[o.getTeam()];
      syncInput();
      if (now - lastSend >= 30) {
        o.send({ ...input });
        lastSend = now;
      }
      if (aimSet) {
        const def = TROOPS[h.troop],
          d = Math.min(def.range, Math.hypot(aim.x - h.x, aim.y - h.y)),
          x = h.x + Math.cos(input.angle) * d,
          y = h.y + Math.sin(input.angle) * d;
        ctx.strokeStyle = "#e6faff99";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 12]);
        ctx.beginPath();
        ctx.moveTo(
          h.x + Math.cos(input.angle) * 32,
          h.y + Math.sin(input.angle) * 32,
        );
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, h.troop === "bomber" ? def.splash : 9, 0, 7);
        ctx.stroke();
      }
    } else if (keys.size || input.fire) clear();
function paintCustomProjectile(
  ctx: CanvasRenderingContext2D,
  p: Shot,
  def: (typeof TROOPS)[TroopId],
  now: number,
  reduced: boolean,
) {
  const angle = Math.atan2(p.vy, p.vx);

  if (p.troop === "bomber") {
    // Telegraphed landing zone with danger pulse
    ctx.strokeStyle = "#ffcd70";
    ctx.fillStyle = p.fuse >= 0 ? "#fa79462a" : "#f9ca5010";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.targetX, p.targetY, def.splash, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Lobbed bomb shadow
    ctx.fillStyle = "#0a141a44";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 12, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Iron Bomb body
    const bombGrad = ctx.createRadialGradient(p.x - 3, p.y - 12, 2, p.x, p.y - 8, 12);
    bombGrad.addColorStop(0, "#485a6a");
    bombGrad.addColorStop(0.6, "#222a33");
    bombGrad.addColorStop(1, "#11161c");
    ctx.fillStyle = bombGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 8, 11, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = "#ffffffaa";
    ctx.beginPath();
    ctx.arc(p.x - 3, p.y - 12, 3, 0, Math.PI * 2);
    ctx.fill();

    // Brass collar
    ctx.fillStyle = "#c99a38";
    ctx.fillRect(p.x + 3, p.y - 17, 4, 3);

    // Sparkling fuse spark
    const sparkPulse = Math.sin(now / 50) * 1.5;
    ctx.fillStyle = "#ffdd44";
    ctx.beginPath();
    ctx.arc(p.x + 6, p.y - 19, 3.5 + sparkPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x + 6, p.y - 19, 1.8, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  if (p.troop === "archer") {
    // Sharp wooden arrow with iconic pink fletchings
    if (!reduced) {
      const trail = ctx.createLinearGradient(-35, 0, 0, 0);
      trail.addColorStop(0, "transparent");
      trail.addColorStop(1, "#ff99cc55");
      ctx.fillStyle = trail;
      ctx.fillRect(-35, -2, 35, 4);
    }
    ctx.fillStyle = "#a8773d";
    ctx.fillRect(-18, -1.5, 20, 3);
    ctx.fillStyle = "#4a3219";
    ctx.fillRect(-1, -1.5, 3, 3);
    ctx.fillRect(-16, -1.5, 2.5, 3);
    ctx.fillStyle = "#f0f4fa";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-1, -3.5);
    ctx.lineTo(1, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#a2b4c7";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(1, 0);
    ctx.lineTo(-1, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff3388";
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-18, -4.5);
    ctx.lineTo(-15, 0);
    ctx.lineTo(-18, 4.5);
    ctx.closePath();
    ctx.fill();
  } else if (p.troop === "wizard") {
    // Roaring Fireball with smoke and embers
    if (!reduced) {
      for (let i = 1; i <= 3; i++) {
        const offX = -i * 8 - (Math.sin(now / 40 + i) * 3);
        const offY = Math.sin(now / 50 + i * 2) * 3;
        const rad = 7 - i * 1.5;
        const flameGrad = ctx.createRadialGradient(offX, offY, 1, offX, offY, rad);
        flameGrad.addColorStop(0, "#ffe85599");
        flameGrad.addColorStop(0.5, "#ff660066");
        flameGrad.addColorStop(1, "transparent");
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(offX, offY, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const coreGrad = ctx.createRadialGradient(2, 0, 1, 0, 0, 12);
    coreGrad.addColorStop(0, "#ffffff");
    coreGrad.addColorStop(0.35, "#fff042");
    coreGrad.addColorStop(0.7, "#ff6600");
    coreGrad.addColorStop(1, "#c91a00");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fffb8f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, -4);
    ctx.quadraticCurveTo(0, -9, -6, -6);
    ctx.moveTo(4, 4);
    ctx.quadraticCurveTo(0, 9, -6, 6);
    ctx.stroke();
  } else if (p.troop === "ice") {
    // Faceted Crystalline Frost Comet
    if (!reduced) {
      const mist = ctx.createLinearGradient(-30, 0, 4, 0);
      mist.addColorStop(0, "transparent");
      mist.addColorStop(0.7, "#62d8f744");
      mist.addColorStop(1, "#d4f8ffaa");
      ctx.fillStyle = mist;
      ctx.beginPath();
      ctx.ellipse(-14, 0, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f0fcff";
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-2, -5.5);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2ab7f2";
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-2, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#a8eeff";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-2, -2.5);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-2, 2.5);
    ctx.closePath();
    ctx.fill();
  } else if (p.troop === "musketeer") {
    // Dense metallic round with gunpowder smoke trail
    if (!reduced) {
      for (let i = 1; i <= 3; i++) {
        const off = -i * 9;
        ctx.fillStyle = `rgba(215, 222, 230, ${0.45 - i * 0.12})`;
        ctx.beginPath();
        ctx.arc(off, (i % 2 === 0 ? 2 : -2), 4 + i * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#ffffffaa";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(4, 0, 8, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    }
    const bulletGrad = ctx.createRadialGradient(2, -2, 1, 0, 0, 7);
    bulletGrad.addColorStop(0, "#fff8ce");
    bulletGrad.addColorStop(0.4, "#e0b028");
    bulletGrad.addColorStop(0.85, "#805908");
    bulletGrad.addColorStop(1, "#3d2b04");
    ctx.fillStyle = bulletGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffffdd";
    ctx.beginPath();
    ctx.arc(2, -2, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.troop === "dart") {
    // Bamboo Poison Blowdart
    if (!reduced) {
      const pTrail = ctx.createLinearGradient(-26, 0, 0, 0);
      pTrail.addColorStop(0, "transparent");
      pTrail.addColorStop(1, "#39ff1444");
      ctx.fillStyle = pTrail;
      ctx.fillRect(-26, -1.5, 26, 3);
    }
    ctx.fillStyle = "#cfbe70";
    ctx.fillRect(-16, -1.2, 18, 2.4);
    ctx.fillStyle = "#665220";
    ctx.fillRect(-10, -1.5, 2, 3);
    ctx.fillRect(-4, -1.5, 2, 3);
    ctx.fillStyle = "#00ff66";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(1, -2.5);
    ctx.lineTo(1, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(-17, -4);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-17, 4);
    ctx.closePath();
    ctx.fill();
  } else if (p.troop === "princess") {
    // Blazing Incendiary Flame Arrow
    if (!reduced) {
      const pFire = ctx.createLinearGradient(-36, 0, 0, 0);
      pFire.addColorStop(0, "transparent");
      pFire.addColorStop(0.6, "#ff330055");
      pFire.addColorStop(1, "#ffcc0088");
      ctx.fillStyle = pFire;
      ctx.fillRect(-36, -3, 36, 6);
    }
    ctx.fillStyle = "#945c25";
    ctx.fillRect(-16, -1.5, 18, 3);
    ctx.fillStyle = "#ff4400";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff475";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-4, -2.5);
    ctx.lineTo(-1, 0);
    ctx.lineTo(-4, 2.5);
    ctx.closePath();
    ctx.fill();
  } else if (p.troop === "colt") {
    // Brawl Stars Gunslinger Twin Revolver Bullet Streak
    for (const dy of [-3.2, 3.2]) {
      if (!reduced) {
        const streak = ctx.createLinearGradient(-30, dy, 6, dy);
        streak.addColorStop(0, "transparent");
        streak.addColorStop(0.5, "#ff445555");
        streak.addColorStop(1, "#ffee44aa");
        ctx.fillStyle = streak;
        ctx.fillRect(-30, dy - 1.2, 36, 2.4);
      }
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.roundRect(0, dy - 2, 7, 4, [0, 2, 2, 0]);
      ctx.fill();
      ctx.fillStyle = "#e0e8f5";
      ctx.fillRect(-5, dy - 2, 5, 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(4, dy - 1, 2, 2);
    }
  } else if (p.troop === "magic_archer") {
    // Luminous Ethereal Astral Magic Arrow
    if (!reduced) {
      const wave = Math.sin(now / 35) * 4;
      ctx.strokeStyle = "#00e5ff88";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-35, wave);
      ctx.quadraticCurveTo(-18, -wave, 2, 0);
      ctx.stroke();
      ctx.strokeStyle = "#f5005788";
      ctx.beginPath();
      ctx.moveTo(-35, -wave);
      ctx.quadraticCurveTo(-18, wave, 2, 0);
      ctx.stroke();
    }
    ctx.fillStyle = "#e0fbff";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-2, -5);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#00e5ff";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-2, -2.5);
    ctx.lineTo(-9, 0);
    ctx.lineTo(-2, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.troop === "firecracker") {
    // Whistling Firework Rocket Canister!
    if (!reduced) {
      const flameJet = ctx.createLinearGradient(-26, 0, -8, 0);
      flameJet.addColorStop(0, "transparent");
      flameJet.addColorStop(0.5, "#ff3d00aa");
      flameJet.addColorStop(1, "#ffeb3b");
      ctx.fillStyle = flameJet;
      ctx.beginPath();
      ctx.moveTo(-8, -2.5);
      ctx.lineTo(-24, 0);
      ctx.lineTo(-8, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(235, 230, 220, 0.4)";
      ctx.beginPath();
      ctx.arc(-22, Math.sin(now / 30) * 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(-18, 3, 20, 1.6);
    ctx.fillStyle = "#e53935";
    ctx.beginPath();
    ctx.roundRect(-8, -3.5, 12, 7, 2);
    ctx.fill();
    ctx.fillStyle = "#fff9c4";
    ctx.beginPath();
    ctx.moveTo(-5, -3.5);
    ctx.lineTo(-2, -3.5);
    ctx.lineTo(-4, 3.5);
    ctx.lineTo(-7, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -3.5);
    ctx.lineTo(3, -3.5);
    ctx.lineTo(1, 3.5);
    ctx.lineTo(-2, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(4, -3.5);
    ctx.lineTo(4, 3.5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

    for (const p of m.shots) {
      const def = TROOPS[p.troop];
      paintCustomProjectile(ctx, p, def, now, o.reduced());
    }
    m.heroes.forEach((h, t) => {
      const d = display[t],
        a = 1 - Math.exp(-dt * 24);
      d.x += (h.x - d.x) * a;
      d.y += (h.y - d.y) * a;
      if (h.hp <= 0) return;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.fillStyle = "#10352d40";
      ctx.beginPath();
      ctx.ellipse(0, 6, 30, 14, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = t ? "#ff8c80" : "#66c7ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 6, 30, 17, 0, 0, 7);
      ctx.stroke();
      const img = sprites[h.troop],
        bob = o.reduced()
          ? 0
          : Math.sin(now / (Math.hypot(h.vx, h.vy) > 5 ? 80 : 340)) * 1.5;
      ctx.scale(Math.cos(h.angle) < 0 ? -1 : 1, 1);
      if (img?.complete && img.naturalWidth) {
        const scale = Math.min(76 / img.naturalWidth, 84 / img.naturalHeight);
        ctx.drawImage(
          img,
          (-img.naturalWidth * scale) / 2,
          -img.naturalHeight * scale + 12 + bob,
          img.naturalWidth * scale,
          img.naturalHeight * scale,
        );
      } else {
        ctx.fillStyle = TROOPS[h.troop].color;
        ctx.beginPath();
        ctx.arc(0, -10, 18, 0, 7);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = "#0e2432";
      rounded(ctx, d.x - 32, d.y - 91, 64, 9, 3);
      ctx.fill();
      ctx.fillStyle = t ? "#ff8c80" : "#66c7ff";
      rounded(
        ctx,
        d.x - 30,
        d.y - 89,
        (60 * h.hp) / TROOPS[h.troop].health,
        5,
        2,
      );
      ctx.fill();
      ctx.font = "bold 15px Clash";
      ctx.strokeStyle = "#142d31";
      ctx.lineWidth = 4;
      ctx.textAlign = "center";
      ctx.strokeText(`${h.hp}`, d.x, d.y - 98);
      ctx.fillStyle = "#fff8df";
      ctx.fillText(`${h.hp}`, d.x, d.y - 98);
      if (h.slow > 0 || h.haste > 0 || h.rapid > 0) {
        ctx.fillStyle = h.haste > 0 ? "#aff1ff" : "#bcecff";
        ctx.font = "bold 13px Clash";
        ctx.fillText(h.rapid > 0 ? "RAGE ⚡" : h.haste > 0 ? "HASTE ↑" : "SLOWED ↓", d.x, d.y + 32);
      }
    });
    for (const e of m.events)
      if (!seen.has(e.id)) {
        seen.add(e.id);
        if (e.kind !== "shot" && effects.length < 48)
          effects.push({
            x: e.x,
            y: e.y,
            life: 0.7,
            kind: e.kind,
            amount: e.amount,
            team: e.team,
          });
      }
    if (seen.size > 500) seen.clear();
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.life -= dt;
      if (e.life <= 0) {
        effects.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = e.life / 0.7;
      if (e.kind === "blast") {
        ctx.strokeStyle = "#ffc466";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 15 + (1 - e.life / 0.7) * 100, 0, 7);
        ctx.stroke();
      } else if (e.amount) {
        ctx.fillStyle = e.kind === "trap" ? "#ffbb87" : "#fff3b4";
        ctx.font = "bold 23px Clash";
        ctx.strokeStyle = "#3b3031";
        ctx.lineWidth = 3;
        ctx.textAlign = "center";
        ctx.strokeText(`${e.kind === "rune" ? "+" : "−"}${e.amount}`, e.x, e.y - 65 - (0.7 - e.life) * 40);
        ctx.fillText(`${e.kind === "rune" ? "+" : "−"}${e.amount}`, e.x, e.y - 65 - (0.7 - e.life) * 40);
      }
      ctx.globalAlpha = 1;
    }
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("mousemove", move);
    window.removeEventListener("pointerdown", press);
    canvas.removeEventListener("mousedown", press);
    canvas.removeEventListener("contextmenu", context);
    window.removeEventListener("pointerup", release);
    window.removeEventListener("mouseup", release);
  };
}
