"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { LOADER_DONE_EVENT, scrollState } from "../scroll/scrollState";

const LINES = [
  "Charting the stars",
  "Filling the oceans",
  "Growing the forests",
  "Painting the skies",
  "Waking the aurora",
  "Opening the gates",
];

const COLS = 6;

export default function Loader({ name }: { name: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [line, setLine] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem("udx-seen") === "1";
      sessionStorage.setItem("udx-seen", "1");
    } catch {}
    const duration = reduce ? 0.4 : seen ? 1.3 : 3.1;

    const ready = Promise.all([
      document.fonts?.ready.catch(() => undefined),
      new Promise<void>((r) => (document.readyState === "complete" ? r() : window.addEventListener("load", () => r(), { once: true }))),
    ]);

    const progress = { v: 0 };
    const lineTimer = window.setInterval(() => setLine((l) => (l + 1) % LINES.length), 520);
    const ctx = gsap.context(() => {
      gsap.set(".ld-path", { strokeDasharray: 200, strokeDashoffset: 200 });
      const intro = gsap.timeline();
      intro
        .to(".ld-path", { strokeDashoffset: 0, duration: Math.min(duration, 1.8), ease: "power2.inOut" })
        .from(".ld-orbit", { scale: 0, opacity: 0, duration: 0.9, ease: "expo.out" }, 0.2)
        .from(".ld-meta", { yPercent: 120, opacity: 0, stagger: 0.08, duration: 0.8, ease: "expo.out" }, 0.1);

      const count = gsap.to(progress, {
        v: 92,
        duration: duration * 0.85,
        ease: "power2.inOut",
        onUpdate: () => setCount(Math.round(progress.v)),
      });

      Promise.all([ready, count.then()]).then(() => {
        gsap
          .timeline({
            onComplete: () => {
              window.clearInterval(lineTimer);
              setGone(true);
            },
          })
          .to(progress, {
            v: 100,
            duration: 0.45,
            ease: "power1.out",
            onUpdate: () => setCount(Math.round(progress.v)),
          })
          .to(".ld-mark", { scale: 1.25, opacity: 0, filter: "blur(10px)", duration: 0.6, ease: "expo.in" }, "+=0.05")
          .to(".ld-meta", { yPercent: -120, opacity: 0, stagger: 0.04, duration: 0.5, ease: "expo.in" }, "<")
          .add(() => {
            scrollState.introDone = true;
            window.dispatchEvent(new Event(LOADER_DONE_EVENT));
          })
          .to(".ld-col", { yPercent: -100, duration: 1.1, stagger: 0.07, ease: "expo.inOut" }, "-=0.15");
      });
    }, el);

    return () => {
      window.clearInterval(lineTimer);
      ctx.revert();
    };
  }, []);

  if (gone) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[100] overflow-hidden" role="status" aria-label="Loading portfolio">
      <div className="absolute inset-0 flex">
        {Array.from({ length: COLS }).map((_, i) => (
          <div key={i} className="ld-col relative h-full flex-1 bg-void" style={{ marginLeft: i ? -1 : 0 }} />
        ))}
      </div>

      <div className="ld-mark absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 100 100" className="ld-orbit absolute inset-0 h-full w-full animate-spin-slow">
            <defs>
              <linearGradient id="ldg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#d4ff3f" />
                <stop offset=".55" stopColor="#3fe0ff" />
                <stop offset="1" stopColor="#8b6cff" />
              </linearGradient>
            </defs>
            <ellipse cx="50" cy="50" rx="46" ry="16" fill="none" stroke="url(#ldg)" strokeWidth=".6" opacity=".6" transform="rotate(-28 50 50)" />
            <ellipse cx="50" cy="50" rx="46" ry="16" fill="none" stroke="url(#ldg)" strokeWidth=".4" opacity=".35" transform="rotate(32 50 50)" />
            <circle cx="91" cy="36" r="2.2" fill="#d4ff3f" />
          </svg>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <path className="ld-path" d="M33 25v27a17 17 0 0 0 34 0V25" fill="none" stroke="url(#ldg)" strokeWidth="7" strokeLinecap="round" pathLength={200} />
          </svg>
        </div>
        <div className="mt-8 h-5 overflow-hidden font-mono text-[11px] tracking-[0.3em] text-fog uppercase">
          <div className="ld-meta" key={line}>
            {LINES[line]}
            <span className="animate-pulse">_</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-6 md:p-10">
        <div className="overflow-hidden">
          <div className="ld-meta font-mono text-[11px] leading-relaxed tracking-[0.2em] text-fog uppercase">
            {name}
            <br />
            Portfolio · Multiverse Edition
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="ld-meta font-display text-[22vw] leading-[0.8] font-extrabold tracking-tighter tabular-nums md:text-[13vw]">
            {String(count).padStart(3, "0")}
          </div>
        </div>
      </div>
      <div className="ld-meta absolute inset-x-0 bottom-0 h-px bg-line">
        <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${count}%` }} />
      </div>
    </div>
  );
}
