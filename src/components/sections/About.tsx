"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Education, Experience, Profile, Stat } from "@/lib/content/types";
import { Clock, Logo } from "../nav/Navbar";
import { SocialLinks } from "../ui/SocialIcon";
import { Counter, FadeIn, Kicker } from "../ui/primitives";
import Orrery from "../world/Orrery";
import { REALMS } from "../world/realms";
import { scrollToId } from "../scroll/scrollState";

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

const label = "font-mono text-[10px] tracking-[0.3em] text-fog uppercase";

/** The traveller's papers: who is making this journey with you. Tilts and catches the light under the cursor. */
function Pass({ profile }: { profile: Profile }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", `${(x * 7).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
      el.style.setProperty("--hx", `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--hy", `${((y + 0.5) * 100).toFixed(1)}%`);
    };
    const leave = () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  const [first, ...rest] = profile.name.trim().split(/\s+/);
  const last = rest.join(" ");
  // the machine-readable line at the foot of a passport, just for the texture of it
  const mrz = `P<${profile.location.slice(0, 3)}<${(last || first).replace(/\s+/g, "<")}<<${first}${"<".repeat(28)}`.toUpperCase();

  return (
    <div ref={ref} className="pass tile flex h-full flex-col justify-between p-7 md:p-9">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <p className={`${label} leading-relaxed`}>
            Multiverse
            <br />
            travel pass
          </p>
        </div>
        <p className="rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-accent uppercase">All {REALMS.length} worlds</p>
      </div>

      <div className="mt-12">
        <p className={label}>Traveller</p>
        <p className="mt-3 font-display text-[clamp(2.3rem,4vw,3.7rem)] leading-[0.95] font-extrabold tracking-tight">
          {first}
          {last && (
            <>
              <br />
              <span className="text-bone/55">{last}</span>
            </>
          )}
        </p>
        <p className="mt-4 font-serif text-2xl text-accent italic">{profile.title}</p>
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/10 pt-6 sm:grid-cols-3">
        <div>
          <dt className={label}>Base</dt>
          <dd className="mt-2 text-[15px]">{profile.location}</dd>
        </div>
        <div>
          <dt className={label}>Local time</dt>
          <dd className="mt-2 text-[15px]">
            <Clock timezone={profile.timezone} />
          </dd>
        </div>
        <div>
          <dt className={label}>Status</dt>
          <dd className="mt-2 flex items-center gap-2 text-[15px]">
            <span className={`h-2 w-2 rounded-full ${profile.available ? "animate-pulse-dot bg-accent" : "bg-fog"}`} />
            {profile.available ? "Available" : "Booked"}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex items-end justify-between gap-4">
        <SocialLinks socials={profile.socials} size="sm" />
        <span aria-hidden className="pass-bars block h-9 w-28 text-bone/45" />
      </div>
      <p aria-hidden className="mt-5 overflow-hidden font-mono text-[10px] tracking-[0.34em] whitespace-nowrap text-bone/30">
        {mrz}
      </p>
    </div>
  );
}

export default function About({
  profile,
  stats,
  education,
  current,
}: {
  profile: Profile;
  stats: Stat[];
  education: Education[];
  current?: Experience;
}) {
  const grid = useRef<HTMLDivElement>(null);

  // one light under the cursor, shared by every tile
  useEffect(() => {
    const el = grid.current;
    if (!el || !window.matchMedia("(hover: hover)").matches) return;
    const tiles = Array.from(el.querySelectorAll<HTMLElement>(".tile"));
    const move = (e: PointerEvent) => {
      for (const t of tiles) {
        const r = t.getBoundingClientRect();
        t.style.setProperty("--x", `${(e.clientX - r.left).toFixed(0)}px`);
        t.style.setProperty("--y", `${(e.clientY - r.top).toFixed(0)}px`);
      }
    };
    el.addEventListener("pointermove", move, { passive: true });
    return () => el.removeEventListener("pointermove", move);
  }, []);

  return (
    <section id="about" className="relative isolate z-10 px-5 pt-28 pb-44 md:px-10 md:pt-40 md:pb-60">
      <div className="mx-auto max-w-[1500px]">
        <div className="max-w-[66rem]">
          <Kicker className="mb-10">Origin</Kicker>
          <Manifesto text={profile.manifesto} />
        </div>

        <div ref={grid} className="bento mt-20 grid gap-4 md:mt-28 lg:grid-cols-12">
          {/* the route ahead: every world you'll pass through on the way down */}
          <FadeIn className="lg:col-span-12">
            <div className="tile grid items-center gap-8 p-6 md:p-9 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
              <div className="relative mx-auto aspect-square w-full max-w-[560px]">
                <Orrery />
              </div>
              <div>
                <p className={label}>Flight plan</p>
                <h3 className="mt-4 font-display text-[clamp(1.9rem,3.2vw,3rem)] leading-[1.02] font-bold tracking-tight">
                  Five worlds, <span className="font-serif font-normal text-accent italic">one way down.</span>
                </h3>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-fog">
                  Keep scrolling and you&apos;ll fall out of orbit into the ocean, surface in a forest, climb into the sky and end up under the northern lights. Each world holds a part of my work.
                </p>
                <ol className="mt-8 border-t border-white/10">
                  {REALMS.map((r, i) => (
                    <li key={r.id} className="border-b border-white/10">
                      <button
                        type="button"
                        onClick={() => scrollToId(r.id)}
                        className="group grid w-full grid-cols-[2rem_auto_1fr_auto] items-center gap-4 py-3.5 text-left"
                        data-cursor={i ? "Go" : "Top"}
                      >
                        <span className="font-mono text-[11px] text-fog">0{i + 1}</span>
                        <span
                          className="h-3 w-3 rounded-full transition-transform duration-500 group-hover:scale-150"
                          style={{ background: `radial-gradient(circle at 35% 30%, ${r.swatch[0]}, ${r.swatch[1]} 55%, ${r.swatch[2]})`, boxShadow: `0 0 12px ${r.ui[0]}88` }}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium transition-colors group-hover:text-accent">{r.name}</span>
                          <span className="block truncate text-[12.5px] text-fog">{i ? r.nav : "You are here"}</span>
                        </span>
                        <span className="text-fog transition-all duration-500 group-hover:translate-x-1 group-hover:text-accent">→</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </FadeIn>

          <FadeIn className="lg:col-span-5 lg:row-span-2">
            <Pass profile={profile} />
          </FadeIn>

          <FadeIn delay={0.05} className="lg:col-span-7">
            <div className="tile h-full p-7 md:p-9">
              <p className="font-serif text-2xl text-accent italic">In short</p>
              <p className="mt-5 text-xl leading-relaxed text-bone/90 md:text-[1.45rem] md:leading-snug">{profile.summary}</p>
            </div>
          </FadeIn>

          <FadeIn delay={0.1} className="lg:col-span-7">
            <div className="tile grid h-full grid-cols-2 sm:grid-cols-4">
              {stats.map((s, i) => (
                <div key={i} className={`border-white/10 p-6 md:p-7 ${i % 2 ? "border-l" : ""} ${i >= 2 ? "border-t sm:border-t-0" : ""} ${i ? "sm:border-l" : ""}`}>
                  <Counter value={s.value} suffix={s.suffix} className="block font-display text-[clamp(2.4rem,4.2vw,4rem)] leading-none font-extrabold tracking-tighter text-bone" />
                  <p className="mt-3 text-[13px] leading-snug text-fog">{s.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          {profile.nowBuilding && (
            <FadeIn delay={0.05} className="lg:col-span-5">
              <div className="tile h-full p-7 md:p-8">
                <p className={`${label} flex items-center gap-2.5`}>
                  <span className="h-2 w-2 animate-pulse-dot rounded-full bg-accent" />
                  Now building
                </p>
                <p className="mt-5 font-display text-xl leading-snug font-bold md:text-2xl">{profile.nowBuilding}</p>
                {current && (
                  <p className="mt-4 text-sm text-fog">
                    {current.role} at <span className="text-bone">{current.company}</span>, since {current.start}
                  </p>
                )}
              </div>
            </FadeIn>
          )}

          {education.map((e, i) => (
            <FadeIn key={i} delay={0.1} className="lg:col-span-4">
              <div className="tile h-full p-7 md:p-8">
                <p className={label}>Education</p>
                <p className="mt-5 font-display text-2xl leading-tight font-bold">
                  {e.degree}, <span className="font-serif font-normal italic">{e.field}</span>
                </p>
                <p className="mt-2 text-fog">{e.school}</p>
                <p className="mt-4 text-sm text-fog">
                  {e.start} — {e.end} <span className="mx-2 text-white/15">|</span> <span className="text-bone">{e.score}</span>
                </p>
              </div>
            </FadeIn>
          ))}

          <FadeIn delay={0.15} className="lg:col-span-3">
            <div className="tile flex h-full flex-col justify-between gap-8 p-7 md:p-8">
              <div>
                <p className={label}>Open to</p>
                <p className="mt-5 font-serif text-2xl leading-tight italic">{profile.availabilityText}</p>
              </div>
              <Link href="/contact" className="group inline-flex items-center gap-2 text-[15px] font-medium text-bone">
                <span className="bg-gradient-to-r from-accent to-accent bg-[length:100%_1px] bg-left-bottom bg-no-repeat pb-1">Say hello</span>
                <span className="text-accent transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
