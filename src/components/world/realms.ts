export type RealmKind = "cosmos" | "ocean" | "forest" | "sky" | "aurora";

export type Realm = {
  id: string; // DOM id you land on when jumping to this world
  kind: RealmKind;
  nav: string; // what lives in this world, for menus
  name: string; // the world's name, shown at its gate and in the nav
  line: string; // a one-line whisper under the title card
  ui: [string, string]; // UI accent pair while you're in this world
  swatch: [string, string, string]; // menu orb gradient: highlight, mid, shadow
  /** Where on Earth this world is: the globe turns to face it before you dive in. */
  place: { name: string; lat: number; lon: number };
  /** The line shown before the journey here starts. */
  cue?: string;
};

/** The journey, in scroll order. A gate sits between each pair of worlds. */
export const REALMS: Realm[] = [
  {
    id: "home",
    kind: "cosmos",
    nav: "Home",
    name: "First Light",
    line: "Where it begins.",
    ui: ["#b69cff", "#3fe0ff"],
    swatch: ["#ffd2b0", "#7b5cff", "#140f33"],
    place: { name: "Low Earth orbit", lat: -38, lon: -152 },
  },
  {
    id: "ocean",
    kind: "ocean",
    nav: "Domains · Skills",
    name: "The Deep",
    line: "Hold your breath.",
    ui: ["#5ee7ff", "#7cf7d4"],
    swatch: ["#c8f7ff", "#1aa6c9", "#04213a"],
    place: { name: "Pacific Ocean", lat: -8, lon: -150 },
    cue: "Scroll to drop into the Pacific",
  },
  {
    id: "forest",
    kind: "forest",
    nav: "Journey · Process",
    name: "Old Forest",
    line: "Walk softly.",
    ui: ["#a6ff8f", "#ffd166"],
    swatch: ["#fff1a8", "#3f9b5a", "#0b2016"],
    place: { name: "Black Forest, Germany", lat: 48.0, lon: 8.2 },
    cue: "Scroll to surface and head for Germany",
  },
  {
    id: "sky",
    kind: "sky",
    nav: "Work · Services",
    name: "Skyfall",
    line: "Let go.",
    ui: ["#ffb38a", "#ff8fc7"],
    swatch: ["#ffe2b8", "#ff8f8f", "#4a2a6e"],
    place: { name: "Cappadocia, Türkiye", lat: 38.6, lon: 34.8 },
    cue: "Scroll to rise out of the forest",
  },
  {
    id: "aurora",
    kind: "aurora",
    nav: "Signal · Contact",
    name: "Northern Lights",
    line: "Almost home.",
    ui: ["#8cffc1", "#c3a6ff"],
    swatch: ["#c9ffe2", "#3fd0a0", "#0a1a30"],
    place: { name: "Tromsø, Norway", lat: 69.6, lon: 19.0 },
    cue: "Scroll to fly north into the night",
  },
];

export const realmIndex = (kind: RealmKind) => REALMS.findIndex((r) => r.kind === kind);
