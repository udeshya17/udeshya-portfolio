"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { scrollToId } from "../scroll/scrollState";
import { REALMS } from "./realms";

const TAU = Math.PI * 2;
const FLAT = 0.38; // the orbits are circles seen at an angle
const LEAN = -16; // and the whole system is tipped, in degrees

/** One orbit per world after the first. r: share of the frame, period: seconds per lap, phase: where it starts. */
const ORBITS = [
  { r: 0.3, period: 52, phase: 0.1 },
  { r: 0.45, period: 84, phase: 0.72 },
  { r: 0.62, period: 128, phase: 0.38 },
  { r: 0.8, period: 190, phase: 0.92 },
];

/**
 * The journey as a model you can hold: First Light at the centre, the four worlds
 * you'll fall through in orbit around it. Each one is a way in. Time stops while you aim.
 */
export default function Orrery() {
  const root = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const [hot, setHot] = useState<number | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const bodies = Array.from(el.querySelectorAll<HTMLElement>("[data-body]"));
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lean = (LEAN * Math.PI) / 180;
    const cos = Math.cos(lean);
    const sin = Math.sin(lean);
    let seen = true;
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting));
    io.observe(el);

    let t = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!seen) return;
      if (!paused.current && !still) t += dt;
      const R = el.clientWidth / 2;
      if (!R) return;
      bodies.forEach((b, i) => {
        const o = ORBITS[i];
        const th = (o.phase + t / o.period) * TAU;
        const x = Math.cos(th) * o.r * R;
        const y = Math.sin(th) * o.r * R * FLAT;
        const near = Math.sin(th); // +1 at the front of its orbit, -1 behind the star
        b.style.transform = `translate3d(${(x * cos - y * sin).toFixed(1)}px, ${(x * sin + y * cos).toFixed(1)}px, 0) scale(${(0.84 + 0.2 * near).toFixed(3)})`;
        b.style.zIndex = near > 0 ? "3" : "1";
      });
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
    };
  }, []);

  const aim = (i: number | null) => {
    paused.current = i !== null;
    setHot(i);
  };

  return (
    <div ref={root} className="orrery" data-hot={hot ?? undefined}>
      <svg className="orrery-lines" viewBox="-500 -500 1000 1000" aria-hidden>
        <circle className="dial" r="494" />
        <g transform={`rotate(${LEAN})`}>
          <line x1="-500" x2="500" />
          {ORBITS.map((o, i) => (
            <ellipse key={i} className={`o${i}`} rx={o.r * 500} ry={o.r * 500 * FLAT} />
          ))}
          <ellipse className="belt" rx={0.535 * 500} ry={0.535 * 500 * FLAT} />
        </g>
      </svg>

      <div className="orrery-sun" aria-hidden>
        <i className="corona" />
        <i className="rays rays-b" />
        <i className="rays" />
        <i className="flare" />
        <i className="core" />
      </div>
      <p className="orrery-you" aria-hidden>
        01 · {REALMS[0].name}
        <em>You are here</em>
      </p>

      {REALMS.slice(1).map((r, i) => (
        <button
          key={r.id}
          type="button"
          data-body
          data-cursor="Dive in"
          aria-label={`Jump to ${r.name}: ${r.nav}`}
          className={`orrery-body orb-${r.kind}`}
          onClick={() => scrollToId(r.id)}
          onPointerEnter={() => aim(i)}
          onPointerLeave={() => aim(null)}
          onFocus={() => aim(i)}
          onBlur={() => aim(null)}
        >
          <span className="orb" />
          <span className="orrery-tag">
            <b>0{i + 2}</b>
            {r.name}
            <small>{r.nav}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
