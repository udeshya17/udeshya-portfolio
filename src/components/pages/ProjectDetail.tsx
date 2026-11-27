"use client";

import Link from "next/link";
import type { Profile, Project } from "@/lib/content/types";
import SiteFooter from "../SiteFooter";
import { RealmLock } from "../world/Stage";
import { BrowserFrame, GenerativeCover, previewSrc } from "../ui/ProjectVisual";
import SectionLink from "../ui/SectionLink";
import { FadeIn, Reveal } from "../ui/primitives";

function Story({ n, label, text }: { n: number; label: string; text: string }) {
  if (!text) return null;
  return (
    <FadeIn className="grid gap-4 border-t border-line py-12 md:grid-cols-[9rem_1fr] md:gap-10 md:py-14">
      <p className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-fog">{String(n).padStart(2, "0")}</span>
        <span className="font-serif text-2xl text-accent italic">{label}</span>
      </p>
      <p className="max-w-3xl text-xl leading-relaxed text-bone/90 md:text-[1.6rem] md:leading-[1.45]">{text}</p>
    </FadeIn>
  );
}

export default function ProjectDetail({ p, next, index, total, profile }: { p: Project; next: Project; index: number; total: number; profile: Profile }) {
  const hasShot = Boolean(previewSrc(p));
  const meta = [
    { k: "Role", v: p.role },
    { k: "Client", v: p.client },
    { k: "Timeline", v: p.duration || p.year },
    { k: "Category", v: p.category },
  ].filter((m) => m.v);
  const host = (() => {
    try {
      return p.url ? new URL(p.url).host.replace(/^www\./, "") : "";
    } catch {
      return "";
    }
  })();

  return (
    <main className="relative isolate z-10">
      <RealmLock realm="sky" />
      {/* the 3D scene recedes once you start reading */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_0,rgb(4_4_10/0.55)_45vh,rgb(4_4_10/0.9)_95vh,rgb(4_4_10/0.94)_100%)]" />

      <div className="mx-auto max-w-[1400px] px-5 pt-32 md:px-10 md:pt-40">
        <div className="flex items-center justify-between gap-4 text-sm">
          <SectionLink id="projects" className="group inline-flex items-center gap-2 text-fog transition-colors hover:text-bone">
            <span className="transition-transform group-hover:-translate-x-1">←</span> Selected work
          </SectionLink>
          <span className="font-mono text-xs text-fog">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        {/* title block */}
        <header className="mt-14 grid items-end gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <div>
            <p className="mb-5 flex items-center gap-3 text-sm text-fog">
              <span className="h-2 w-2 rounded-full" style={{ background: p.accent, boxShadow: `0 0 14px ${p.accent}` }} />
              {p.category} · {p.year}
            </p>
            <Reveal as="h1" type="lines" className="font-display text-[clamp(2.6rem,6vw,5.75rem)] leading-[0.95] font-bold tracking-[-0.035em]">
              {p.name}
            </Reveal>
            <Reveal as="p" className="mt-5 font-serif text-2xl text-accent italic md:text-3xl" delay={0.15}>
              {p.tagline}
            </Reveal>
          </div>
          <FadeIn delay={0.2} className="space-y-7">
            <p className="text-lg leading-relaxed text-bone/80">{p.description}</p>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {p.url && (
                <a href={p.url} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-3 rounded-full bg-bone py-2 pr-2 pl-6 font-semibold text-black">
                  Visit {host || "live site"}
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-bone transition-transform duration-500 group-hover:-rotate-45">→</span>
                </a>
              )}
              {p.repo && (
                <a href={p.repo} target="_blank" rel="noreferrer" className="text-[15px] font-medium text-bone underline decoration-white/25 underline-offset-[6px] hover:decoration-bone">
                  Source code ↗
                </a>
              )}
            </div>
          </FadeIn>
        </header>

        {/* showcase */}
        <FadeIn y={60} className="mt-16 md:mt-20">
          <figure
            className="relative overflow-hidden rounded-[1.6rem] p-[6px] shadow-[0_50px_140px_-40px_var(--accent)]"
            style={{ background: `linear-gradient(140deg, ${p.accent}88, rgb(255 255 255 / 0.06) 35%, ${p.accent}40)` }}
          >
            <div className="aspect-[16/10] max-h-[82vh] w-full">
              {hasShot ? (
                <BrowserFrame p={p} auto />
              ) : (
                <div className="h-full overflow-hidden rounded-[1.25rem]">
                  <GenerativeCover p={p} index={index} />
                </div>
              )}
            </div>
          </figure>
          {hasShot && <figcaption className="mt-4 text-center text-sm text-fog">Live preview of {host}: it tours the real site. Hover to pause.</figcaption>}
        </FadeIn>

        {/* body: sticky facts + story */}
        <div className="mt-20 grid gap-12 lg:mt-28 lg:grid-cols-[16rem_1fr] lg:gap-20">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <dl className="divide-y divide-line border-y border-line">
              {meta.map((m) => (
                <div key={m.k} className="py-4">
                  <dt className="text-xs text-fog">{m.k}</dt>
                  <dd className="mt-1 text-[15px] text-bone">{m.v}</dd>
                </div>
              ))}
              <div className="py-4">
                <dt className="text-xs text-fog">Stack</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {p.stack.map((s) => (
                    <span key={s} className="rounded-full border border-line px-2.5 py-1 text-xs text-bone/85">
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </aside>

          <article>
            <Story n={1} label="Overview" text={p.overview} />
            <Story n={2} label="Challenge" text={p.challenge} />
            <Story n={3} label="Solution" text={p.solution} />

            {p.features.length > 0 && (
              <FadeIn className="border-t border-line py-12 md:py-14">
                <p className="mb-8 font-serif text-2xl text-accent italic">What I built</p>
                <ol className="grid gap-x-10 md:grid-cols-2">
                  {p.features.map((f, i) => (
                    <li key={f} className="flex gap-5 border-b border-line py-5">
                      <span className="pt-1 font-mono text-xs text-fog">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-lg leading-snug text-bone/90">{f}</span>
                    </li>
                  ))}
                </ol>
              </FadeIn>
            )}

            {p.results.length > 0 && (
              <FadeIn className="border-t border-line py-12 md:py-14">
                <p className="mb-8 font-serif text-2xl text-accent italic">Impact</p>
                <div className="grid gap-10 sm:grid-cols-3">
                  {p.results.map((r) => (
                    <div key={r.label}>
                      <p className="font-display text-5xl font-bold tracking-tight md:text-6xl">{r.value}</p>
                      <p className="mt-2 text-fog">{r.label}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>
            )}

            {p.gallery.length > 0 && (
              <FadeIn className="border-t border-line py-12 md:py-14">
                <p className="mb-8 font-serif text-2xl text-accent italic">Gallery</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {p.gallery.map((g) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={g} src={g} alt={`${p.name} screenshot`} className="w-full rounded-2xl border border-line" loading="lazy" />
                  ))}
                </div>
              </FadeIn>
            )}
          </article>
        </div>

        {/* next project */}
        {next.slug !== p.slug && (
          <Link href={`/projects/${next.slug}`} className="group relative mt-16 block overflow-hidden border-y border-line py-14 md:py-20" data-cursor="Next">
            <span
              aria-hidden
              className="absolute inset-0 origin-left scale-x-0 transition-transform duration-1000 ease-out-expo group-hover:scale-x-100"
              style={{ background: `linear-gradient(90deg, ${next.accent}22, transparent 75%)` }}
            />
            <span className="relative flex items-end justify-between gap-6">
              <span>
                <span className="block text-sm text-fog">Next project</span>
                <span className="mt-3 block font-display text-[clamp(2.4rem,7vw,6.5rem)] leading-[0.95] font-bold tracking-[-0.035em] transition-transform duration-700 ease-out-expo group-hover:translate-x-3">
                  {next.name}
                </span>
                <span className="mt-2 block font-serif text-xl text-bone/70 italic">{next.tagline}</span>
              </span>
              <span className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full border border-line text-3xl transition-all duration-500 group-hover:-rotate-45 group-hover:border-transparent group-hover:bg-bone group-hover:text-black md:flex">
                →
              </span>
            </span>
          </Link>
        )}

        <section className="mt-16 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <p className="max-w-2xl font-display text-3xl leading-tight font-bold tracking-tight md:text-5xl">
            Have something <span className="font-serif font-normal text-accent italic">similar</span> in mind?
          </p>
          <Link href="/contact" className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-accent py-2 pr-2 pl-7 text-lg font-semibold whitespace-nowrap text-black">
            Start a project
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-accent transition-transform duration-500 group-hover:-rotate-45">→</span>
          </Link>
        </section>
        <SiteFooter profile={profile} />
      </div>
    </main>
  );
}
