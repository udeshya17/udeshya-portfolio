"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { ProcessStep, Service, Testimonial } from "@/lib/content/types";
import { FadeIn, Reveal } from "../ui/primitives";

/* -------------------------------- services -------------------------------- */

export function Services({ services }: { services: Service[] }) {
  if (!services.length) return null;
  return (
    <section id="services" className="veil relative isolate z-10 px-5 pt-28 pb-44 md:px-10 md:pt-40 md:pb-60">
      <div className="mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="mb-6 font-mono text-[11px] tracking-[0.28em] text-fog uppercase">
            <span className="text-accent">✦</span> What I do for you
          </p>
          <Reveal as="h2" type="words" className="h-section">
            Services that <span className="font-serif font-normal text-accent italic">ship.</span>
          </Reveal>
          <Reveal as="p" className="mt-6 max-w-md text-lg text-fog">
            Bring me a problem in any universe. I&apos;ll design it, build it and get it into production.
          </Reveal>
          <FadeIn className="mt-8">
            <Link href="/contact" className="group inline-flex items-center gap-3 rounded-full bg-accent py-2 pr-2 pl-6 font-semibold text-black">
              Start a project
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-accent transition-transform duration-500 group-hover:-rotate-45">→</span>
            </Link>
          </FadeIn>
        </div>
        <ol className="border-t border-line">
          {services.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.05} y={40}>
              <li className="group relative border-b border-line py-9 md:py-11">
                <span className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-accent/12 to-transparent transition-[width] duration-700 ease-out-expo group-hover:w-full" />
                <div className="relative grid grid-cols-[3rem_1fr_auto] items-start gap-x-4">
                  <span className="pt-2 font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-display text-3xl font-bold tracking-tight transition-transform duration-700 ease-out-expo group-hover:translate-x-3 md:text-[2.75rem] md:leading-tight">
                      {s.title}
                    </h3>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-fog">{s.blurb}</p>
                    <p className="mt-4 font-mono text-[11px] tracking-[0.12em] text-bone/60">{s.deliverables.join("  /  ")}</p>
                  </div>
                  <span className="pt-2 text-2xl text-fog transition-all duration-500 group-hover:-rotate-45 group-hover:text-accent">→</span>
                </div>
              </li>
            </FadeIn>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --------------------------------- process -------------------------------- */

export function Process({ steps }: { steps: ProcessStep[] }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".process-line",
        { scaleX: 0 },
        { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".process-grid", start: "top 75%", end: "bottom 55%", scrub: true } },
      );
      gsap.utils.toArray<HTMLElement>(".process-step").forEach((s, i) => {
        gsap.fromTo(
          s,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, delay: i * 0.08, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 88%", once: true } },
        );
      });
    }, el);
    return () => ctx.revert();
  }, [steps]);
  if (!steps.length) return null;
  return (
    <section ref={root} id="process" className="relative isolate z-10 px-5 pt-28 pb-44 md:px-10 md:pt-36 md:pb-60">
      <div className="mx-auto max-w-[1500px]">
        <p className="mb-6 font-mono text-[11px] tracking-[0.28em] text-fog uppercase">
          <span className="text-accent">✦</span> How we&apos;ll work
        </p>
        <Reveal as="h2" type="words" className="h-section max-w-4xl">
          From first call to <span className="font-serif font-normal text-accent italic">first users.</span>
        </Reveal>
        <div className="process-grid relative mt-20">
          <div className="absolute top-[22px] right-0 left-0 hidden h-px bg-line lg:block" />
          <div className="process-line absolute top-[22px] right-0 left-0 hidden h-px origin-left bg-gradient-to-r from-accent via-accent-2 to-accent lg:block" />
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {steps.map((s, i) => (
              <li key={s.title} className="process-step relative">
                <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-accent/40 bg-void font-mono text-sm text-accent shadow-[0_0_30px_color-mix(in_srgb,var(--accent)_35%,transparent)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-6 font-mono text-[10px] tracking-[0.25em] text-fog uppercase">{s.duration}</p>
                <h3 className="mt-2 font-display text-2xl font-bold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fog">{s.blurb}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ testimonials ------------------------------ */

export function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  return (
    <section id="testimonials" className="relative z-10 py-28 md:py-36">
      <div className="mx-auto max-w-[1500px] px-5 md:px-10">
        <p className="mb-6 font-mono text-[11px] tracking-[0.28em] text-fog uppercase">
          <span className="text-accent">✦</span> Kind words
        </p>
        <Reveal as="h2" type="words" className="h-section max-w-4xl">
          People I&apos;ve <span className="font-serif font-normal text-accent italic">built with.</span>
        </Reveal>
      </div>
      <div className="mask-fade-x mt-14 overflow-hidden">
        <div className="marquee-track flex w-max gap-5 [animation-duration:60s]">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 gap-5" aria-hidden={k === 1}>
              {items.map((t, i) => (
                <figure key={`${t.name}-${i}`} className="glass flex w-[min(80vw,440px)] shrink-0 flex-col justify-between rounded-[2rem] p-7">
                  <blockquote className="font-serif text-xl leading-snug italic">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    {t.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-bold text-black">{t.name[0]}</span>
                    )}
                    <span>
                      <span className="block font-semibold">{t.name}</span>
                      <span className="block text-sm text-fog">
                        {t.role}
                        {t.company && ` · ${t.company}`}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
