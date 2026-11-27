"use client";

import gsap from "gsap";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Dot + lagging ring. Grows over interactive elements; shows a label from [data-cursor]. */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
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
    if (!enabled || !dot.current || !ring.current) return;
    const dx = gsap.quickTo(dot.current, "x", { duration: 0.08, ease: "power3" });
    const dy = gsap.quickTo(dot.current, "y", { duration: 0.08, ease: "power3" });
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3" });

    const move = (e: PointerEvent) => {
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("a, button, [data-cursor], input, textarea, label");
      const text = t?.dataset.cursor ?? "";
      setLabel(text);
      gsap.to(ring.current, {
        scale: t ? (text ? 2.6 : 1.7) : 1,
        backgroundColor: text ? getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#d4ff3f" : "rgba(0,0,0,0)",
        duration: 0.35,
        ease: "power3.out",
      });
      gsap.to(dot.current, { scale: t ? 0 : 1, duration: 0.2 });
    };
    const down = () => gsap.to(ring.current, { scale: "*=0.8", duration: 0.15 });
    const up = () => gsap.to(ring.current, { scale: "/=0.8", duration: 0.25 });

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div
        ref={ring}
        className="pointer-events-none fixed top-0 left-0 z-[200] -mt-5 -ml-5 flex h-10 w-10 items-center justify-center rounded-full border border-bone/50"
      >
        <span className="text-[5px] font-bold tracking-wider text-black uppercase">{label}</span>
      </div>
      <div
        ref={dot}
        className="pointer-events-none fixed top-0 left-0 z-[201] -mt-[3px] -ml-[3px] h-1.5 w-1.5 rounded-full bg-accent"
      />
    </>
  );
}
