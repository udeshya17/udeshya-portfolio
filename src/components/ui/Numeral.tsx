"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

/** Giant outlined section numeral that drifts against the scroll for depth. */
export default function Numeral({ n, side = "right" }: { n: number; side?: "left" | "right" }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: 25 },
        { yPercent: -25, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } },
      );
    });
    return () => ctx.revert();
  }, []);
  return (
    <span
      ref={ref}
      aria-hidden
      className={`numeral pointer-events-none absolute top-[8%] -z-10 font-display text-[38vw] leading-none font-extrabold tracking-tighter select-none md:text-[26vw] ${side === "right" ? "-right-[2vw]" : "-left-[2vw]"}`}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}
