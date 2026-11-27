"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Project } from "@/lib/content/types";
import { BrowserFrame } from "../ui/ProjectVisual";
import { UniverseTag } from "../ui/primitives";

gsap.registerPlugin(ScrollTrigger);

export default function Projects({ projects }: { projects: Project[] }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const featured = projects.filter((p) => p.featured);
  const shown = (featured.length >= 3 ? featured : projects).slice(0, 7);
  const rest = projects.filter((p) => !shown.includes(p));

  useEffect(() => {
    const el = section.current;
    const tr = track.current;
    if (!el || !tr) return;
    const ctx = gsap.context(() => {
      const distance = () => Math.max(0, tr.scrollWidth - window.innerWidth);
      const tween = gsap.to(tr, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => bar.current && (bar.current.style.transform = `scaleX(${self.progress})`),
        },
      });
      gsap.utils.toArray<HTMLElement>(".proj-card").forEach((card) => {
        gsap.fromTo(
          card,
          { rotateY: -18, scale: 0.88, opacity: 0.3 },
          {
            rotateY: 0,
            scale: 1,
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "left 55%", scrub: true },
          },
        );
        // the website inside the browser frame scrolls as the card travels across the screen
        const frame = card.querySelector<HTMLElement>(".proj-frame");
        if (frame) {
          ScrollTrigger.create({
            trigger: card,
            containerAnimation: tween,
            start: "left 85%",
            end: "right 15%",
            onUpdate: (self) => frame.style.setProperty("--p", self.progress.toFixed(4)),
          });
        }
      });
    }, el);
    return () => ctx.revert();
  }, [projects]);

  return (
    <section ref={section} id="projects" data-universe className="relative z-10 h-[100svh] overflow-hidden">
      <div ref={track} className="flex h-full w-max items-center gap-5 pr-[8vw] pl-5 [perspective:1400px] md:gap-8 md:pl-10">
        <div className="flex w-[85vw] shrink-0 flex-col justify-center md:w-[38vw] md:pr-10">
          <UniverseTag index={6} name="the Wormhole" className="mb-8" />
          <h2 className="font-display text-[8.2vw] leading-[0.92] font-extrabold tracking-tight sm:text-5xl md:text-8xl">
            Selected <span className="font-serif font-normal text-accent italic">work</span>
            <br />
            from the other side.
          </h2>
          <p className="mt-6 max-w-sm text-lg text-fog">Keep scrolling: the gallery moves sideways and live websites scroll inside each frame. Open any project for the full case study.</p>
          <p className="mt-10 flex items-center gap-3 font-mono text-[11px] tracking-[0.25em] text-fog uppercase">
            <span className="inline-block h-px w-14 bg-accent" /> {String(shown.length).padStart(2, "0")} featured · scroll →
          </p>
        </div>

        {shown.map((p, i) => (
          <article
            key={p.slug}
            className="proj-card flex h-[74svh] w-[86vw] shrink-0 flex-col overflow-hidden rounded-[2rem] border border-line bg-[#0d0a12]/90 p-3 backdrop-blur-xl md:h-[78vh] md:w-[min(60vw,1000px)]"
          >
            <Link href={`/projects/${p.slug}`} className="relative block min-h-0 flex-[1.35]" data-cursor="Open">
              <BrowserFrame p={p} index={i} className="proj-frame" />
              {p.featured && (
                <span className="absolute top-14 right-4 rounded-full bg-black/60 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-accent uppercase backdrop-blur">
                  Featured
                </span>
              )}
            </Link>
            <div className="flex flex-1 flex-col justify-between gap-3 px-3 pt-5 pb-2 md:px-5">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] tracking-[0.25em] text-fog uppercase">{p.category}</p>
                    <h3 className="mt-1 truncate font-display text-2xl font-bold tracking-tight md:text-4xl">{p.name}</h3>
                    <p className="mt-0.5 font-serif text-lg text-bone/80 italic">{p.tagline}</p>
                  </div>
                  <span className="font-mono text-sm text-fog">{p.year}</span>
                </div>
                <p className="mt-3 line-clamp-2 max-w-2xl text-[14px] leading-relaxed text-fog">{p.description}</p>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {p.stack.slice(0, 5).map((s) => (
                    <span key={s} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10.5px] text-bone/70">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="rounded-full border border-line px-4 py-2 text-sm hover:border-bone">
                      Live ↗
                    </a>
                  )}
                  <Link href={`/projects/${p.slug}`} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-bone">
                    Case study →
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}

        {rest.length > 0 && (
          <div className="flex h-[74svh] w-[86vw] shrink-0 flex-col rounded-[2rem] border border-line bg-[#0d0a12]/90 p-7 backdrop-blur-xl md:h-[78vh] md:w-[min(46vw,760px)] md:p-10">
            <p className="font-mono text-[11px] tracking-[0.28em] text-fog uppercase">More work · {rest.length}</p>
            <ul className="mt-6 min-h-0 flex-1 overflow-y-auto pr-2 no-scrollbar" data-lenis-prevent>
              {rest.map((p) => (
                <li key={p.slug} className="border-b border-line">
                  <Link href={`/projects/${p.slug}`} className="group flex items-baseline justify-between gap-4 py-4" data-cursor="Open">
                    <span className="min-w-0">
                      <span className="block truncate font-display text-xl font-bold transition-[color,translate] duration-500 group-hover:translate-x-2 group-hover:text-accent md:text-2xl">
                        {p.name}
                      </span>
                      <span className="block truncate text-sm text-fog">{p.category}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-fog transition-colors group-hover:text-accent">{p.year} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="absolute inset-x-5 bottom-6 h-px bg-line md:inset-x-10">
        <div ref={bar} className="h-full origin-left scale-x-0 bg-accent" />
      </div>
    </section>
  );
}
