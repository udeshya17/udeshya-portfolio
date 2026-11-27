"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import type { Domain } from "@/lib/content/types";
import { Kicker, Reveal } from "../ui/primitives";

const HUES = ["#f7931a", "#b69cff", "#ff5c8a", "#ffb547", "#7c5cff", "#3fffb0", "#3fe0ff", "#d4ff3f", "#ff7a3d"];

export default function Multiverse({ domains }: { domains: Domain[] }) {
  const list = useRef<HTMLUListElement>(null);
  const orb = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = list.current;
    const o = orb.current;
    if (!el || !o) return;
    const xTo = gsap.quickTo(o, "x", { duration: 0.6, ease: "power3" });
    const yTo = gsap.quickTo(o, "y", { duration: 0.6, ease: "power3" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo(e.clientX - r.left);
      yTo(e.clientY - r.top);
    };
    const enter = (e: PointerEvent) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-hue]");
      if (row) o.style.setProperty("--orb", row.dataset.hue!);
      gsap.to(o, { scale: row ? 1 : 0, duration: 0.5, ease: "expo.out" });
    };
    const leave = () => gsap.to(o, { scale: 0, duration: 0.4 });
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerover", enter);
    el.addEventListener("pointerleave", leave);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".domain-row").forEach((row) => {
        gsap.fromTo(
          row,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 1.3, ease: "expo.inOut", scrollTrigger: { trigger: row, start: "top 90%", once: true } },
        );
      });
    }, el);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerover", enter);
      el.removeEventListener("pointerleave", leave);
      ctx.revert();
    };
  }, [domains]);

  return (
    <section id="multiverse" className="relative isolate z-10 px-5 pt-40 pb-32 md:px-10 md:pt-56 md:pb-44">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid items-end gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <Kicker className="mb-8">Domains</Kicker>
            <Reveal as="h2" type="words" className="h-section">
              One developer. <span className="font-serif font-normal text-accent italic">{domains.length}</span> universes.
            </Reveal>
          </div>
          <Reveal as="p" className="max-w-md text-lg leading-relaxed text-fog lg:justify-self-end">
            Most engineers live in one domain. I travel between them, carrying patterns from fintech into healthcare, and from AI into everything.
          </Reveal>
        </div>

        <ul ref={list} className="relative mt-20 border-t border-line">
          <div
            ref={orb}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 z-0 -mt-36 -ml-36 h-72 w-72 scale-0 rounded-full opacity-60 blur-2xl"
            style={{ background: "radial-gradient(circle, var(--orb, var(--accent)), transparent 65%)" }}
          />
          {domains.map((d, i) => {
            const hue = HUES[i % HUES.length];
            return (
              <li key={d.name} data-hue={hue} className="domain-row group relative z-[1] border-b border-line" data-cursor="Explore">
                <span
                  className="absolute inset-0 origin-left scale-x-0 transition-transform duration-700 ease-out-expo group-hover:scale-x-100"
                  style={{ background: `linear-gradient(90deg, ${hue}26, transparent 70%)` }}
                />
                <div className="relative grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 gap-y-3 py-7 md:grid-cols-[3rem_1fr] lg:grid-cols-[4rem_1.1fr_1.2fr_auto] md:py-9">
                  <span className="font-mono text-xs text-fog">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-display text-3xl font-bold tracking-tight transition-[translate] duration-700 ease-out-expo group-hover:translate-x-4 md:text-5xl" style={{ ["--h" as string]: hue }}>
                    <span className="transition-colors duration-500 group-hover:text-[var(--h)]">{d.name}</span>
                  </h3>
                  <p className="col-start-2 max-w-xl text-[15px] leading-relaxed text-fog lg:col-start-auto">{d.blurb}</p>
                  <div className="col-start-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-bone/60 lg:col-start-auto lg:max-w-[14rem] lg:justify-end">
                    {d.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
