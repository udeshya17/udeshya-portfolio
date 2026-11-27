"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import type { SkillGroup } from "@/lib/content/types";
import Numeral from "../ui/Numeral";
import { Reveal, UniverseTag } from "../ui/primitives";

export default function Skills({ skills }: { skills: SkillGroup[] }) {
  const root = useRef<HTMLDivElement>(null);
  const total = skills.reduce((s, g) => s + g.items.length, 0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>(".skill-row").forEach((row) => {
        gsap.fromTo(row.querySelectorAll(".chip"), { y: 30, opacity: 0, scale: 0.8 }, {
          y: 0,
          opacity: 1,
          scale: 1,
          stagger: 0.035,
          duration: 0.9,
          ease: "back.out(1.6)",
          scrollTrigger: { trigger: row, start: "top 88%", once: true },
        });
        gsap.fromTo(row.querySelector(".row-line"), { scaleX: 0 }, {
          scaleX: 1,
          transformOrigin: "left",
          duration: 1.4,
          ease: "expo.out",
          scrollTrigger: { trigger: row, start: "top 90%", once: true },
        });
      });
    }, el);
    return () => ctx.revert();
  }, [skills]);

  return (
    <section id="skills" data-universe className="veil relative isolate z-10 min-h-screen px-5 py-32 md:px-10 md:py-44">
      <Numeral n={4} side="left" />
      <div ref={root} className="ml-auto max-w-4xl md:w-[58%]">
        <UniverseTag index={4} name="Constellation" className="mb-8" />
        <Reveal as="h2" type="words" className="font-display text-[8.2vw] leading-[0.95] sm:text-5xl font-extrabold tracking-tight md:text-7xl">
          A constellation of <span className="font-serif font-normal text-accent italic">{total}+</span> technologies.
        </Reveal>
        <Reveal as="p" className="mt-6 max-w-lg text-lg text-fog">
          Every star is a tool I&apos;ve shipped to production. The lines between them are the systems I design.
        </Reveal>

        <div className="mt-16 space-y-10">
          {skills.map((g, gi) => (
            <div key={g.name} className="skill-row">
              <div className="mb-4 flex items-center gap-4">
                <span className="font-mono text-[11px] tracking-[0.25em] text-accent uppercase">{String(gi + 1).padStart(2, "0")}</span>
                <span className="font-mono text-[11px] tracking-[0.25em] whitespace-nowrap text-fog uppercase">{g.name}</span>
                <span className="row-line h-px flex-1 bg-line" />
              </div>
              <div className="flex flex-wrap gap-2">
                {g.items.map((s) => (
                  <span
                    key={s}
                    className="chip cursor-default rounded-full border border-white/10 bg-[#0c0d16]/90 px-4 py-2 text-[15px] font-medium text-bone backdrop-blur-md transition-[background-color,color,border-color,box-shadow] duration-300 hover:border-accent hover:bg-accent hover:text-black hover:shadow-[0_0_30px_rgb(212_255_63/0.45)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
