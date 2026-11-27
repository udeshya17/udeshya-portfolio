"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";
import { LOADER_DONE_EVENT, scrollState } from "./scrollState";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduce ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
    scrollState.lenis = lenis;

    let lastY = window.scrollY;
    const update = () => {
      const y = lenis ? lenis.scroll : window.scrollY;
      scrollState.velocity = lenis ? lenis.velocity : y - lastY;
      lastY = y;
      scrollState.y = y;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollState.progress = max > 0 ? y / max : 0;
    };

    const raf = (time: number) => {
      lenis?.raf(time * 1000);
      if (!lenis) update();
    };

    if (lenis) {
      lenis.on("scroll", () => {
        ScrollTrigger.update();
        update();
      });
      if (!scrollState.introDone) lenis.stop();
    }
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const onRefresh = () => update();
    ScrollTrigger.addEventListener("refresh", onRefresh);
    const ro = new ResizeObserver(() => ScrollTrigger.refresh());
    ro.observe(document.body);
    onRefresh();

    const onPointer = (e: PointerEvent) => {
      scrollState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      scrollState.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onLeave = () => {
      scrollState.pointer.x = 9; // far away: no repulsion
      scrollState.pointer.y = 9;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    const onLoaded = () => {
      lenis?.start();
      ScrollTrigger.refresh();
    };
    window.addEventListener(LOADER_DONE_EVENT, onLoaded);

    // decay velocity when idle so warp effects relax
    const idle = () => {
      scrollState.velocity *= 0.92;
    };
    gsap.ticker.add(idle);

    return () => {
      gsap.ticker.remove(raf);
      gsap.ticker.remove(idle);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener(LOADER_DONE_EVENT, onLoaded);
      lenis?.destroy();
      scrollState.lenis = null;
    };
  }, []);

  return null;
}
