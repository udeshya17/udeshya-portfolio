"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Profile, Project } from "@/lib/content/types";
import SiteFooter from "../SiteFooter";
import SectionLink from "../ui/SectionLink";
import { UniverseLock } from "../SiteChrome";
import { BrowserFrame, GenerativeCover, previewSrc } from "../ui/ProjectVisual";
import { FadeIn, Reveal } from "../ui/primitives";

gsap.registerPlugin(ScrollTrigger);

function Showcase({ p }: { p: Project }) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const hasShot = Boolean(previewSrc(p));

  useEffect(() => {
    const el = root.current;
    if (!el || !hasShot) return;
    const ctx = gsap.context(() => {
      // pin the browser window and scroll the website inside it as you scroll the page
      ScrollTrigger.create({
        trigger: el,
        start: "top 12%",
        end: "+=160%",
        pin: true,
        scrub: true,
        onUpdate: (self) => frame.current?.style.setProperty("--p", self.progress.toFixed(4)),
      });
      gsap.fromTo(el, { scale: 0.86, rotateX: 14, opacity: 0.4 }, { scale: 1, rotateX: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top 15%", scrub: true } });
    }, el);
    return () => ctx.revert();
  }, [hasShot]);

  return (
    <div className="[perspective:1600px]">
      <div ref={root} className="relative mx-auto h-[76vh] w-full max-w-[1400px] rounded-[1.6rem] p-2 shadow-[0_40px_120px_-30px_var(--accent)]" style={{ background: `linear-gradient(140deg, ${p.accent}66, transparent 40%, ${p.accent}33)` }}>
        {hasShot ? <BrowserFrame ref={frame} p={p} /> : <div className="h-full overflow-hidden rounded-[1.25rem]"><GenerativeCover p={p} /></div>}
        {hasShot && (
          <span className="absolute right-6 bottom-6 rounded-full bg-black/70 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-accent uppercase backdrop-blur">
            Keep scrolling · the site scrolls too
          </span>
        )}
      </div>
    </div>
  );
}

function Block({ label, title, text }: { label: string; title: string; text: string }) {
  if (!text) return null;
  return (
    <div className="grid gap-6 border-t border-line py-14 md:grid-cols-[0.4fr_1fr]">
      <p className="font-mono text-[11px] tracking-[0.28em] text-accent uppercase">{label}</p>
      <div>
        <Reveal as="h3" type="words" className="font-display text-3xl font-bold tracking-tight md:text-5xl">
          {title}
        </Reveal>
        <Reveal as="p" className="mt-5 max-w-3xl text-lg leading-relaxed text-bone/80">
          {text}
        </Reveal>
      </div>
    </div>
  );
}

export default function ProjectDetail({ p, next, index, total, profile }: { p: Project; next: Project; index: number; total: number; profile: Profile }) {
  const meta = [
    { k: "Role", v: p.role },
    { k: "Client", v: p.client },
    { k: "Timeline", v: p.duration || p.year },
    { k: "Category", v: p.category },
  ].filter((m) => m.v);

  return (
    <main className="relative z-10 px-5 pt-28 md:px-10 md:pt-36">
      <UniverseLock index={5} />
      <div className="mx-auto max-w-[1500px]">
        <SectionLink id="projects" className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-fog uppercase hover:text-accent">
          <span className="transition-transform group-hover:-translate-x-1">←</span> All work
          <span className="ml-3 text-fog/60">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </SectionLink>

        <div className="mt-10 grid items-end gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="mb-4 flex items-center gap-3 font-mono text-[11px] tracking-[0.28em] text-fog uppercase">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.accent, boxShadow: `0 0 16px ${p.accent}` }} />
              {p.category} · {p.year}
            </p>
            <Reveal as="h1" type="chars" className="font-display text-[clamp(2.4rem,10vw,7.5rem)] leading-[0.9] font-extrabold tracking-[-0.04em] [hyphens:none]">
              {p.name}
            </Reveal>
            <Reveal as="p" className="mt-4 font-serif text-2xl text-accent italic md:text-4xl" delay={0.2}>
              {p.tagline}
            </Reveal>
          </div>
          <FadeIn delay={0.3} className="space-y-6">
            <p className="text-lg leading-relaxed text-fog">{p.description}</p>
            <div className="flex flex-wrap gap-3">
              {p.url && (
                <a href={p.url} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-3 rounded-full bg-accent py-2 pr-2 pl-6 font-semibold text-black">
                  Visit live site
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-accent transition-transform duration-500 group-hover:-rotate-45">→</span>
                </a>
              )}
              {p.repo && (
                <a href={p.repo} target="_blank" rel="noreferrer" className="glass inline-flex items-center rounded-full px-6 py-3 font-semibold hover:border-accent hover:text-accent">
                  Source code ↗
                </a>
              )}
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.2} className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-4">
          {meta.map((m) => (
            <div key={m.k} className="bg-void/85 p-5 backdrop-blur md:p-6">
              <p className="font-mono text-[10px] tracking-[0.25em] text-fog uppercase">{m.k}</p>
              <p className="mt-2 font-medium">{m.v}</p>
            </div>
          ))}
        </FadeIn>

        <div className="mt-20">
          <Showcase p={p} />
        </div>

        <div className="mt-24">
          <Block label="Overview" title="The universe" text={p.overview} />
          <Block label="Challenge" title="The problem" text={p.challenge} />
          <Block label="Solution" title="What I built" text={p.solution} />
        </div>

        {p.features.length > 0 && (
          <section className="border-t border-line py-14">
            <p className="mb-8 font-mono text-[11px] tracking-[0.28em] text-accent uppercase">Key features</p>
            <div className="grid gap-4 md:grid-cols-2">
              {p.features.map((f, i) => (
                <FadeIn key={f} delay={(i % 2) * 0.08}>
                  <div className="glass flex h-full items-start gap-5 rounded-2xl p-6">
                    <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-lg leading-snug">{f}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>
        )}

        {p.results.length > 0 && (
          <section className="border-t border-line py-14">
            <p className="mb-8 font-mono text-[11px] tracking-[0.28em] text-accent uppercase">Impact</p>
            <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {p.results.map((r) => (
                <FadeIn key={r.label} className="bg-void/85 p-8 backdrop-blur">
                  <p className="text-gradient font-display text-6xl font-extrabold tracking-tight md:text-7xl">{r.value}</p>
                  <p className="mt-3 text-fog">{r.label}</p>
                </FadeIn>
              ))}
            </div>
          </section>
        )}

        <section className="border-t border-line py-14">
          <p className="mb-8 font-mono text-[11px] tracking-[0.28em] text-accent uppercase">Built with</p>
          <div className="flex flex-wrap gap-3">
            {p.stack.map((s) => (
              <span key={s} className="glass rounded-full px-5 py-2.5 text-lg">
                {s}
              </span>
            ))}
          </div>
        </section>

        {p.gallery.length > 0 && (
          <section className="border-t border-line py-14">
            <p className="mb-8 font-mono text-[11px] tracking-[0.28em] text-accent uppercase">Gallery</p>
            <div className="grid gap-4 md:grid-cols-2">
              {p.gallery.map((g) => (
                <FadeIn key={g}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g} alt={`${p.name} screenshot`} className="w-full rounded-2xl border border-line" loading="lazy" />
                </FadeIn>
              ))}
            </div>
          </section>
        )}

        {next.slug !== p.slug && (
          <Link href={`/projects/${next.slug}`} className="group relative mt-10 block overflow-hidden rounded-[2rem] border border-line p-8 md:p-14" data-cursor="Next">
            <div className="absolute inset-0 opacity-30 transition-opacity duration-700 group-hover:opacity-60" style={{ background: `radial-gradient(circle at 80% 50%, ${next.accent}, transparent 55%)` }} />
            <p className="relative font-mono text-[11px] tracking-[0.28em] text-fog uppercase">Next project →</p>
            <p className="relative mt-4 font-display text-5xl font-extrabold tracking-tight transition-transform duration-700 ease-out-expo group-hover:translate-x-4 md:text-8xl">{next.name}</p>
            <p className="relative mt-2 font-serif text-xl text-bone/80 italic">{next.tagline}</p>
          </Link>
        )}

        <section className="mt-10 flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-accent p-8 text-black md:flex-row md:items-center md:p-12">
          <p className="max-w-xl font-display text-3xl leading-tight font-bold md:text-5xl">Have something similar in mind?</p>
          <Link href="/contact" className="group inline-flex items-center gap-3 rounded-full bg-black py-2 pr-2 pl-7 text-lg font-semibold text-bone">
            Let&apos;s talk
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-black transition-transform duration-500 group-hover:-rotate-45">→</span>
          </Link>
        </section>
        <SiteFooter profile={profile} />
      </div>
    </main>
  );
}
