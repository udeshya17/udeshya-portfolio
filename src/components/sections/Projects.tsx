"use client";

import gsap from "gsap";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/content/types";
import { scrollState } from "../scroll/scrollState";
import { BrowserFrame } from "../ui/ProjectVisual";
import { FadeIn, Kicker } from "../ui/primitives";

const EASE = [0.16, 1, 0.3, 1] as const;
const STEP = 80; // svh of scroll per project
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Selected work as a deck of live browser windows floating in the sky.
 * The section is tall and its frame sticks; as you fall through it the front card
 * flies up past you and the next one rises into place.
 */
export default function Projects({ projects }: { projects: Project[] }) {
  const section = useRef<HTMLElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const bar = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const featured = projects.filter((p) => p.featured);
  const shown = (featured.length >= 3 ? featured : projects).slice(0, 8);
  const rest = projects.filter((p) => !shown.includes(p));
  const n = shown.length;
  const p = shown[active] ?? shown[0];

  useEffect(() => {
    const el = section.current;
    if (!el || n < 1) return;
    let current = -1;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -vh || r.top > vh * 2) return; // far away: nothing to draw
      const travel = r.height - vh;
      const prog = travel > 0 ? clamp01(-r.top / travel) : 0;
      const f = prog * Math.max(0, n - 1);
      cards.current.forEach((c, i) => {
        if (!c) return;
        const o = i - f; // <0: already passed, 0: in front, >0: waiting below
        const side = i % 2 ? 1 : -1;
        let y: number, s: number, rot: number, op: number;
        if (o >= 0) {
          y = o * 9;
          s = 1 - o * 0.07;
          rot = Math.min(o, 3) * 2.4 * side;
          op = 1 - (o - 2.1) / 0.7; // the deck shows three cards, the rest wait unseen
        } else {
          y = o * 135;
          s = 1 - o * 0.06;
          rot = o * 7 * side;
          op = 1 + o * 1.5;
        }
        c.style.transform = `translate3d(0, ${y.toFixed(2)}%, 0) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`;
        c.style.opacity = clamp01(op).toFixed(3);
        c.style.zIndex = String(100 - Math.round(Math.abs(o) * 10));
        c.style.pointerEvents = Math.abs(o) < 0.5 ? "auto" : "none";
        // cards further back sit in shadow instead of going see-through
        const shade = c.lastElementChild as HTMLElement | null;
        if (shade) shade.style.opacity = clamp01(o * 0.34).toFixed(3);
      });
      const i = Math.round(f);
      if (i !== current) {
        current = i;
        setActive(i);
      }
      if (bar.current) bar.current.style.transform = `scaleX(${prog.toFixed(4)})`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [n]);

  const goTo = (i: number) => {
    const el = section.current;
    if (!el) return;
    const travel = el.offsetHeight - window.innerHeight;
    const y = el.getBoundingClientRect().top + window.scrollY + (travel * i) / Math.max(1, n - 1);
    if (scrollState.lenis) scrollState.lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  if (!p) return null;

  return (
    <>
      <section ref={section} id="projects" className="relative z-10" style={{ height: `${100 + Math.max(0, n - 1) * STEP}svh` }}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {/* a soft shadow behind the words so they read over bright clouds */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c0922]/85 via-[#0c0922]/50 to-transparent lg:bg-gradient-to-r lg:from-[#0c0922]/80 lg:via-[#0c0922]/40 lg:to-transparent lg:to-65%" />
          <div className="relative mx-auto grid h-full max-w-[1500px] grid-rows-[auto_1fr] content-start gap-7 px-5 pt-20 pb-24 md:px-10 md:pt-24 lg:grid-cols-[0.82fr_1.18fr] lg:grid-rows-1 lg:content-center lg:items-center lg:gap-16 lg:py-0">
            {/* the deck */}
            <div className="relative h-[30svh] w-full sm:h-[40svh] lg:order-2 lg:h-[min(60vh,34vw)]">
              {shown.map((x, i) => (
                <div
                  key={x.slug}
                  ref={(node) => {
                    cards.current[i] = node;
                  }}
                  className="absolute inset-0 origin-bottom will-change-transform"
                  style={{ opacity: i ? 0 : 1 }}
                >
                  <Link href={`/projects/${x.slug}`} aria-label={`Open ${x.name} case study`} className="block h-full" data-cursor="Open" tabIndex={i === active ? 0 : -1}>
                    <BrowserFrame
                      p={x}
                      index={i}
                      auto={i === active}
                      className="h-full shadow-[0_40px_90px_-30px_rgb(10_6_30/0.85),0_0_0_1px_rgb(255_255_255/0.06)]"
                    />
                  </Link>
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-[#0c0922] opacity-0" />
                </div>
              ))}
            </div>

            {/* the words */}
            <div className="relative lg:order-1">
              <Kicker className="mb-6 hidden lg:flex">Selected work</Kicker>

              <div className="mb-3 flex items-center gap-2 md:mb-8" role="tablist" aria-label="Featured projects">
                {shown.map((x, i) => (
                  <button key={x.slug} role="tab" aria-selected={i === active} aria-label={x.name} onClick={() => goTo(i)} className="group py-2">
                    <span className={`block h-[3px] rounded-full transition-all duration-500 ${i === active ? "w-10 bg-accent" : "w-4 bg-white/25 group-hover:bg-white/50"}`} />
                  </button>
                ))}
                <span className="ml-3 font-mono text-xs text-fog tabular-nums">
                  {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={p.slug} initial="in" animate="show" exit="out" className="space-y-3 md:space-y-5">
                  <motion.p
                    variants={{ in: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 }, out: { opacity: 0, y: -10 } }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="flex items-center gap-3 text-sm text-bone/70"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: p.accent, boxShadow: `0 0 12px ${p.accent}` }} />
                    {p.category} · {p.year}
                  </motion.p>
                  <div className="overflow-hidden">
                    <motion.h3
                      variants={{ in: { y: "105%" }, show: { y: "0%" }, out: { y: "-105%" } }}
                      transition={{ duration: 0.7, ease: EASE }}
                      className="font-display text-[clamp(2.2rem,4.4vw,4.25rem)] leading-[0.98] font-bold tracking-[-0.035em]"
                    >
                      {p.name}
                    </motion.h3>
                  </div>
                  <motion.p
                    variants={{ in: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 }, out: { opacity: 0, y: -10 } }}
                    transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
                    className="font-serif text-xl text-accent italic md:text-2xl"
                  >
                    {p.tagline}
                  </motion.p>
                  <motion.p
                    variants={{ in: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 }, out: { opacity: 0, y: -10 } }}
                    transition={{ duration: 0.6, delay: 0.14, ease: EASE }}
                    className="hidden max-w-md text-[16px] leading-relaxed text-bone/80 sm:block"
                  >
                    {p.description}
                  </motion.p>
                  <motion.div
                    variants={{ in: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 }, out: { opacity: 0 } }}
                    transition={{ duration: 0.6, delay: 0.22, ease: EASE }}
                    className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2"
                  >
                    <Link href={`/projects/${p.slug}`} className="group inline-flex items-center gap-3 rounded-full bg-bone py-2 pr-2 pl-6 text-[15px] font-semibold text-black">
                      Read case study
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-bone transition-transform duration-500 group-hover:-rotate-45">→</span>
                    </Link>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-[15px] font-medium text-bone underline decoration-white/25 underline-offset-[6px] hover:decoration-bone">
                        Visit live site ↗
                      </a>
                    )}
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="absolute inset-x-5 bottom-6 h-px bg-white/10 md:inset-x-10">
            <div ref={bar} className="h-full origin-left scale-x-0 bg-accent" />
          </div>
        </div>
      </section>

      {rest.length > 0 && (
        <section className="relative isolate z-10 px-5 pt-24 pb-10 md:px-10">
          <div className="mx-auto max-w-[1500px]">
            <FadeIn className="mb-8 flex items-end justify-between gap-4">
              <h3 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
                More <span className="font-serif font-normal text-accent italic">work</span>
              </h3>
              <span className="text-sm text-bone/70">{rest.length} more case studies</span>
            </FadeIn>
            <ul className="border-t border-white/15">
              {rest.map((x) => (
                <li key={x.slug} className="border-b border-white/15">
                  <Link href={`/projects/${x.slug}`} className="group relative grid grid-cols-[1fr_auto] items-baseline gap-4 py-6 md:grid-cols-[1.2fr_1fr_6rem_auto]" data-cursor="Open">
                    <span
                      aria-hidden
                      className="absolute inset-0 origin-left scale-x-0 transition-transform duration-700 ease-out-expo group-hover:scale-x-100"
                      style={{ background: `linear-gradient(90deg, ${x.accent}1f, transparent 70%)` }}
                    />
                    <span className="relative font-display text-2xl font-bold tracking-tight transition-transform duration-500 group-hover:translate-x-2 md:text-3xl">{x.name}</span>
                    <span className="relative hidden text-bone/70 md:block">{x.tagline}</span>
                    <span className="relative hidden text-sm text-bone/70 md:block">{x.year}</span>
                    <span className="relative text-xl text-bone/70 transition-all duration-500 group-hover:-rotate-45 group-hover:text-accent">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
