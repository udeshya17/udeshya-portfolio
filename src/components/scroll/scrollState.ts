"use client";

import type Lenis from "lenis";

/**
 * A tiny mutable store shared by Lenis, GSAP, the navbar and the world stage.
 * Mutated every frame, so it deliberately avoids React state.
 */
export const scrollState = {
  y: 0,
  velocity: 0,
  progress: 0, // 0..1 across the whole page
  active: 0, // index of the world you're in (see world/realms.ts)
  introDone: false,
  lock: null as number | null, // pages other than home hold the backdrop on one world
  pointer: { x: 9, y: 9 }, // NDC -1..1 (9 = off-screen until the mouse moves)
  lenis: null as Lenis | null,
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
