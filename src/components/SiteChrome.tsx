"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import type { Profile } from "@/lib/content/types";
import Cursor from "./cursor/Cursor";
import Loader from "./loader/Loader";
import MobileDock from "./nav/MobileDock";
import Navbar from "./nav/Navbar";
import { scrollState, scrollToId, setLock, subscribeActive } from "./scroll/scrollState";
import SmoothScroll from "./scroll/SmoothScroll";
import UniverseSignal from "./UniverseSignal";
import { UNIVERSES } from "./universes";

const Scene = dynamic(() => import("./three/Scene"), { ssr: false });

/** Sci-fi readout on the right edge: scroll %, velocity, current universe. */
function Hud() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tick = () => {
      if (!ref.current) return;
      const u = UNIVERSES[scrollState.active] ?? UNIVERSES[0];
      ref.current.textContent = `SCROLL ${String(Math.round(scrollState.progress * 100)).padStart(3, "0")}%  ·  VEL ${Math.abs(scrollState.velocity).toFixed(1).padStart(4, "0")}  ·  ${u.name.toUpperCase()}`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-1/2 right-3 z-40 hidden origin-center translate-x-[calc(50%-6px)] -translate-y-1/2 rotate-90 font-mono text-[10px] tracking-[0.2em] whitespace-pre text-fog/60 lg:block"
    />
  );
}

/** Keeps the CSS accent colours in sync with the active universe. */
function AccentSync() {
  useEffect(() => {
    const apply = () => {
      const u = UNIVERSES[Math.max(0, scrollState.active)] ?? UNIVERSES[0];
      document.documentElement.style.setProperty("--accent", u.ui[0]);
      document.documentElement.style.setProperty("--accent-2", u.ui[1]);
    };
    apply();
    const unsub = subscribeActive(apply);
    return () => {
      unsub();
    };
  }, []);
  return null;
}

/** On client navigation: reset scroll, re-measure triggers, honour #hash links. */
function RouteSync() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scrollState.lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    const id = window.setTimeout(() => {
      ScrollTrigger.refresh();
      const hash = window.location.hash.slice(1);
      if (hash) scrollToId(hash);
    }, 350);
    return () => window.clearTimeout(id);
  }, [pathname]);
  return null;
}

/** Pins the 3D scene to one universe while mounted (used by non-home pages). */
export function UniverseLock({ index }: { index: number }) {
  useEffect(() => {
    setLock(index);
    return () => setLock(null);
  }, [index]);
  return null;
}

export default function SiteChrome({ profile, children }: { profile: Profile; children: ReactNode }) {
  return (
    <>
      <Loader name={profile.name} />
      <SmoothScroll />
      <RouteSync />
      <AccentSync />
      <Scene />
      <Cursor />
      <div className="grain" aria-hidden />
      <Navbar profile={profile} />
      <MobileDock />
      <Hud />
      <UniverseSignal />
      {children}
    </>
  );
}
