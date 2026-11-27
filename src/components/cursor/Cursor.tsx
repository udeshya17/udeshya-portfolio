"use client";

import gsap from "gsap";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Point = { x: number; y: number; t: number };
type Ripple = { x: number; y: number; t: number };

const TAIL_MS = 420; // how long the comet's tail lingers
const RIPPLE_MS = 650;

/**
 * A comet: a bright core, a tail of light in the colour of the world you're in,
 * a lagging ring that swells over anything you can click (and says what it does), and a ripple on click.
 */
export default function Cursor() {
  const core = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [label, setLabel] = useState("");
  const enabled = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    () => false,
  );

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-cursor");
    return () => document.documentElement.classList.remove("has-cursor");
  }, [enabled]);

  useEffect(() => {
    const c = canvas.current;
    if (!enabled || !core.current || !ring.current || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cx = gsap.quickTo(core.current, "x", { duration: 0.06, ease: "power3" });
    const cy = gsap.quickTo(core.current, "y", { duration: 0.06, ease: "power3" });
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.5, ease: "power3" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.5, ease: "power3" });

    const pts: Point[] = [];
    const ripples: Ripple[] = [];
    let accent = "182, 156, 255";
    let dpr = 1;

    const fit = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(window.innerWidth * dpr);
      c.height = Math.round(window.innerHeight * dpr);
    };
    fit();

    // the accent shifts as you travel between worlds; sample it now and then
    const probe = document.createElement("span");
    probe.style.cssText = "position:fixed;visibility:hidden;color:var(--accent)";
    document.body.appendChild(probe);
    const readAccent = () => {
      const m = getComputedStyle(probe).color.match(/[\d.]+/g);
      if (m) accent = `${m[0]}, ${m[1]}, ${m[2]}`;
    };
    readAccent();
    const accentTimer = window.setInterval(readAccent, 400);

    const move = (e: PointerEvent) => {
      cx(e.clientX);
      cy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      if (!reduce) pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    };
    const over = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("a, button, [data-cursor], input, textarea, select, label");
      const text = t?.dataset.cursor ?? "";
      setLabel(text);
      gsap.to(ring.current, { scale: t ? (text ? 2.4 : 1.6) : 1, duration: 0.4, ease: "power3.out" });
      ring.current?.classList.toggle("is-text", !!text);
      ring.current?.classList.toggle("is-hover", !!t);
      gsap.to(core.current, { scale: t ? 0.4 : 1, duration: 0.25 });
    };
    const down = (e: PointerEvent) => {
      gsap.to(ring.current, { scale: "*=0.82", duration: 0.15 });
      if (!reduce) ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    };
    const up = () => gsap.to(ring.current, { scale: "/=0.82", duration: 0.3 });
    const leave = () => gsap.to([core.current, ring.current], { opacity: 0, duration: 0.3 });
    const enter = () => gsap.to([core.current, ring.current], { opacity: 1, duration: 0.3 });

    const draw = () => {
      const now = performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      while (pts.length && now - pts[0].t > TAIL_MS) pts.shift();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      // the tail: segments that thin and fade with age
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const life = 1 - (now - b.t) / TAIL_MS;
        if (life <= 0) continue;
        ctx.strokeStyle = `rgba(${accent}, ${(life * 0.55).toFixed(3)})`;
        ctx.lineWidth = 1 + life * 5;
        ctx.shadowColor = `rgba(${accent}, ${(life * 0.9).toFixed(3)})`;
        ctx.shadowBlur = 14 * life;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // a few sparks shed by the tail
      for (let i = 0; i < pts.length; i += 3) {
        const p = pts[i];
        const life = 1 - (now - p.t) / TAIL_MS;
        const drift = (1 - life) * 18;
        ctx.fillStyle = `rgba(255, 255, 255, ${(life * 0.5).toFixed(3)})`;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(p.t) * drift, p.y + Math.cos(p.t * 1.3) * drift + drift * 0.6, 1.1 * life + 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // click ripples
      while (ripples.length && now - ripples[0].t > RIPPLE_MS) ripples.shift();
      for (const r of ripples) {
        const k = (now - r.t) / RIPPLE_MS;
        const e = 1 - Math.pow(1 - k, 3);
        ctx.strokeStyle = `rgba(${accent}, ${((1 - k) * 0.8).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = `rgba(${accent}, 0.8)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 8 + e * 46, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("resize", fit);
    document.documentElement.addEventListener("pointerleave", leave);
    document.documentElement.addEventListener("pointerenter", enter);
    gsap.ticker.add(draw);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("resize", fit);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.documentElement.removeEventListener("pointerenter", enter);
      gsap.ticker.remove(draw);
      window.clearInterval(accentTimer);
      probe.remove();
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-[199] h-full w-full" />
      <div ref={ring} aria-hidden className="cursor-ring pointer-events-none fixed top-0 left-0 z-[200] -mt-5 -ml-5 flex h-10 w-10 items-center justify-center rounded-full">
        <span className="text-[5px] font-bold tracking-wider text-black uppercase">{label}</span>
      </div>
      <div ref={core} aria-hidden className="cursor-core pointer-events-none fixed top-0 left-0 z-[201] -mt-1 -ml-1 h-2 w-2 rounded-full" />
    </>
  );
}
