"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import type { Experience as Exp } from "@/lib/content/types";
import { Kicker, Reveal } from "../ui/primitives";

export default function Experience({ experience }: { experience: Exp[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".tl-fill",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: ".tl-track", start: "top 60%", end: "bottom 60%", scrub: true },
        },
      );
      el.querySelectorAll<HTMLElement>(".tl-item").forEach((item) => {
        gsap.fromTo(item.querySelector(".tl-card"), { x: -60, opacity: 0, filter: "blur(8px)" }, {
          x: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 1.2,
          ease: "expo.out",
          scrollTrigger: { trigger: item, start: "top 80%", once: true },
        });
        gsap.fromTo(
          item.querySelector(".tl-dot"),
          { scale: 0.4 },
          {
            scale: 1,
            duration: 0.5,
            onStart: () => item.querySelector(".tl-dot")?.classList.add("is-on"),
            onReverseComplete: () => item.querySelector(".tl-dot")?.classList.remove("is-on"),
            scrollTrigger: { trigger: item, start: "top 60%", toggleActions: "play none none reverse" },
          },
        );
      });
    }, el);
    return () => ctx.revert();
  }, [experience]);

  return (
    <section id="experience" className="relative isolate z-10 px-5 pt-40 pb-32 md:px-10 md:pt-56 md:pb-44">
      <div ref={root} className="mx-auto max-w-[1500px]">
        <div className="max-w-3xl lg:w-[56%]">
          <Kicker className="mb-8">Journey</Kicker>
          <Reveal as="h2" type="words" className="h-section">
            Every role <span className="font-serif font-normal text-accent italic">mutated</span> me into a better engineer.
          </Reveal>

          <div className="tl-track relative mt-20 pl-10 md:pl-14">
            <div className="absolute top-2 bottom-2 left-[7px] w-px bg-line md:left-[11px]" />
            <div className="tl-fill absolute top-2 bottom-2 left-[7px] w-px origin-top bg-gradient-to-b from-accent via-cyan to-violet md:left-[11px]" />
            <div className="space-y-20">
              {experience.map((e, i) => (
                <article key={`${e.company}-${i}`} className="tl-item relative">
                  <span className="tl-dot absolute top-2 -left-10 h-[15px] w-[15px] rounded-full border-2 border-void md:-left-14 md:h-6 md:w-6" />
                  <div className="tl-card pb-2">
                    <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                      <span className="font-display text-lg font-bold text-accent">
                        {e.start} — {e.end}
                      </span>
                      <span className="font-serif text-fog italic">{e.type}</span>
                    </p>
                    <h3 className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight md:text-[2.6rem]">{e.role}</h3>
                    <p className="mt-1 text-lg text-bone/75">{e.company}</p>
                    <ul className="mt-6 space-y-3 border-l border-line pl-5">
                      {e.highlights.map((h, k) => (
                        <li key={k} className="text-[15.5px] leading-relaxed text-fog">
                          {h}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 font-mono text-[11px] leading-relaxed tracking-[0.08em] text-bone/55">{e.stack.join("  ·  ")}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
