"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import type { Profile } from "@/lib/content/types";
import Cursor from "./cursor/Cursor";
import Loader from "./loader/Loader";
import MobileDock from "./nav/MobileDock";
import Navbar from "./nav/Navbar";
import { scrollState, scrollToId, subscribeActive } from "./scroll/scrollState";
import SmoothScroll from "./scroll/SmoothScroll";
import { REALMS } from "./world/realms";
import Stage from "./world/Stage";

/** Keeps the CSS accent colours in sync with the world you're in. */
function AccentSync() {
  useEffect(() => {
    const apply = () => {
      const u = REALMS[Math.max(0, scrollState.active)] ?? REALMS[0];
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
    const go = () => {
      scrollState.lenis?.resize();
      ScrollTrigger.refresh();
      const hash = window.location.hash.slice(1);
      if (hash) scrollToId(hash);
    };
    // the new page (and its pinned sections) needs a moment to lay out
    const a = window.setTimeout(go, 400);
    const b = window.setTimeout(() => {
      const hash = window.location.hash.slice(1);
      const el = hash && document.getElementById(hash);
      if (el && Math.abs(el.getBoundingClientRect().top) > 40) go();
    }, 2900);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [pathname]);
  return null;
}

export default function SiteChrome({ profile, children }: { profile: Profile; children: ReactNode }) {
  return (
    <>
      <Loader name={profile.name} />
      <SmoothScroll />
      <RouteSync />
      <AccentSync />
      <Stage />
      <Cursor />
      <Navbar profile={profile} />
      <MobileDock />
      {children}
    </>
  );
}
