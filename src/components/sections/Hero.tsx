"use client";

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/content/types";
import { Clock } from "../nav/Navbar";
import { LOADER_DONE_EVENT, scrollState } from "../scroll/scrollState";
import SectionLink from "../ui/SectionLink";
import { Magnetic } from "../ui/primitives";
import { REALMS } from "../world/realms";

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

/** The hats, one at a time. */
function Roles({ roles }: { roles: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (roles.length < 2) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % roles.length), 2600);
    return () => window.clearInterval(id);
  }, [roles.length]);
  if (!roles.length) return null;
  return (
    <span className="relative inline-block h-[1.5em] min-w-[13ch] overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={roles[i]}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 font-serif text-[1.15em] leading-[1.3] whitespace-nowrap text-accent italic"
        >
          {roles[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function Hero({ profile }: { profile: Profile }) {
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
          .to(split.lines, { yPercent: 0, duration: 1.5, stagger: 0.12, ease: "expo.out" }, 0.15)
          .to(".hero-fade", { opacity: 1, y: 0, duration: 1.2, stagger: 0.1, ease: "expo.out" }, "-=1.1");
      };
      if (scrollState.introDone) play();
      else window.addEventListener(LOADER_DONE_EVENT, play, { once: true });

      // the words lift away as the planet below sinks
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
    <section ref={root} id="home" className="relative z-10 flex min-h-[100svh] flex-col overflow-hidden px-5 md:px-10">
      <div className="hero-content pointer-events-none relative mx-auto flex w-full max-w-[1500px] flex-1 flex-col justify-end pt-28 pb-32 lg:justify-center lg:pb-28 [&>*]:pointer-events-auto">
        <p className="hero-fade mb-6 flex w-fit items-center gap-3 font-mono text-[10.5px] tracking-[0.3em] text-[#9fe6ff] uppercase">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9fe6ff] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#9fe6ff]" />
          </span>
          Live from orbit · 412 km above the {REALMS[1].place.name}
        </p>
        <p className="hero-fade mb-7 flex w-fit flex-wrap items-center gap-x-4 gap-y-2 text-[14px] md:mb-9">
          <span className="text-bone">{profile.name}</span>
          <span className="h-px w-8 bg-white/25" />
          <span className="text-bone/70">{profile.title}</span>
          {profile.available && (
            <span className="flex items-center gap-2 text-bone/70 md:ml-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Available for new work
            </span>
          )}
        </p>

        <h1 className="hero-headline max-w-[15ch] font-display text-[clamp(2.5rem,6.1vw,6.6rem)] leading-[1.0] font-bold tracking-[-0.035em]">
          <Headline text={profile.headline || profile.title} />
        </h1>

        <p className="hero-fade mt-7 max-w-xl text-[16.5px] leading-relaxed text-bone/75 md:text-[19px] md:leading-relaxed">{profile.tagline}</p>

        <div className="hero-fade mt-9 flex w-fit flex-wrap items-center gap-x-8 gap-y-4">
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
      </div>

      {/* the instrument panel along the bottom */}
      <div className="hero-fade pointer-events-none absolute inset-x-5 bottom-7 hidden items-end justify-between gap-8 font-mono text-[10.5px] tracking-[0.24em] text-bone/55 uppercase md:inset-x-10 lg:flex">
        <SectionLink id="about" className="pointer-events-auto flex items-center gap-4 transition-colors hover:text-bone" aria-label="Scroll to explore">
          <span className="relative block h-11 w-px overflow-hidden bg-white/15">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-[scroll-cue_2.2s_ease-in-out_infinite] bg-bone" />
          </span>
          <span>
            Scroll to drop out of orbit
            <span className="mt-1.5 block text-bone/35">{REALMS.length} worlds below</span>
          </span>
        </SectionLink>
        <p className="flex items-center gap-3 normal-case">
          <span className="font-sans text-[13px] tracking-normal text-bone/60">Right now I&apos;m a</span>
          <span className="font-sans text-[13px] tracking-normal">
            <Roles roles={profile.roles} />
          </span>
        </p>
        <p className="text-right">
          {profile.location}
          <span className="mt-1.5 block text-bone/35">
            <Clock timezone={profile.timezone} />
          </span>
        </p>
      </div>
    </section>
  );
}
