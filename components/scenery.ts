import { MAPS, type MapId } from '../shared/config';

const cache = new Map<string, HTMLImageElement>();
export const SCENERY = [
  'tree',
  'oak',
  'sapling',
  'rock',
  'wall',
  'ruin',
  'bush',
  'pond',
  'water',
  'stump',
  'grove',
  'gems',
  'haste',
  'heal',
  'rapid',
];

export function asset(name: string) {
  if (!cache.has(name)) {
    const image = new Image();
    image.src = `/assets/${name}.webp`;
    cache.set(name, image);
  }
  return cache.get(name)!;
}

export function paintProp(
  g: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const img = asset(name);
  if (img.complete && img.naturalWidth) g.drawImage(img, x, y, w, h);
}

type SpriteOpts = {
  flipX?: boolean;
  shadow?: boolean;
  filter?: string;
  alpha?: number;
};

/**
 * Renders an official Supercell Fankit 3D sprite centered at (cx, cy)
 * while preserving its natural aspect ratio so it never looks stretched.
 */
function paintFankitSprite(
  g: CanvasRenderingContext2D,
  name: string,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
  opts: SpriteOpts = {},
) {
  const img = asset(name);
  if (!img.complete || !img.naturalWidth || !img.naturalHeight) return;

  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;

  g.save();
  if (opts.alpha !== undefined) g.globalAlpha = opts.alpha;
  if (opts.shadow !== false) {
    g.fillStyle = '#09171238';
    g.beginPath();
    g.ellipse(cx + 2, cy + dh * 0.34, dw * 0.42, Math.max(5, dh * 0.16), 0, 0, Math.PI * 2);
    g.fill();
  }
  g.translate(cx, cy);
  if (opts.flipX) g.scale(-1, 1);
  if (opts.filter) g.filter = opts.filter;
  g.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  g.restore();
}

function drawPlinth(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: MapId,
) {
  const snow = theme === 'frozen';
  const ruins = theme === 'ruins';

  // Soft ambient ground shadow
  g.fillStyle = '#08151048';
  g.beginPath();
  g.roundRect(x - 3, y + 4, w + 6, h + 6, 10);
  g.fill();

  // 3D vertical stone curb face
  g.fillStyle = snow ? '#5b788c' : ruins ? '#6e6854' : '#61686e';
  g.beginPath();
  g.roundRect(x, y + 3, w, h + 3, 8);
  g.fill();

  // Top bevelled stone slab
  const topGrad = g.createLinearGradient(x, y - 4, x, y + h);
  if (snow) {
    topGrad.addColorStop(0, '#e3f4fc');
    topGrad.addColorStop(0.5, '#b8d5e5');
    topGrad.addColorStop(1, '#89adc2');
  } else if (ruins) {
    topGrad.addColorStop(0, '#cfc49e');
    topGrad.addColorStop(0.55, '#aba17e');
    topGrad.addColorStop(1, '#877e60');
  } else {
    topGrad.addColorStop(0, '#b5bcc2');
    topGrad.addColorStop(0.55, '#9299a1');
    topGrad.addColorStop(1, '#757c84');
  }
  g.fillStyle = topGrad;
  g.beginPath();
  g.roundRect(x + 1, y - 3, w - 2, h, 8);
  g.fill();

  g.strokeStyle = snow ? '#ffffffaa' : ruins ? '#ede3be88' : '#e1e8ee77';
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(x + 3, y - 1, w - 6, h - 4, 6);
  g.stroke();
}

export function paintCrate(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hpRatio = 1,
) {
  const lift = 9;
  // Ground shadow
  g.fillStyle = '#0d1c1458';
  g.beginPath();
  g.roundRect(x - 3, y + 4, w + 8, h + 5, 7);
  g.fill();

  // 3D wooden crate front wall
  const frontGrad = g.createLinearGradient(x, y, x, y + h);
  frontGrad.addColorStop(0, '#9c5e26');
  frontGrad.addColorStop(1, '#633812');
  g.fillStyle = frontGrad;
  g.beginPath();
  g.roundRect(x, y - lift + 8, w, h + lift - 6, 6);
  g.fill();

  // Top timber lid
  const topGrad = g.createLinearGradient(x, y - lift, x + w, y + h - lift);
  topGrad.addColorStop(0, '#e8a452');
  topGrad.addColorStop(0.5, '#cc8234');
  topGrad.addColorStop(1, '#a3611f');
  g.fillStyle = topGrad;
  g.beginPath();
  g.roundRect(x, y - lift, w, h - 4, 6);
  g.fill();

  // Inner recessed timber planks
  g.fillStyle = '#94551e';
  g.beginPath();
  g.roundRect(x + 5, y - lift + 5, w - 10, h - 14, 4);
  g.fill();

  // Overlay authentic Fankit Gems Box graphic inside the crate!
  paintFankitSprite(g, 'gems', x + w / 2, y - lift + h / 2 - 2, w + 10, h + 10, {
    shadow: false,
  });

  // Diagonal timber reinforcement cross-brace
  g.strokeStyle = '#e09b48cc';
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(x + 5, y - lift + h - 9);
  g.lineTo(x + w - 5, y - lift + 5);
  g.stroke();

  // Gold rim highlight
  g.strokeStyle = '#ffcf78bb';
  g.lineWidth = 1.6;
  g.beginPath();
  g.roundRect(x + 1.5, y - lift + 1.5, w - 3, h - 7, 5);
  g.stroke();

  // Damage cracks if hit
  if (hpRatio < 0.95) {
    g.strokeStyle = '#261306dd';
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(x + w * 0.28, y - lift + 5);
    g.lineTo(x + w * 0.52, y - lift + h * 0.45);
    if (hpRatio < 0.55) {
      g.lineTo(x + w * 0.76, y - lift + h * 0.72);
      g.moveTo(x + w * 0.52, y - lift + h * 0.45);
      g.lineTo(x + w * 0.22, y - lift + h * 0.74);
    }
    g.stroke();
  }
}

function drawBridge(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: MapId,
) {
  const snow = theme === 'frozen';
  const ruins = theme === 'ruins';

  // Cast shadow on water
  g.fillStyle = '#06233366';
  g.beginPath();
  g.roundRect(x - 2, y + 6, w + 4, h + 4, 6);
  g.fill();

  // 4 Corner Fankit 3D Stone Wall Pillars as bridge abutments
  paintFankitSprite(g, 'wall', x + 4, y - 4, 26, 28, { shadow: false });
  paintFankitSprite(g, 'wall', x + w - 4, y - 4, 26, 28, { shadow: false });
  paintFankitSprite(g, 'wall', x + 4, y + h - 4, 26, 28, { shadow: false });
  paintFankitSprite(g, 'wall', x + w - 4, y + h - 4, 26, 28, { shadow: false });

  // Bridge deck base
  g.fillStyle = ruins ? '#5c533e' : '#593414';
  g.beginPath();
  g.roundRect(x + 2, y + 2, w - 4, h - 4, 4);
  g.fill();

  // Planks / Stone slabs
  const planks = 5;
  const pw = (w - 6) / planks;
  for (let i = 0; i < planks; i++) {
    const px = x + 3 + i * pw;
    const grad = g.createLinearGradient(px, y, px, y + h);
    if (ruins) {
      grad.addColorStop(0, i % 2 ? '#d6ca9e' : '#c7ba8c');
      grad.addColorStop(0.5, i % 2 ? '#b8ab7e' : '#ab9e72');
      grad.addColorStop(1, '#8c8058');
    } else if (snow) {
      grad.addColorStop(0, i % 2 ? '#c49360' : '#b58452');
      grad.addColorStop(0.5, '#9c6b3b');
      grad.addColorStop(1, '#784e26');
    } else {
      grad.addColorStop(0, i % 2 ? '#cf8942' : '#c27c36');
      grad.addColorStop(0.5, i % 2 ? '#b56e29' : '#a86422');
      grad.addColorStop(1, '#854b16');
    }
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(px + 1, y + 5, pw - 2, h - 10, 3);
    g.fill();
  }

  // Guardrails
  for (const ry of [y, y + h - 6]) {
    g.fillStyle = ruins ? '#7d7356' : '#6b3e17';
    g.beginPath();
    g.roundRect(x + 2, ry, w - 4, 6, 3);
    g.fill();
    g.fillStyle = snow ? '#e3f4fc' : ruins ? '#e0d5ad' : '#de9a52';
    g.fillRect(x + 4, ry + 1, w - 8, 2);
  }
}

function drawRunePedestals(g: CanvasRenderingContext2D, theme: MapId) {
  const snow = theme === 'frozen';
  const ruins = theme === 'ruins';
  for (const [rx, ry, tint] of [
    [600, 68, '#63d8ff'],
    [600, 632, '#63d8ff'],
    [205, 82, '#85eb65'],
    [995, 618, '#85eb65'],
    [205, 618, '#e38aff'],
    [995, 82, '#e38aff'],
  ] as const) {
    g.fillStyle = '#0e201844';
    g.beginPath();
    g.ellipse(rx, ry + 4, 27, 16, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = snow ? '#8fb4c9' : ruins ? '#9c9270' : '#7f8a82';
    g.beginPath();
    g.ellipse(rx, ry + 2, 24, 14, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = snow ? '#d9eef7' : ruins ? '#cfc49e' : '#b2bab2';
    g.beginPath();
    g.ellipse(rx, ry, 20, 11.5, 0, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = tint + 'aa';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(rx, ry, 14, 8, 0, 0, Math.PI * 2);
    g.stroke();
  }
}

function drawSpawnCrests(g: CanvasRenderingContext2D, theme: MapId) {
  const snow = theme === 'frozen';
  const ruins = theme === 'ruins';

  // Team 0: Blue Team Spawn at (170, 350)
  // Team 1: Red Team Spawn at (1030, 350)
  const spawns = [
    { x: 170, y: 350, team: 0, color: '#32a0ff', dark: '#0c3566', rim: '#66c2ff', emblem: '#dff2ff' },
    { x: 1030, y: 350, team: 1, color: '#ff4d4d', dark: '#661111', rim: '#ff8585', emblem: '#ffe0e0' },
  ] as const;

  for (const s of spawns) {
    // Ground shadow
    g.fillStyle = '#08121a55';
    g.beginPath();
    g.ellipse(s.x, s.y + 6, 52, 34, 0, 0, Math.PI * 2);
    g.fill();

    // 3D Outer stone plinth curb
    g.fillStyle = snow ? '#7395a8' : ruins ? '#8a8063' : '#637069';
    g.beginPath();
    g.ellipse(s.x, s.y + 3, 48, 30, 0, 0, Math.PI * 2);
    g.fill();

    // Stone ring bevel
    g.fillStyle = snow ? '#b3d5e8' : ruins ? '#c4b995' : '#9ca69f';
    g.beginPath();
    g.ellipse(s.x, s.y, 44, 27, 0, 0, Math.PI * 2);
    g.fill();

    // Team colored inner floor medallion
    const floorGrad = g.createRadialGradient(s.x, s.y - 4, 4, s.x, s.y, 38);
    floorGrad.addColorStop(0, s.color);
    floorGrad.addColorStop(0.65, s.team === 0 ? '#1961aa' : '#b31b1b');
    floorGrad.addColorStop(1, s.dark);
    g.fillStyle = floorGrad;
    g.beginPath();
    g.ellipse(s.x, s.y, 38, 23, 0, 0, Math.PI * 2);
    g.fill();

    // Glowing inner rune ring
    g.strokeStyle = s.rim + 'bb';
    g.lineWidth = 2.2;
    g.beginPath();
    g.ellipse(s.x, s.y, 34, 20, 0, 0, Math.PI * 2);
    g.stroke();

    // Team emblem crest in center
    g.fillStyle = s.emblem;
    g.strokeStyle = s.dark;
    g.lineWidth = 1.5;
    g.beginPath();
    if (s.team === 0) {
      // Crown / Shield crest for Blue
      g.moveTo(s.x - 10, s.y - 7);
      g.lineTo(s.x - 6, s.y + 2);
      g.lineTo(s.x, s.y - 5);
      g.lineTo(s.x + 6, s.y + 2);
      g.lineTo(s.x + 10, s.y - 7);
      g.lineTo(s.x + 7, s.y + 8);
      g.lineTo(s.x, s.y + 11);
      g.lineTo(s.x - 7, s.y + 8);
      g.closePath();
    } else {
      // Dual crossed battle blades / crest for Red
      g.moveTo(s.x - 10, s.y - 6);
      g.lineTo(s.x + 10, s.y + 6);
      g.lineTo(s.x + 8, s.y + 8);
      g.lineTo(s.x - 8, s.y - 8);
      g.closePath();
      g.moveTo(s.x + 10, s.y - 6);
      g.lineTo(s.x - 10, s.y + 6);
      g.lineTo(s.x - 8, s.y + 8);
      g.lineTo(s.x + 8, s.y - 8);
      g.closePath();
    }
    g.fill();
    g.stroke();
  }
}

/**
 * Renders the obstacle formations for a map using authentic 3D Supercell Fankit props
 * (`ruin`, `wall`, `rock`, `pond`, `water`, `bush`, `stump`, `gems`, `grove`, `oak`, `tree`, `sapling`).
 */
function paintMapObstacles(
  g: CanvasRenderingContext2D,
  id: MapId,
  includeCrates: boolean,
) {
  const m = MAPS[id];
  const snow = id === 'frozen';
  const ruins = id === 'ruins';
  const frostFilter = snow ? 'brightness(1.1) saturate(0.78) hue-rotate(10deg)' : undefined;
  const ruinFilter = ruins ? 'sepia(0.18) saturate(1.08) brightness(0.98)' : undefined;

  for (const ob of m.obstacles) {
    const { x, y, w, h } = ob;
    const cx = x + w / 2;
    const cy = y + h / 2;

    if (ob.kind === 'crate') {
      g.fillStyle = '#2b211433';
      g.beginPath();
      g.roundRect(x - 2, y - 2, w + 4, h + 4, 6);
      g.fill();
      if (includeCrates) paintCrate(g, x, y, w, h, 1);
      continue;
    }

    if (ob.kind === 'water') {
      // Render authentic unclipped 3D Supercell Fankit water & pond basins!
      if (h > w * 1.4) {
        // Tall stream channel (Forest Outpost stream1 / stream2)
        g.save();
        g.fillStyle = '#0d4e6b44';
        g.beginPath();
        g.ellipse(cx, cy + 4, w * 0.62, h * 0.52, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();

        paintFankitSprite(g, 'water', cx, y + h * 0.28, w + 54, h * 0.62, {
          shadow: false,
          filter: frostFilter,
        });
        paintFankitSprite(g, 'water', cx, y + h * 0.72, w + 54, h * 0.62, {
          shadow: false,
          flipX: true,
          filter: frostFilter,
        });
        paintFankitSprite(g, 'pond', cx, cy, w + 38, w + 28, {
          shadow: false,
          filter: frostFilter,
        });
        paintFankitSprite(g, 'rock', x + 10, y + 10, 38, 32, { filter: frostFilter });
        paintFankitSprite(g, 'rock', x + w - 10, y + h - 10, 38, 32, {
          flipX: true,
          filter: frostFilter,
        });
      } else {
        // Sanctuary / Fortress corner water basins (pool / poolr)
        paintFankitSprite(g, 'water', cx, cy, w + 46, h + 42, {
          filter: frostFilter ?? ruinFilter,
        });
        paintFankitSprite(g, 'pond', cx, cy + 4, w + 16, h + 14, {
          shadow: false,
          filter: frostFilter ?? ruinFilter,
        });
        paintFankitSprite(g, 'rock', x + 12, y + 14, 42, 36, {
          filter: frostFilter ?? ruinFilter,
        });
        paintFankitSprite(g, 'bush', x + w - 12, y + h - 10, 40, 34, {
          filter: frostFilter ?? ruinFilter,
        });
      }
      continue;
    }

    if (ob.kind === 'ice') {
      // Gleaming Frozen Peak glacial ice sheet
      const iceGrad = g.createLinearGradient(x, y, x + w, y + h);
      iceGrad.addColorStop(0, '#8ce4f7bb');
      iceGrad.addColorStop(0.45, '#e0fbffcc');
      iceGrad.addColorStop(1, '#6dcde8bb');
      g.fillStyle = iceGrad;
      g.beginPath();
      g.roundRect(x, y, w, h, 26);
      g.fill();

      // Multi-band specular ice reflections
      g.fillStyle = '#ffffff78';
      g.beginPath();
      g.moveTo(x + 16, y + 10);
      g.lineTo(x + 42, y + 10);
      g.lineTo(x + w - 14, y + h - 12);
      g.lineTo(x + w - 40, y + h - 12);
      g.closePath();
      g.fill();

      g.fillStyle = '#ffffff48';
      g.beginPath();
      g.moveTo(x + 48, y + 10);
      g.lineTo(x + 60, y + 10);
      g.lineTo(x + w - 4, y + h - 22);
      g.lineTo(x + w - 12, y + h - 12);
      g.closePath();
      g.fill();

      // Crisp frost rim
      g.strokeStyle = '#ffffffdd';
      g.lineWidth = 2.2;
      g.beginPath();
      g.roundRect(x + 1, y + 1, w - 2, h - 2, 26);
      g.stroke();

      // Small corner frost rocks
      paintFankitSprite(g, 'rock', x + 10, y + 12, 28, 24, { filter: frostFilter });
      paintFankitSprite(g, 'rock', x + w - 10, y + h - 12, 28, 24, {
        flipX: true,
        filter: frostFilter,
      });
      continue;
    }

    if (ob.id === 'center') {
      drawPlinth(g, x, y, w, h, id);

      if (id === 'forest') {
        // Forest Outpost Centerpiece: Woodland Stronghold with Ruin Base, Giant Oak, Gem Box & Stump
        paintFankitSprite(g, 'ruin', cx, y + 44, w + 48, 92, { shadow: false });
        paintFankitSprite(g, 'ruin', cx, y + h - 42, w + 48, 92, {
          shadow: false,
          flipX: true,
        });
        paintFankitSprite(g, 'rock', x + 22, y + 32, 62, 54);
        paintFankitSprite(g, 'rock', x + w - 22, y + h - 28, 62, 54, { flipX: true });
        paintFankitSprite(g, 'wall', x + 22, cy, 48, 52);
        paintFankitSprite(g, 'wall', x + w - 22, cy, 48, 52);
        paintFankitSprite(g, 'oak', cx, y + 36, 86, 98);
        paintFankitSprite(g, 'gems', cx, cy + 8, 62, 54);
        paintFankitSprite(g, 'stump', x + 26, y + h - 22, 54, 42);
        paintFankitSprite(g, 'bush', x + w - 20, y + 22, 46, 40);
        paintFankitSprite(g, 'bush', x + 18, y + h - 14, 44, 38);
      } else if (id === 'ruins') {
        // Ancient Sanctuary Centerpiece: Sunken Temple Shrine Obelisk & Sacred Gem Offering
        paintFankitSprite(g, 'ruin', cx, y + 34, w + 64, 84, {
          shadow: false,
          filter: ruinFilter,
        });
        paintFankitSprite(g, 'ruin', cx, y + h - 34, w + 64, 84, {
          shadow: false,
          flipX: true,
          filter: ruinFilter,
        });
        paintFankitSprite(g, 'wall', cx, y + 22, 52, 58, { filter: ruinFilter });
        paintFankitSprite(g, 'wall', cx, y + h - 24, 52, 58, { filter: ruinFilter });
        paintFankitSprite(g, 'gems', cx, cy, 58, 50);
        paintFankitSprite(g, 'bush', x + 8, cy - 24, 38, 34, { filter: ruinFilter });
        paintFankitSprite(g, 'bush', x + w - 8, cy + 24, 38, 34, { filter: ruinFilter });
      } else {
        // Frozen Fortress Centerpiece: Glacial Citadel Keep with Frosted Pines & Ice Spire Rocks
        paintFankitSprite(g, 'ruin', cx, y + 42, w + 48, 90, {
          shadow: false,
          filter: frostFilter,
        });
        paintFankitSprite(g, 'ruin', cx, y + h - 42, w + 48, 90, {
          shadow: false,
          flipX: true,
          filter: frostFilter,
        });
        paintFankitSprite(g, 'rock', x + 24, y + 32, 66, 56, { filter: frostFilter });
        paintFankitSprite(g, 'rock', x + w - 24, y + h - 30, 66, 56, {
          flipX: true,
          filter: frostFilter,
        });
        paintFankitSprite(g, 'wall', x + 20, cy, 48, 54, { filter: frostFilter });
        paintFankitSprite(g, 'wall', x + w - 20, cy, 48, 54, { filter: frostFilter });
        paintFankitSprite(g, 'grove', cx, cy - 8, 86, 86, { filter: frostFilter });
        paintFankitSprite(g, 'tree', cx, y + h - 32, 72, 86, { filter: frostFilter });
      }
      continue;
    }

    // Standard Wall Obstacles (w1, w2, w3 and their mirrored counterparts)
    drawPlinth(g, x, y, w, h, id);

    if (w >= h) {
      // Horizontal fortification wall
      if (ruins) {
        paintFankitSprite(g, 'ruin', cx, cy + 2, w + 24, h + 38, {
          shadow: false,
          filter: ruinFilter,
        });
      }
      const count = Math.max(2, Math.round(w / 30));
      for (let i = 0; i < count; i++) {
        const px = x + 16 + (i * (w - 32)) / Math.max(1, count - 1);
        if (i === 0 || i === count - 1) {
          paintFankitSprite(g, 'rock', px, cy - 2, 46, 40, {
            flipX: i % 2 === 1,
            shadow: false,
            filter: frostFilter ?? ruinFilter,
          });
        }
        paintFankitSprite(g, 'wall', px, cy - 5, 42, 46, {
          shadow: false,
          filter: frostFilter ?? ruinFilter,
        });
      }
      if (id === 'forest') {
        paintFankitSprite(g, 'bush', x + 14, y + h - 4, 38, 32);
        paintFankitSprite(g, 'stump', x + w - 18, y + h - 2, 42, 34);
      } else if (id === 'ruins') {
        paintFankitSprite(g, 'bush', x + 12, y + h - 4, 36, 30, { filter: ruinFilter });
        paintFankitSprite(g, 'gems', cx, cy - 4, 38, 34, { shadow: false });
      } else {
        paintFankitSprite(g, 'sapling', x + 14, y - 2, 44, 54, { filter: frostFilter });
      }
    } else {
      // Vertical temple colonnade (e.g. w1 in Ancient Sanctuary)
      paintFankitSprite(g, 'ruin', cx, cy, w + 38, h + 16, {
        shadow: false,
        filter: frostFilter ?? ruinFilter,
      });
      const count = Math.max(2, Math.round(h / 32));
      for (let i = 0; i < count; i++) {
        const py = y + 16 + (i * (h - 32)) / Math.max(1, count - 1);
        paintFankitSprite(g, 'wall', cx, py - 4, 44, 48, {
          shadow: false,
          filter: frostFilter ?? ruinFilter,
        });
      }
      paintFankitSprite(g, 'rock', cx, y + 14, 44, 38, {
        shadow: false,
        filter: frostFilter ?? ruinFilter,
      });
      paintFankitSprite(g, 'bush', cx, y + h - 10, 40, 34, {
        filter: frostFilter ?? ruinFilter,
      });
    }
  }
}

/**
 * MAP 1: FOREST OUTPOST
 * Lush Clash of Clans Home Village Woodland Clearing with emerald lawn, golden dirt crossroads,
 * stone-walled side streams, timber bridges, Gem Boxes, hollow redwood logs, and oak/pine groves.
 */
function paintForestMap(
  g: CanvasRenderingContext2D,
  rand: () => number,
  includeCrates: boolean,
) {
  // 1. Deep forest canopy border
  g.fillStyle = '#1e4728';
  g.fillRect(0, 0, 1200, 700);

  // 2. Sunlit Clash of Clans Home Village emerald lawn
  const lawn = g.createLinearGradient(0, 0, 1200, 700);
  lawn.addColorStop(0, '#6eb32b');
  lawn.addColorStop(0.5, '#95cf3e');
  lawn.addColorStop(1, '#5b9922');
  g.fillStyle = lawn;
  g.beginPath();
  g.roundRect(14, 14, 1172, 672, 22);
  g.fill();

  // 3. Crisp Clash of Clans isometric diamond/checkerboard mowed turf tiles
  const tile = 58;
  for (let gx = 40; gx < 1160; gx += tile) {
    for (let gy = 26; gy < 664; gy += tile) {
      const odd = ((Math.floor(gx / tile) + Math.floor(gy / tile)) & 1) === 1;
      g.fillStyle = odd ? '#c4f55818' : '#264d1012';
      g.fillRect(gx, gy, tile, tile);
    }
  }

  // 4. Warm Golden-Ochre Village Dirt Lanes
  const path = new Path2D();
  path.moveTo(20, 350);
  path.bezierCurveTo(210, 350, 280, 330, 410, 210);
  path.bezierCurveTo(520, 115, 680, 115, 790, 210);
  path.bezierCurveTo(920, 330, 990, 350, 1180, 350);
  path.moveTo(210, 350);
  path.bezierCurveTo(350, 370, 430, 565, 600, 575);
  path.bezierCurveTo(770, 565, 850, 370, 990, 350);

  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [width, color] of [
    [90, '#4a6b1d40'],
    [76, '#9e794278'],
    [62, '#cfa866dd'],
    [46, '#e3c384'],
  ] as const) {
    g.lineWidth = width;
    g.strokeStyle = color;
    g.stroke(path);
  }

  // Subtle organic turf & path pebbles
  for (let i = 0; i < 2600; i++) {
    const x = 28 + rand() * 1144;
    const y = 24 + rand() * 652;
    const onPath = g.isPointInStroke(path, x, y);
    g.fillStyle = onPath
      ? i % 2
        ? '#fff0c438'
        : '#7a582e24'
      : i % 3
        ? '#dcf26b32'
        : '#2e571824';
    g.beginPath();
    g.ellipse(x, y, 1.2 + rand() * 2.4, 0.8 + rand() * 1.4, rand() * 3, 0, Math.PI * 2);
    g.fill();
  }

  // 5. Spell Alcove Pedestals & Supercell Team Spawn Battle Crests
  drawRunePedestals(g, 'forest');
  drawSpawnCrests(g, 'forest');

  // 6. Left & Right Spawn Bridges across the woodland streams
  drawBridge(g, 42, 294, 72, 112, 'forest');
  drawBridge(g, 1086, 294, 72, 112, 'forest');

  // 7. Collidable Obstacles (Streams, Crates, Center Woodland Stronghold, Stone Walls)
  paintMapObstacles(g, 'forest', includeCrates);

  // 8. Authentic Fankit Woodland Outpost Landmarks in safe perimeter clearings
  // North & South sunken oasis ponds (`pond.webp` + `gems.webp` + `stump.webp`)
  paintFankitSprite(g, 'pond', 490, 34, 88, 68);
  paintFankitSprite(g, 'gems', 432, 32, 54, 48);
  paintFankitSprite(g, 'stump', 725, 34, 64, 50);
  paintFankitSprite(g, 'pond', 710, 666, 88, 68, { flipX: true });
  paintFankitSprite(g, 'gems', 768, 666, 54, 48);
  paintFankitSprite(g, 'stump', 475, 666, 64, 50, { flipX: true });

  // Four Corner Woodland Clearing Camps (`ruin.webp` + `gems.webp` + `stump.webp` + `bush.webp`)
  paintFankitSprite(g, 'ruin', 135, 42, 92, 74);
  paintFankitSprite(g, 'gems', 135, 38, 48, 42, { shadow: false });
  paintFankitSprite(g, 'stump', 1065, 44, 68, 52);
  paintFankitSprite(g, 'bush', 1020, 38, 48, 42);

  paintFankitSprite(g, 'stump', 135, 656, 68, 52, { flipX: true });
  paintFankitSprite(g, 'bush', 180, 660, 48, 42);
  paintFankitSprite(g, 'ruin', 1065, 658, 92, 74, { flipX: true });
  paintFankitSprite(g, 'gems', 1065, 654, 48, 42, { shadow: false });

  // 9. Lush Clash of Clans Outer Forest Rim (Oak, Grove, Sapling, Tree)
  for (let i = 0; i < 22; i++) {
    const x = i * 58 + 16;
    const topKind = i % 3 === 0 ? 'grove' : i % 2 === 0 ? 'oak' : 'sapling';
    const botKind = i % 3 === 0 ? 'oak' : i % 2 === 0 ? 'grove' : 'tree';
    if (Math.abs(x - 600) > 65 && Math.abs(x - 490) > 55) {
      paintFankitSprite(g, topKind, x, 6, 88, 98, { flipX: i % 2 === 1 });
    }
    if (Math.abs(x - 600) > 65 && Math.abs(x - 710) > 55) {
      paintFankitSprite(g, botKind, x, 694, 88, 98, { flipX: i % 2 === 0 });
    }
  }
  for (let i = 0; i < 11; i++) {
    const y = i * 64 + 36;
    if (Math.abs(y - 350) < 78) continue;
    const kind = i % 3 === 0 ? 'grove' : i % 2 === 0 ? 'oak' : 'sapling';
    paintFankitSprite(g, kind, 8, y, 84, 94);
    paintFankitSprite(g, kind, 1192, y, 84, 94, { flipX: true });
  }
}

/**
 * MAP 2: ANCIENT SANCTUARY
 * Clash Royale / Clash of Clans Sunken Jungle Temple Courtyard!
 * Completely distinct from Forest Outpost: features a grand carved sandstone & mossy limestone
 * temple plaza, octagonal sunken medallion, ancient ruin shrines, sacred lotus ponds, and jungle canopy.
 */
function paintRuinsMap(
  g: CanvasRenderingContext2D,
  rand: () => number,
  includeCrates: boolean,
) {
  const ruinFilter = 'sepia(0.18) saturate(1.1) brightness(0.98)';

  // 1. Deep Jungle Canopy Exterior
  g.fillStyle = '#1b3b22';
  g.fillRect(0, 0, 1200, 700);

  // 2. Tropical Mossy Jungle Perimeter Turf
  const turf = g.createLinearGradient(0, 0, 1200, 700);
  turf.addColorStop(0, '#4f8236');
  turf.addColorStop(0.5, '#689e48');
  turf.addColorStop(1, '#3f6e2a');
  g.fillStyle = turf;
  g.beginPath();
  g.roundRect(12, 12, 1176, 676, 22);
  g.fill();

  // 3. Grand Sunken Sandstone Temple Courtyard Plaza (x: 132..1068, y: 64..636)
  // Outer temple stone step shadow
  g.fillStyle = '#1f331d66';
  g.beginPath();
  g.roundRect(126, 60, 948, 584, 28);
  g.fill();

  // Outer carved temple border curb
  g.fillStyle = '#877f63';
  g.beginPath();
  g.roundRect(130, 58, 940, 584, 26);
  g.fill();

  // Main Sandstone Courtyard Floor
  const plaza = g.createLinearGradient(136, 64, 1064, 636);
  plaza.addColorStop(0, '#c9be97');
  plaza.addColorStop(0.5, '#dfd5b0');
  plaza.addColorStop(1, '#b5aa84');
  g.fillStyle = plaza;
  g.beginPath();
  g.roundRect(138, 66, 924, 568, 22);
  g.fill();

  // Carved Temple Flagstone Grid inside the plaza
  const fw = 66,
    fh = 56;
  for (let gx = 152; gx < 1040; gx += fw) {
    for (let gy = 78; gy < 618; gy += fh) {
      const odd = ((Math.floor(gx / fw) + Math.floor(gy / fh)) & 1) === 1;
      g.fillStyle = odd ? '#ede4c236' : '#8f846224';
      g.beginPath();
      g.roundRect(gx + 2, gy + 2, fw - 4, fh - 4, 6);
      g.fill();
      g.strokeStyle = '#786e4f28';
      g.lineWidth = 1.2;
      g.stroke();
    }
  }

  // East & West Stepped Sandstone Spawn Causeways
  for (const sx of [20, 1050]) {
    const cw = g.createLinearGradient(sx, 285, sx, 415);
    cw.addColorStop(0, '#bfb38a');
    cw.addColorStop(0.5, '#dcd1ab');
    cw.addColorStop(1, '#a69a72');
    g.fillStyle = cw;
    g.beginPath();
    g.roundRect(sx, 292, 130, 116, 12);
    g.fill();
    g.strokeStyle = '#7d7352';
    g.lineWidth = 3;
    g.stroke();
  }

  // 4. Sacred Temple Ring & Golden Cobblestone Processional Paths
  g.save();
  g.strokeStyle = '#9e8d5c66';
  g.lineWidth = 36;
  g.beginPath();
  g.ellipse(600, 350, 250, 185, 0, 0, Math.PI * 2);
  g.stroke();

  g.strokeStyle = '#ece2bd88';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(600, 350, 268, 203, 0, 0, Math.PI * 2);
  g.ellipse(600, 350, 232, 167, 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();

  // Mossy cracks & weathered temple texture specks
  for (let i = 0; i < 2200; i++) {
    const x = 30 + rand() * 1140;
    const y = 26 + rand() * 648;
    const inPlaza = x > 140 && x < 1060 && y > 68 && y < 632;
    g.fillStyle = inPlaza
      ? i % 4 === 0
        ? '#5b8c3a32'
        : '#7a705226'
      : '#85c45228';
    g.beginPath();
    g.ellipse(x, y, 1.2 + rand() * 2.5, 0.8 + rand() * 1.5, rand() * 3, 0, Math.PI * 2);
    g.fill();
  }

  // 5. Spell Alcove Pedestals & Supercell Team Spawn Battle Crests
  drawRunePedestals(g, 'ruins');
  drawSpawnCrests(g, 'ruins');

  // 6. Collidable Obstacles (Sacred Corner Pools, Temple Colonnades, Sunken Shrine Centerpiece)
  paintMapObstacles(g, 'ruins', includeCrates);

  // 7. Authentic Fankit Temple Landmarks around the Sanctuary Perimeter
  // Sunken Ruin Shrines & Sacred Water Basins along North & South Temple Rim
  paintFankitSprite(g, 'ruin', 380, 36, 96, 76, { filter: ruinFilter });
  paintFankitSprite(g, 'pond', 495, 36, 86, 66, { filter: ruinFilter });
  paintFankitSprite(g, 'pond', 705, 36, 86, 66, { flipX: true, filter: ruinFilter });
  paintFankitSprite(g, 'ruin', 820, 36, 96, 76, { flipX: true, filter: ruinFilter });

  paintFankitSprite(g, 'ruin', 380, 664, 96, 76, { flipX: true, filter: ruinFilter });
  paintFankitSprite(g, 'pond', 495, 664, 86, 66, { filter: ruinFilter });
  paintFankitSprite(g, 'pond', 705, 664, 86, 66, { flipX: true, filter: ruinFilter });
  paintFankitSprite(g, 'ruin', 820, 664, 96, 76, { filter: ruinFilter });

  // Opposite-corner Temple Relic Shrines (balancing pool at top-left and poolr at bottom-right)
  paintFankitSprite(g, 'ruin', 1085, 125, 110, 88, { filter: ruinFilter });
  paintFankitSprite(g, 'gems', 1085, 120, 58, 50, { shadow: false });
  paintFankitSprite(g, 'wall', 1040, 85, 42, 46, { filter: ruinFilter });

  paintFankitSprite(g, 'ruin', 115, 575, 110, 88, { flipX: true, filter: ruinFilter });
  paintFankitSprite(g, 'gems', 115, 570, 58, 50, { shadow: false });
  paintFankitSprite(g, 'wall', 160, 615, 42, 46, { filter: ruinFilter });

  // Temple Gate Pillars flanking the East & West Spawn Causeways
  for (const [gx, gy] of [
    [136, 276],
    [136, 424],
    [1064, 276],
    [1064, 424],
  ]) {
    paintFankitSprite(g, 'wall', gx, gy, 48, 54, { filter: ruinFilter });
    paintFankitSprite(g, 'bush', gx, gy + 18, 38, 32, { filter: ruinFilter });
  }

  // 8. Lush Jungle Overgrowth Rim (Broadleaf Oaks, Bushes, Ancient Rocks & Ruin Pillars)
  for (let i = 0; i < 20; i++) {
    const x = i * 62 + 24;
    if (Math.abs(x - 600) > 70 && Math.abs(x - 380) > 50 && Math.abs(x - 820) > 50) {
      paintFankitSprite(g, i % 2 === 0 ? 'oak' : 'bush', x, 8, 82, 90, {
        flipX: i % 2 === 1,
        filter: ruinFilter,
      });
      paintFankitSprite(g, i % 2 === 0 ? 'oak' : 'bush', x, 692, 82, 90, {
        flipX: i % 2 === 0,
        filter: ruinFilter,
      });
    }
  }
  for (let i = 0; i < 10; i++) {
    const y = i * 68 + 40;
    if (Math.abs(y - 350) < 88) continue;
    paintFankitSprite(g, i % 2 === 0 ? 'oak' : 'grove', 10, y, 82, 92, { filter: ruinFilter });
    paintFankitSprite(g, i % 2 === 0 ? 'oak' : 'grove', 1190, y, 82, 92, {
      flipX: true,
      filter: ruinFilter,
    });
  }
}

/**
 * MAP 3: FROZEN FORTRESS
 * Clash Royale Frozen Peak / Glacial Citadel Arena!
 * Completely distinct from Forest and Ruins: features snowfield terrain, frosted stone citadel
 * courtyard, glacial ice rinks, frozen stone-walled pools, and alpine spruce forests.
 */
function paintFrozenMap(
  g: CanvasRenderingContext2D,
  rand: () => number,
  includeCrates: boolean,
) {
  const frostFilter = 'brightness(1.12) saturate(0.75) hue-rotate(12deg)';

  // 1. Deep Glacial Mountain Rim
  g.fillStyle = '#2d4f63';
  g.fillRect(0, 0, 1200, 700);

  // 2. Crisp High-Altitude Snowfield Terrain
  const snowfield = g.createLinearGradient(0, 0, 1200, 700);
  snowfield.addColorStop(0, '#cde8f2');
  snowfield.addColorStop(0.5, '#effaff');
  snowfield.addColorStop(1, '#add6e6');
  g.fillStyle = snowfield;
  g.beginPath();
  g.roundRect(14, 14, 1172, 672, 22);
  g.fill();

  // 3. Frosted Citadel Stone Courtyard Tiles in the Arena Interior
  const tileW = 64,
    tileH = 64;
  for (let gx = 48; gx < 1152; gx += tileW) {
    for (let gy = 30; gy < 656; gy += tileH) {
      const odd = ((Math.floor(gx / tileW) + Math.floor(gy / tileH)) & 1) === 1;
      g.fillStyle = odd ? '#ffffff30' : '#7ab3cc18';
      g.beginPath();
      g.roundRect(gx + 1, gy + 1, tileW - 2, tileH - 2, 5);
      g.fill();
    }
  }

  // 4. Frosted Glacial Fortress Pathways (Angular Frozen Peak Citadel Layout)
  const path = new Path2D();
  path.moveTo(20, 350);
  path.lineTo(235, 350);
  path.quadraticCurveTo(340, 210, 600, 195);
  path.quadraticCurveTo(860, 210, 965, 350);
  path.lineTo(1180, 350);
  path.moveTo(235, 350);
  path.quadraticCurveTo(340, 490, 600, 505);
  path.quadraticCurveTo(860, 490, 965, 350);

  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [width, color] of [
    [88, '#6fa6bf38'],
    [72, '#9ec9dc78'],
    [56, '#ccebf7dd'],
    [40, '#f2fcff'],
  ] as const) {
    g.lineWidth = width;
    g.strokeStyle = color;
    g.stroke(path);
  }

  // Sparkling snow crystals & frost drifts
  for (let i = 0; i < 2400; i++) {
    const x = 28 + rand() * 1144;
    const y = 24 + rand() * 652;
    g.fillStyle = i % 2 ? '#ffffff88' : '#6da6bd24';
    g.beginPath();
    g.ellipse(x, y, 1.2 + rand() * 2.5, 0.8 + rand() * 1.5, rand() * 3, 0, Math.PI * 2);
    g.fill();
  }

  // 5. Spell Alcove Pedestals & Supercell Team Spawn Battle Crests
  drawRunePedestals(g, 'frozen');
  drawSpawnCrests(g, 'frozen');

  // 6. Collidable Obstacles (Frozen Pools, Glacial Ice Rinks, Center Ice Keep, Frost Ramparts)
  paintMapObstacles(g, 'frozen', includeCrates);

  // 7. Authentic Fankit Frozen Peak Landmarks around the Citadel Perimeter
  // North & South Glacial Watchtowers & Frozen Springs (`ruin.webp`, `pond.webp`, `rock.webp`)
  paintFankitSprite(g, 'pond', 485, 36, 90, 68, { filter: frostFilter });
  paintFankitSprite(g, 'rock', 425, 34, 54, 46, { filter: frostFilter });
  paintFankitSprite(g, 'ruin', 720, 36, 94, 74, { filter: frostFilter });

  paintFankitSprite(g, 'ruin', 480, 664, 94, 74, { flipX: true, filter: frostFilter });
  paintFankitSprite(g, 'pond', 715, 664, 90, 68, { flipX: true, filter: frostFilter });
  paintFankitSprite(g, 'rock', 775, 664, 54, 46, { flipX: true, filter: frostFilter });

  // Opposite-corner Glacial Outcrops & Gem Caches (balancing top-left and bottom-right pools)
  paintFankitSprite(g, 'ruin', 1082, 120, 104, 82, { filter: frostFilter });
  paintFankitSprite(g, 'rock', 1110, 95, 58, 48, { filter: frostFilter });
  paintFankitSprite(g, 'gems', 1065, 125, 52, 46, { filter: frostFilter });

  paintFankitSprite(g, 'ruin', 118, 580, 104, 82, { flipX: true, filter: frostFilter });
  paintFankitSprite(g, 'rock', 90, 605, 58, 48, { flipX: true, filter: frostFilter });
  paintFankitSprite(g, 'gems', 135, 575, 52, 46, { filter: frostFilter });

  // Frosted Fortress Gate Towers at Left & Right Spawn Entrances
  for (const [gx, gy] of [
    [88, 272],
    [88, 428],
    [1112, 272],
    [1112, 428],
  ]) {
    paintFankitSprite(g, 'wall', gx, gy, 50, 56, { filter: frostFilter });
    paintFankitSprite(g, 'rock', gx, gy + 16, 42, 34, { filter: frostFilter });
  }

  // 8. Alpine Conifer Rim (Exclusively Evergreen Spruce `tree.webp`, `grove.webp`, `sapling.webp`, `rock.webp`)
  for (let i = 0; i < 22; i++) {
    const x = i * 58 + 16;
    const kind = i % 3 === 0 ? 'grove' : i % 2 === 0 ? 'tree' : 'sapling';
    if (Math.abs(x - 600) > 65 && Math.abs(x - 485) > 55 && Math.abs(x - 720) > 55) {
      paintFankitSprite(g, kind, x, 8, 86, 98, {
        flipX: i % 2 === 1,
        filter: frostFilter,
      });
      paintFankitSprite(g, kind, x, 692, 86, 98, {
        flipX: i % 2 === 0,
        filter: frostFilter,
      });
    }
  }
  for (let i = 0; i < 11; i++) {
    const y = i * 64 + 36;
    if (Math.abs(y - 350) < 78) continue;
    const kind = i % 3 === 0 ? 'grove' : i % 2 === 0 ? 'tree' : 'sapling';
    paintFankitSprite(g, kind, 10, y, 84, 96, { filter: frostFilter });
    paintFankitSprite(g, kind, 1190, y, 84, 96, { flipX: true, filter: frostFilter });
  }

  // Subtle icy atmospheric glaze
  g.fillStyle = '#dff6ff12';
  g.fillRect(0, 0, 1200, 700);
}

// Static scenery is rendered once per map/assets load, never inside the simulation.
export function paintTerrain(
  g: CanvasRenderingContext2D,
  id: MapId,
  includeCrates = false,
) {
  let seed = id === 'forest' ? 72 : id === 'ruins' ? 137 : 251;
  const rand = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

  if (id === 'ruins') {
    paintRuinsMap(g, rand, includeCrates);
  } else if (id === 'frozen') {
    paintFrozenMap(g, rand, includeCrates);
  } else {
    paintForestMap(g, rand, includeCrates);
  }
}
