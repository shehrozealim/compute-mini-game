export type TroopId =
  | "archer"
  | "wizard"
  | "bomber"
  | "ice"
  | "musketeer"
  | "dart"
  | "princess"
  | "colt"
  | "magic_archer"
  | "firecracker";
export const TROOPS = {
  archer: {
    name: "Archer",
    health: 1000,
    speed: 220,
    damage: 100,
    interval: 1,
    range: 760,
    shotSpeed: 800,
    splash: 0,
    color: "#b485ed",
    label: "THE SHARPSHOOTER",
    strength: "Fast, precise arrows. Excellent at keeping distance.",
    weakness: "A narrow hit area rewards careful aim.",
    image: "/assets/archer.webp",
  },
  wizard: {
    name: "Wizard",
    health: 1200,
    speed: 180,
    damage: 300,
    interval: 2.4,
    range: 650,
    shotSpeed: 350,
    splash: 100,
    color: "#ffad61",
    label: "THE HEAVY HITTER",
    strength: "Explosive fireballs punish enemies near cover.",
    weakness: "Slow fireballs can be dodged in open lanes.",
    image: "/assets/wizard.webp",
  },
  bomber: {
    name: "Bomber",
    health: 1100,
    speed: 190,
    damage: 230,
    interval: 1.8,
    range: 430,
    shotSpeed: 420,
    splash: 110,
    color: "#e2ca82",
    label: "THE DEMOLITION EXPERT",
    strength: "Lob bombs and deny space with delayed explosions.",
    weakness: "A visible fuse gives enemies time to escape.",
    image: "/assets/bomber.webp",
  },
  ice: {
    name: "Ice Wizard",
    health: 950,
    speed: 200,
    damage: 140,
    interval: 1.3,
    range: 700,
    shotSpeed: 540,
    splash: 0,
    color: "#8be5f6",
    label: "THE DISRUPTOR",
    strength: "Frost bolts slow enemies by 20% for one second.",
    weakness: "Lower health makes positioning essential.",
    image: "/assets/ice.webp",
  },
  musketeer: {
    name: "Musketeer", health: 1100, speed: 190, damage: 185, interval: 1.25,
    range: 850, shotSpeed: 1050, splash: 0, color: "#caadff", label: "ROYALE · THE MARKSMAN",
    strength: "Fast musket rounds and excellent reach reward steady aim.",
    weakness: "Slower movement makes close-range pressure dangerous.", image: "/assets/musketeer.webp",
  },
  dart: {
    name: "Dart Goblin", health: 800, speed: 250, damage: 65, interval: 0.45,
    range: 680, shotSpeed: 900, splash: 0, color: "#b6ed79", label: "ROYALE · THE SKIRMISHER",
    strength: "Rapid darts and the fastest movement keep pressure on enemies.",
    weakness: "Low health and light hits punish reckless pushes.", image: "/assets/dart.webp",
  },
  princess: {
    name: "Princess", health: 850, speed: 200, damage: 160, interval: 1.6,
    range: 950, shotSpeed: 620, splash: 65, color: "#ffb8d7", label: "ROYALE · THE LONG SHOT",
    strength: "Longest reach with small explosive arrows to punish clustered cover.",
    weakness: "Fragile and vulnerable between shots; stay behind cover.", image: "/assets/princess.webp",
  },
  colt: {
    name: "Colt",
    health: 900,
    speed: 225,
    damage: 95,
    interval: 0.65,
    range: 760,
    shotSpeed: 1050,
    splash: 0,
    color: "#ff4455",
    label: "BRAWL · THE GUNSLINGER",
    strength: "Rapid twin revolver rounds maintain relentless straight-line pressure.",
    weakness: "A narrow bullet path demands accurate mouse tracking.",
    image: "/assets/colt.webp",
  },
  magic_archer: {
    name: "Magic Archer",
    health: 850,
    speed: 215,
    damage: 115,
    interval: 0.8,
    range: 900,
    shotSpeed: 980,
    splash: 0,
    color: "#00e5ff",
    label: "ROYALE · THE MYSTIC SNIPER",
    strength: "Luminous astral magic arrows streak swiftly across long corridors.",
    weakness: "Lower durability; vulnerable to sudden flanking pushes.",
    image: "/assets/magic_archer.webp",
  },
  firecracker: {
    name: "Firecracker",
    health: 880,
    speed: 205,
    damage: 200,
    interval: 1.6,
    range: 740,
    shotSpeed: 520,
    splash: 85,
    color: "#ff6b35",
    label: "ROYALE · THE PYROTECHNIC",
    strength: "Launches explosive firework rockets that burst with area splash damage.",
    weakness: "Slower rocket velocity and longer reload time between volleys.",
    image: "/assets/firecracker.webp",
  },
} as const;
export const TROOP_IDS = Object.keys(TROOPS) as TroopId[];
export type MapId = "forest" | "ruins" | "frozen";
export type Obstacle = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "wall" | "crate" | "water" | "ice";
};
export type Trap = { x: number; y: number; radius: number; offset: number };
const mirror = (o: Obstacle[]) =>
  o.flatMap((a) => [
    a,
    { ...a, id: a.id + "r", x: 1200 - a.x - a.w, y: 700 - a.y - a.h },
  ]);
const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: Obstacle["kind"] = "wall",
): Obstacle => ({ id, x, y, w, h, kind });
export const MAPS: Record<
  MapId,
  {
    name: string;
    tag: string;
    description: string;
    ground: string;
    path: string;
    edge: string;
    obstacles: Obstacle[];
    traps: Trap[];
    runes: { x: number; y: number }[];
  }
> = {
  forest: {
    name: "Forest Outpost",
    tag: "LEAFY LANES & AMBUSHES",
    description: "Stone cover, breakable crates, streams and two bridges.",
    ground: "#6f9c45",
    path: "#b5ac6d",
    edge: "#27543c",
    obstacles: [
      box("center", 550, 280, 100, 140),
      ...mirror([
        box("w1", 295, 165, 110, 32),
        box("w2", 325, 505, 96, 32),
        box("c1", 458, 225, 38, 38, "crate"),
        box("c2", 760, 172, 38, 38, "crate"),
        box("stream1", 14, 56, 36, 220, "water"),
        box("stream2", 14, 424, 36, 220, "water"),
      ]),
    ],
    traps: [
      { x: 430, y: 365, radius: 20, offset: 0 },
      { x: 770, y: 335, radius: 20, offset: 0 },
    ],
    runes: [
      { x: 600, y: 68 },
      { x: 600, y: 632 },
    ],
  },
  ruins: {
    name: "Ancient Sanctuary",
    tag: "FLANK. FEINT. STRIKE.",
    description: "Broken walls and narrow passages reward clever flanks.",
    ground: "#829d72",
    path: "#c3bc8d",
    edge: "#3b6050",
    obstacles: [
      box("center", 575, 285, 50, 130),
      ...mirror([
        box("w1", 280, 155, 34, 115),
        box("w2", 375, 498, 135, 32),
        box("w3", 450, 152, 82, 32),
        box("c1", 404, 282, 38, 38, "crate"),
        box("c2", 742, 532, 38, 38, "crate"),
        box("pool", 24, 54, 84, 76, "water"),
      ]),
    ],
    traps: [
      { x: 350, y: 365, radius: 20, offset: 1.5 },
      { x: 850, y: 335, radius: 20, offset: 1.5 },
    ],
    runes: [
      { x: 600, y: 68 },
      { x: 600, y: 632 },
    ],
  },
  frozen: {
    name: "Frozen Fortress",
    tag: "KEEP YOUR COOL",
    description:
      "Slippery shortcuts and frost-covered stone change your momentum.",
    ground: "#c9e3e9",
    path: "#e8f2ec",
    edge: "#648d9a",
    obstacles: [
      box("center", 550, 280, 100, 140),
      ...mirror([
        box("w1", 300, 165, 120, 32),
        box("w2", 348, 502, 100, 32),
        box("c1", 482, 188, 38, 38, "crate"),
        box("pool", 24, 54, 88, 78, "water"),
        box("ice1", 430, 275, 90, 160, "ice"),
      ]),
    ],
    traps: [
      { x: 350, y: 360, radius: 20, offset: 0 },
      { x: 850, y: 340, radius: 20, offset: 0 },
    ],
    runes: [
      { x: 600, y: 68 },
      { x: 600, y: 632 },
    ],
  },
};
export const MAP_IDS = Object.keys(MAPS) as MapId[];
