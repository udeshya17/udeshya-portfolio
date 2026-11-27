"use client";

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import Link from "next/link";
import { Fragment, useEffect, useRef } from "react";
import type { Profile, SkillGroup, Stat } from "@/lib/content/types";
import { LOADER_DONE_EVENT, scrollState } from "../scroll/scrollState";
import SectionLink from "../ui/SectionLink";
import { Magnetic } from "../ui/primitives";

gsap.registerPlugin(SplitText);

/** "I turn *ambitious* ideas" -> the starred word gets the serif accent treatment. */
function Headline({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <span key={i} className="text-gradient font-serif font-normal tracking-[-0.02em] italic">
            {part.slice(1, -1)}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export default function Hero({ profile, stats }: { profile: Profile; stats: Stat[]; skills?: SkillGroup[] }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const split = SplitText.create(".hero-headline", { type: "lines", mask: "lines" });
      gsap.set(split.lines, { yPercent: 105 });
      gsap.set(".hero-fade", { opacity: 0, y: 24 });

      const play = () => {
        gsap
          .timeline({ delay: 0.5 })
          .to(split.lines, { yPercent: 0, duration: 1.5, stagger: 0.12, ease: "expo.out" })
          .to(".hero-fade", { opacity: 1, y: 0, duration: 1.2, stagger: 0.1, ease: "expo.out" }, "-=1.1");
      };
      if (scrollState.introDone) play();
      else window.addEventListener(LOADER_DONE_EVENT, play, { once: true });

      // content drifts up and dissolves as the planet sinks
      gsap.to(".hero-content", {
        yPercent: -18,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "70% top", scrub: true },
      });
    }, el);
    return () => ctx.revert();
  }, [profile.headline]);

  return (
    <section ref={root} id="home" data-universe className="relative z-10 flex min-h-[100svh] flex-col px-5 md:px-10">
      <div className="hero-content mx-auto flex w-full max-w-[1500px] flex-1 flex-col justify-center pt-32 pb-[34svh] md:pb-[30vh]">
        <p className="hero-fade mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] md:mb-10">
          <span className="text-bone">{profile.name}</span>
          <span className="h-px w-8 bg-line" />
          <span className="text-fog">{profile.title}</span>
          {profile.available && (
            <span className="flex items-center gap-2 text-fog md:ml-4">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Available for new work
            </span>
          )}
        </p>

        <h1 className="hero-headline max-w-[17ch] font-display text-[clamp(2.6rem,6.6vw,7rem)] leading-[1.0] font-bold tracking-[-0.035em]">
          <Headline text={profile.headline || profile.title} />
        </h1>

        <p className="hero-fade mt-8 max-w-2xl text-[17px] leading-relaxed text-fog md:text-xl md:leading-relaxed">{profile.tagline}</p>

        <div className="hero-fade mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Magnetic>
            <Link href="/contact" className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-bone py-2 pr-2 pl-7 text-[15px] font-semibold text-black">
              <span className="relative z-10">Start a project</span>
              <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black text-bone transition-transform duration-500 group-hover:-rotate-45">
                →
              </span>
              <span className="absolute inset-0 translate-y-full bg-accent transition-transform duration-500 ease-out-expo group-hover:translate-y-0" />
            </Link>
          </Magnetic>
          <SectionLink id="projects" className="group inline-flex items-center gap-2 text-[15px] font-medium text-bone">
            <span className="bg-gradient-to-r from-bone to-bone bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">
              View selected work
            </span>
            <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
          </SectionLink>
        </div>

        {stats.length > 0 && (
          <dl className="hero-fade mt-16 flex flex-wrap gap-x-12 gap-y-6 md:mt-20">
            {stats.slice(0, 3).map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-3xl font-bold tracking-tight text-bone md:text-4xl">
                  {s.value}
                  {s.suffix}
                </dd>
                <dd className="mt-1 max-w-[11rem] text-[13px] leading-snug text-fog">{s.label}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <SectionLink id="about" className="hero-fade absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-[11px] tracking-[0.3em] text-bone/70 uppercase md:flex" aria-label="Scroll to explore">
        Scroll
        <span className="relative block h-12 w-px overflow-hidden bg-white/15">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[scroll-cue_2.2s_ease-in-out_infinite] bg-bone" />
        </span>
      </SectionLink>
    </section>
  );
}
