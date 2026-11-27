"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import type { Education, Profile, Stat } from "@/lib/content/types";
import Numeral from "../ui/Numeral";
import { Counter, FadeIn, UniverseTag, VelocityMarquee } from "../ui/primitives";

/** Each word lights up as you scroll, like reading by starlight. */
function Manifesto({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll(".mw"),
        { opacity: 0.12, filter: "blur(3px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          stagger: 0.08,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
        },
      );
    }, el);
    return () => ctx.revert();
  }, [text]);
  const emphasis = /^(universe|universes|worlds|obsession|love|three|AI|India's|first)/i;
  return (
    <p ref={ref} className="font-display text-[1.65rem] leading-[1.18] font-semibold tracking-tight md:text-[2.9rem]">
      {text.split(" ").map((w, i) => (
        <span key={i} className={`mw inline-block pr-[0.25em] ${emphasis.test(w) ? "font-serif font-normal text-accent italic" : ""}`}>
          {w}
        </span>
      ))}
    </p>
  );
}

export default function About({ profile, stats, education }: { profile: Profile; stats: Stat[]; education: Education[] }) {
  return (
    <>
      <section id="about" data-universe className="relative isolate z-10 min-h-screen px-5 py-32 md:px-10 md:py-44">
        <Numeral n={2} side="left" />
        <div className="max-w-[min(100%,62rem)] md:pr-[28vw]">
          <UniverseTag index={2} name="Origin" className="mb-10" />
          <Manifesto text={profile.manifesto} />
        </div>

        {/* numbers set as type: no boxes, just hairlines and scale */}
        <div className="mt-24 grid grid-cols-2 border-t border-line md:mt-32 md:grid-cols-4">
          {stats.map((s, i) => (
            <FadeIn key={i} delay={i * 0.08} className={`py-8 pr-6 ${i % 2 ? "pl-6 md:pl-8" : "md:pl-8"} ${i ? "md:border-l" : "md:pl-0"} border-line ${i % 2 ? "border-l" : ""}`}>
              <Counter value={s.value} suffix={s.suffix} className="block font-display text-6xl font-extrabold tracking-tighter text-bone md:text-8xl" />
              <p className="mt-3 max-w-[12rem] text-sm leading-snug text-fog">{s.label}</p>
            </FadeIn>
          ))}
        </div>

        <div className="mt-20 grid gap-14 border-t border-line pt-12 md:grid-cols-[0.35fr_1fr_0.9fr] md:gap-10">
          <p className="font-serif text-2xl text-accent italic">In short</p>
          <FadeIn>
            <p className="text-xl leading-relaxed text-bone/90 md:text-2xl md:leading-snug">{profile.summary}</p>
          </FadeIn>
          {education.map((e, i) => (
            <FadeIn key={i} delay={0.1} className="space-y-2 md:border-l md:border-line md:pl-10">
              <p className="font-mono text-[10px] tracking-[0.3em] text-fog uppercase">Education</p>
              <p className="font-display text-2xl font-bold">
                {e.degree}, <span className="font-serif font-normal italic">{e.field}</span>
              </p>
              <p className="text-fog">{e.school}</p>
              <p className="pt-2 text-sm text-fog">
                {e.start} — {e.end} <span className="mx-2 text-line">|</span> <span className="text-bone">{e.score}</span>
              </p>
            </FadeIn>
          ))}
        </div>
      </section>

      <div className="relative z-10 border-y border-line bg-void/60 py-6 backdrop-blur-sm md:py-8">
        <VelocityMarquee
          items={["Full-Stack", "Blockchain", "AI Agents", "System Design", "Cloud", "Prompt Engineering", "Next.js", "Python"]}
          className="font-display text-6xl font-extrabold tracking-tight uppercase md:text-[9rem] md:leading-none"
        />
      </div>
    </>
  );
}
