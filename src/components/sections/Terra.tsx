"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { FadeIn, Reveal, UniverseTag } from "../ui/primitives";

const PRINCIPLES = [
  { k: "Roots", t: "System design first", d: "Schemas, queues and boundaries chosen before a single component is written." },
  { k: "Trunk", t: "Boring, reliable backends", d: "Tested APIs, isolated compute and observability that survive peak season." },
  { k: "Canopy", t: "Interfaces people feel", d: "Fast, accessible, animated frontends, because users only see the leaves." },
];

const STAGES = ["Seed", "Sapling", "Grove", "Forest"];

export default function Terra() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const stages = gsap.utils.toArray<HTMLElement>(".stage");
      ScrollTriggerStages(el, stages);
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="terra" data-universe className="relative z-10 flex min-h-[160vh] flex-col justify-between px-5 py-32 md:px-10 md:py-40">
      <div className="mx-auto max-w-5xl text-center">
        <UniverseTag index={7} name="Terra" className="mb-8 justify-center" />
        <Reveal as="h2" type="words" className="font-display text-4xl leading-[1.02] font-bold tracking-tight md:text-7xl">
          Great software grows like a forest:{" "}
          <span className="font-serif font-normal text-[#6dff8f] italic">slowly, then all at once.</span>
        </Reveal>
        <div className="mt-10 flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.25em] uppercase">
          {STAGES.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="stage text-fog transition-colors duration-500">{s}</span>
              {i < STAGES.length - 1 && <span className="text-fog/40">→</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-[60vh] grid w-full max-w-6xl gap-10 md:grid-cols-3 md:gap-8">
        {PRINCIPLES.map((p, i) => (
          <FadeIn key={p.k} delay={i * 0.1} className="border-t border-[#6dff8f]/40 pt-6 md:pr-8">
            <p className="font-mono text-[11px] tracking-[0.25em] text-[#6dff8f] uppercase">
              {String(i + 1).padStart(2, "0")} · {p.k}
            </p>
            <h3 className="mt-6 font-display text-2xl font-bold">{p.t}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-fog">{p.d}</p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function ScrollTriggerStages(el: HTMLElement, stages: HTMLElement[]) {
  stages.forEach((s, i) => {
    gsap.to(s, {
      color: "#6dff8f",
      scrollTrigger: {
        trigger: el,
        start: () => `top+=${(i / stages.length) * el.offsetHeight * 0.6} 55%`,
        toggleActions: "play none none reverse",
      },
    });
  });
}
