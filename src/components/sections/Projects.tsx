"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/content/types";
import { scrollState, setGalleryItems } from "../scroll/scrollState";
import { previewSrc } from "../ui/ProjectVisual";
import { FadeIn, UniverseTag } from "../ui/primitives";

gsap.registerPlugin(ScrollTrigger);

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Projects({ projects }: { projects: Project[] }) {
  const section = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const featured = projects.filter((p) => p.featured);
  const shown = (featured.length >= 3 ? featured : projects).slice(0, 8);
  const rest = projects.filter((p) => !shown.includes(p));
  const p = shown[active] ?? shown[0];

  // publish the ring's contents to the 3D scene
  useEffect(() => {
    setGalleryItems(
      shown.map((x) => ({
      slug: x.slug,
      name: x.name,
      category: x.category.split("·")[0].trim(),
      accent: x.accent || "#b69cff",
        src: previewSrc(x) ?? (x.image || null),
      })),
    );
    return () => setGalleryItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  useEffect(() => {
    const el = section.current;
    if (!el || shown.length < 1) return;
    const n = shown.length;
    const ctx = gsap.context(() => {
      trigger.current = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: () => `+=${Math.max(1, n - 1) * window.innerHeight * 0.85}`,
        pin: true,
        invalidateOnRefresh: true,
        onLeave: () => (scrollState.gallery.present = false),
        onEnterBack: () => (scrollState.gallery.present = true),
        onUpdate: (self) => {
          scrollState.gallery.progress = self.progress;
          const i = Math.round(self.progress * (n - 1));
          if (i !== scrollState.gallery.active) {
            scrollState.gallery.active = i;
            setActive(i);
          }
          if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
        },
      });
    }, el);
    return () => {
      trigger.current = null;
      ctx.revert();
    };
  }, [shown.length]);

  const goTo = (i: number) => {
    const t = trigger.current;
    if (!t) return;
    const y = t.start + ((t.end - t.start) * i) / Math.max(1, shown.length - 1);
    if (scrollState.lenis) scrollState.lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  if (!p) return null;

  return (
    <>
      <section ref={section} id="projects" data-universe className="relative z-10 h-[100svh] overflow-hidden">
        {/* readable side: a soft dark gradient behind the text column */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-void/85 via-void/40 to-transparent md:w-[60%]" />

        <div className="relative mx-auto flex h-full max-w-[1500px] flex-col justify-end px-5 pb-28 md:justify-center md:px-10 md:pb-0">
          <div className="md:w-[40%]">
            <UniverseTag index={6} name="Work" className="mb-6 hidden md:flex" />

            {/* project ticks */}
            <div className="mb-5 flex items-center gap-2 md:mb-8" role="tablist" aria-label="Featured projects">
              {shown.map((x, i) => (
                <button
                  key={x.slug}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={x.name}
                  onClick={() => goTo(i)}
                  className="group py-2"
                >
                  <span
                    className={`block h-[3px] rounded-full transition-all duration-500 ${i === active ? "w-10 bg-accent" : "w-4 bg-white/20 group-hover:bg-white/50"}`}
                  />
                </button>
              ))}
              <span className="ml-3 font-mono text-xs text-fog tabular-nums">
                {String(active + 1).padStart(2, "0")} / {String(shown.length).padStart(2, "0")}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={p.slug} initial="in" animate="show" exit="out" className="space-y-5">
                <motion.p
                  variants={{ in: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 }, out: { opacity: 0, y: -10 } }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="flex items-center gap-3 text-sm text-fog"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: p.accent, boxShadow: `0 0 12px ${p.accent}` }} />
                  {p.category} · {p.year}
                </motion.p>
                <div className="overflow-hidden">
                  <motion.h3
                    variants={{ in: { y: "105%" }, show: { y: "0%" }, out: { y: "-105%" } }}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="font-display text-[clamp(2.4rem,4.6vw,4.5rem)] leading-[0.98] font-bold tracking-[-0.035em]"
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
                  className="hidden max-w-md text-[16px] leading-relaxed text-bone/80 md:block"
                >
                  {p.description}
                </motion.p>
                <motion.p
                  variants={{ in: { opacity: 0 }, show: { opacity: 1 }, out: { opacity: 0 } }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="hidden max-w-md font-mono text-[11.5px] leading-relaxed text-fog md:block"
                >
                  {p.stack.slice(0, 6).join("  ·  ")}
                </motion.p>
                <motion.div
                  variants={{ in: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 }, out: { opacity: 0 } }}
                  transition={{ duration: 0.6, delay: 0.24, ease: EASE }}
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

        {/* the front 3D screen is clickable */}
        <Link
          href={`/projects/${p.slug}`}
          aria-label={`Open ${p.name} case study`}
          className="absolute top-[9%] left-[5%] h-[26%] w-[90%] md:top-[27%] md:left-[48%] md:h-[47%] md:w-[47%]"
          data-cursor="Open"
        />

        <p className="pointer-events-none absolute right-5 bottom-8 hidden font-mono text-[11px] tracking-[0.25em] text-fog uppercase md:right-10 md:block">
          Scroll to rotate
        </p>
        <div className="absolute inset-x-5 bottom-6 h-px bg-line md:inset-x-10">
          <div ref={bar} className="h-full origin-left scale-x-0 bg-accent" />
        </div>
      </section>

      {rest.length > 0 && (
        <section className="relative isolate z-10 px-5 pt-24 pb-10 md:px-10">
          <div className="mx-auto max-w-[1500px]">
            <FadeIn className="mb-8 flex items-end justify-between gap-4">
              <h3 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
                More <span className="font-serif font-normal text-accent italic">work</span>
              </h3>
              <span className="text-sm text-fog">{rest.length} more case studies</span>
            </FadeIn>
            <ul className="border-t border-line">
              {rest.map((x) => (
                <li key={x.slug} className="border-b border-line">
                  <Link href={`/projects/${x.slug}`} className="group relative grid grid-cols-[1fr_auto] items-baseline gap-4 py-6 md:grid-cols-[1.2fr_1fr_6rem_auto]" data-cursor="Open">
                    <span
                      aria-hidden
                      className="absolute inset-0 origin-left scale-x-0 transition-transform duration-700 ease-out-expo group-hover:scale-x-100"
                      style={{ background: `linear-gradient(90deg, ${x.accent}1f, transparent 70%)` }}
                    />
                    <span className="relative font-display text-2xl font-bold tracking-tight transition-transform duration-500 group-hover:translate-x-2 md:text-3xl">{x.name}</span>
                    <span className="relative hidden text-fog md:block">{x.tagline}</span>
                    <span className="relative hidden text-sm text-fog md:block">{x.year}</span>
                    <span className="relative text-xl text-fog transition-all duration-500 group-hover:-rotate-45 group-hover:text-accent">→</span>
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
