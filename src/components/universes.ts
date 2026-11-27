export type ShapeKind =
  | "galaxy"
  | "planet"
  | "multiverse"
  | "neural"
  | "dna"
  | "wormhole"
  | "tree"
  | "waves"
  | "text";

export type Universe = {
  id: string; // DOM id of the section
  nav: string; // label in navigation
  name: string; // universe name shown in the HUD
  shape: ShapeKind;
  colors: [string, string, string]; // particle gradient: outer, mid, hot core
  ui: [string, string]; // UI accent pair while this universe is active
  bg: string; // WebGL clear color
  offset: [number, number, number]; // desktop position of the particle body
  tilt: [number, number]; // x/z tilt of the body
  scale: number;
  mOffset?: [number, number, number]; // portrait/mobile position override
  mScale?: number; // portrait/mobile scale override
  spin: number; // rad/s around local y
  dim: number; // particle brightness (lower where text sits on top of the scene)
  wave?: number; // ocean wave strength
};

export const UNIVERSES: Universe[] = [
  {
    id: "home",
    nav: "Home",
    name: "First Light",
    shape: "galaxy",
    colors: ["#7b5cff", "#3fe0ff", "#ff8a5c"],
    ui: ["#b69cff", "#3fe0ff"],
    bg: "#05040d",
    offset: [2.4, -0.75, 0],
    tilt: [0.16, -0.1],
    scale: 1.25,
    mOffset: [0, 1.35, 0],
    spin: 0.12,
    dim: 0,
  },
  {
    id: "about",
    nav: "Origin",
    name: "Origin",
    shape: "planet",
    colors: ["#ff7a3d", "#ffd27a", "#ff3d6e"],
    ui: ["#ffb15c", "#ff6b6b"],
    bg: "#0b0508",
    offset: [2.5, 0, 0],
    tilt: [0.38, 0.32],
    scale: 1,
    spin: 0.18,
    dim: 0.7,
  },
  {
    id: "multiverse",
    nav: "Multiverse",
    name: "The Multiverse",
    shape: "multiverse",
    colors: ["#3fe0ff", "#d48bff", "#ffffff"],
    ui: ["#5ee7ff", "#e28bff"],
    bg: "#040714",
    offset: [0, 0, -1.5],
    tilt: [0.15, 0],
    scale: 1.2,
    spin: 0.1,
    dim: 0.55,
  },
  {
    id: "skills",
    nav: "Skills",
    name: "Constellation",
    shape: "neural",
    colors: ["#3fe0ff", "#d4ff3f", "#ffffff"],
    ui: ["#d4ff3f", "#3fe0ff"],
    bg: "#030a10",
    offset: [-3.5, 0, 0],
    tilt: [0.2, 0],
    scale: 0.82,
    spin: 0.14,
    dim: 0.65,
  },
  {
    id: "experience",
    nav: "Journey",
    name: "Evolution",
    shape: "dna",
    colors: ["#d4ff3f", "#3fffb0", "#3fe0ff"],
    ui: ["#6dffb0", "#d4ff3f"],
    bg: "#030b08",
    offset: [2.8, 0, 0],
    tilt: [0, 0.38],
    scale: 1,
    spin: 0.45,
    dim: 0.85,
  },
  {
    id: "projects",
    nav: "Work",
    name: "Wormhole",
    shape: "wormhole",
    colors: ["#ff5c8a", "#ff9a3d", "#ffe08a"],
    ui: ["#ff6b9a", "#ffb347"],
    bg: "#0c0410",
    offset: [0, 0, -2.5],
    tilt: [1.15, 0],
    scale: 1.15,
    spin: 0.22,
    dim: 0.14,
  },
  {
    id: "terra",
    nav: "Terra",
    name: "Terra",
    shape: "tree",
    colors: ["#ffb347", "#6dff8f", "#fff1a8"],
    ui: ["#7dff8a", "#ffd166"],
    bg: "#020d07",
    offset: [0, -0.55, 0],
    tilt: [0.05, 0],
    scale: 1.08,
    spin: 0.08,
    dim: 0.9,
  },
  {
    id: "stats",
    nav: "Stats",
    name: "Signal",
    shape: "waves",
    colors: ["#2b7bff", "#3fe0ff", "#b6f3ff"],
    ui: ["#5aa8ff", "#3fe0ff"],
    bg: "#020a14",
    offset: [0, -1.9, 0],
    tilt: [0.5, 0],
    scale: 1,
    spin: 0,
    wave: 1,
    dim: 0.55,
  },
  {
    id: "contact",
    nav: "Contact",
    name: "Hello",
    shape: "text",
    colors: ["#d4ff3f", "#ffffff", "#b69cff"],
    ui: ["#d4ff3f", "#b69cff"],
    bg: "#06060b",
    offset: [3.05, 0.35, 0],
    tilt: [0, 0],
    scale: 0.58,
    mOffset: [0, 3.0, 0],
    mScale: 0.4,
    spin: 0,
    dim: 1,
  },
];
