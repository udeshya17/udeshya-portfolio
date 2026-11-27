"use client";

import type Lenis from "lenis";

/**
 * A tiny mutable store shared by the DOM (Lenis, GSAP, navbar) and the WebGL scene.
 * Mutated every frame, so it deliberately avoids React state.
 */
export const scrollState = {
  y: 0,
  velocity: 0,
  progress: 0, // 0..1 across the whole page
  vh: 800,
  anchors: [] as number[], // document-top of each [data-universe] section
  morph: 0, // continuous universe index (e.g. 2.4 = 40% from #2 to #3)
  active: 0, // rounded universe index
  introDone: false,
  sceneMorph: 0, // smoothed morph actually rendered by the WebGL scene
  sceneX: 0.5, // screen-space x (0..1) of the particle body, used for the readability scrim
  lock: null as number | null, // pages other than home pin the scene to one universe
  pointer: { x: 9, y: 9 }, // NDC -1..1 (9 = off-screen until the mouse moves)
  lenis: null as Lenis | null,
  // the 3D project ring reads this; the Projects section writes it
  gallery: {
    items: [] as GalleryItem[],
    progress: 0, // 0..1 through the pinned section
    active: 0,
    present: true, // false once you've scrolled past the pinned gallery
  },
};

export function setGalleryItems(items: GalleryItem[]) {
  scrollState.gallery.items = items;
  if (!items.length) scrollState.gallery.progress = 0;
}

export type GalleryItem = {
  slug: string;
  name: string;
  category: string;
  accent: string;
  src: string | null; // live-site screenshot (tall) or null for a designed poster
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeActive(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setActive(i: number) {
  if (scrollState.lock !== null) i = scrollState.lock;
  if (i === scrollState.active) return;
  scrollState.active = i;
  listeners.forEach((l) => l());
}

export function measureAnchors() {
  const els = document.querySelectorAll<HTMLElement>("[data-universe]");
  const y = window.scrollY;
  scrollState.anchors = Array.from(els).map((el) => el.getBoundingClientRect().top + y);
  scrollState.vh = window.innerHeight;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Σ of eased transitions: each section entering the viewport adds 0..1. */
export function computeMorph(y: number) {
  const { anchors, vh } = scrollState;
  let m = 0;
  for (let i = 1; i < anchors.length; i++) {
    const t = (y + vh * 0.9 - anchors[i]) / (vh * 0.75);
    m += smooth(Math.min(1, Math.max(0, t)));
  }
  return m;
}

export function setLock(i: number | null) {
  scrollState.lock = i;
  if (i !== null) {
    scrollState.active = -1; // force listeners to fire
    setActive(i);
  }
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (scrollState.lenis) {
    scrollState.lenis.resize();
    scrollState.lenis.scrollTo(el, { duration: 2.2, force: true });
  }
  else el.scrollIntoView({ behavior: "smooth" });
}

export const LOADER_DONE_EVENT = "udx:loader-done";
