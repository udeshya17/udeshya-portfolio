"use client";

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Profile, SkillGroup, Stat } from "@/lib/content/types";
import { LOADER_DONE_EVENT, scrollState, scrollToId } from "../scroll/scrollState";
import SectionLink from "../ui/SectionLink";
import { Counter, Magnetic } from "../ui/primitives";

gsap.registerPlugin(SplitText);

function RoleCycler({ roles }: { roles: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (roles.length < 2) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % roles.length), 2600);
    return () => window.clearInterval(id);
  }, [roles.length]);
  const role = roles[i] ?? "";
  return (
    <span className="relative inline-flex h-[1.25em] overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={role}
          initial={{ y: "100%", rotateX: -80, opacity: 0 }}
          animate={{ y: "0%", rotateX: 0, opacity: 1 }}
          exit={{ y: "-100%", rotateX: 80, opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block font-serif text-accent italic"
        >
          {role}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function OrbitBadge() {
  const text = "SCROLL TO EXPLORE · NINE UNIVERSES AHEAD · ";
  return (
    <button onClick={() => scrollToId("about")} className="group relative h-28 w-28 md:h-32 md:w-32" aria-label="Scroll to explore" data-cursor="Dive">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full animate-spin-slow">
        <defs>
          <path id="orbit-path" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" />
        </defs>
        <text className="fill-bone/80 font-mono text-[8.4px] tracking-[0.18em]">
          <textPath href="#orbit-path">{text}</textPath>
        </text>
      </svg>
      <span className="absolute inset-[30%] flex items-center justify-center rounded-full bg-accent text-black shadow-[0_0_40px_var(--accent)] transition-transform duration-500 group-hover:scale-110">
        <svg viewBox="0 0 16 16" className="h-5 w-5 animate-bounce" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 2v11m0 0 4-4m-4 4L4 9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

/** Slow-drifting colour blobs that follow the active universe accent. */
function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden mix-blend-screen">
      <div className="aurora-blob absolute -top-[20%] left-[5%] h-[60vh] w-[60vh] rounded-full bg-accent opacity-[0.16] blur-[120px]" />
      <div className="aurora-blob absolute top-[30%] right-[-10%] h-[70vh] w-[70vh] rounded-full bg-accent-2 opacity-[0.14] blur-[140px] [animation-delay:-6s]" />
      <div className="aurora-blob absolute bottom-[-25%] left-[30%] h-[55vh] w-[55vh] rounded-full bg-[#ff5c8a] opacity-[0.1] blur-[130px] [animation-delay:-12s]" />
    </div>
  );
}

function TechMarquee({ items }: { items: string[] }) {
  return (
    <div className="mask-fade-x relative overflow-hidden border-y border-line py-3">
      <div className="marquee-track flex w-max gap-10 font-mono text-[11px] tracking-[0.25em] text-fog uppercase">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 gap-10" aria-hidden={k === 1}>
            {items.map((t, i) => (
              <span key={`${t}-${i}`} className="flex items-center gap-10 whitespace-nowrap">
                {t}
                <span className="h-1 w-1 rotate-45 bg-accent" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Hero({ profile, stats, skills }: { profile: Profile; stats: Stat[]; skills: SkillGroup[] }) {
  const root = useRef<HTMLElement>(null);
  const [last = "", ...firstParts] = profile.name.split(" ").reverse();
  const first = firstParts.reverse().join(" ") || profile.firstName;
  const tech = skills.filter((g) => g.name !== "Human").flatMap((g) => g.items).slice(0, 28);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const split = SplitText.create(".hero-name", { type: "chars", mask: "chars", charsClass: "hero-char" });
      gsap.set(split.chars, { yPercent: 120 });
      gsap.set(".hero-fade", { opacity: 0, y: 30 });

      const play = () => {
        const tl = gsap.timeline({ delay: 0.35 });
        tl.to(split.chars, { yPercent: 0, duration: 1.4, stagger: 0.045, ease: "expo.out", clearProps: "transform" }).to(
          ".hero-fade",
          { opacity: 1, y: 0, duration: 1.2, stagger: 0.09, ease: "expo.out" },
          "-=1.0",
        );
      };
      if (scrollState.introDone) play();
      else window.addEventListener(LOADER_DONE_EVENT, play, { once: true });

      gsap.to(".hero-name-wrap", {
        yPercent: -35,
        opacity: 0,
        filter: "blur(10px)",
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(".hero-bottom", {
        y: -80,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "20% top", end: "70% top", scrub: true },
      });
    }, el);

    // letters light up and lift as the cursor passes over them
    const onOver = (e: PointerEvent) => {
      const c = (e.target as HTMLElement).closest(".hero-char");
      if (!c) return;
      c.classList.add("lit");
      window.setTimeout(() => c.classList.remove("lit"), 650);
    };
    el.addEventListener("pointerover", onOver);
    return () => {
      el.removeEventListener("pointerover", onOver);
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={root}
      id="home"
      data-universe
      className="relative z-10 isolate flex min-h-[100svh] flex-col justify-between overflow-hidden px-5 pt-28 pb-24 md:px-10 md:pt-32 md:pb-6"
    >
      <Aurora />
      {/* editorial masthead: three columns of plain type over a hairline, no boxes */}
      <div className="hero-fade grid grid-cols-2 gap-x-6 gap-y-2 border-b border-line pb-4 text-[13px] leading-snug md:grid-cols-[1fr_1fr_1fr_auto]">
        <p className="text-bone">
          {profile.name}
          <span className="text-fog"> — {profile.title}</span>
        </p>
        <p className="hidden text-fog md:block">Full-stack · Blockchain · AI systems</p>
        <p className="text-right text-fog md:text-left">
          {profile.location}, working worldwide
        </p>
        <p className="col-span-2 flex items-center gap-2 text-bone md:col-span-1 md:justify-end">
          <span className="text-accent" aria-hidden>
            ✳
          </span>
          {profile.available ? profile.availabilityText : "Currently booked"}
        </p>
      </div>

      <div className="hero-name-wrap relative -mx-1 my-10 select-none md:my-0">
        <h1 aria-label={profile.name} className="leading-[0.82]">
          <span className="hero-name block font-display text-[11.4vw] font-extrabold tracking-[-0.05em] whitespace-nowrap uppercase md:text-[11.2vw]">
            {first}
          </span>
          <span className="block pl-[14vw] md:pl-[30vw]">
            <span className="hero-name text-gradient inline-block pr-[0.08em] font-serif text-[16vw] tracking-[-0.03em] whitespace-nowrap italic md:text-[11vw]">
              {last}.
            </span>
          </span>
        </h1>
        {profile.nowBuilding && (
          <p className="hero-fade pointer-events-auto absolute bottom-[4%] left-1 hidden max-w-[15rem] text-[13px] leading-relaxed text-fog select-text lg:block xl:max-w-[17rem]">
            <span className="mb-2 block h-px w-10 bg-accent" />
            <span className="font-serif text-[17px] text-bone italic">Now — </span>
            <span className="text-bone/85">{profile.nowBuilding.charAt(0).toLowerCase() + profile.nowBuilding.slice(1).replace(/\.?$/, ".")}</span>
          </p>
        )}
      </div>

      <div className="hero-bottom space-y-6">
        <div className="grid grid-cols-1 items-end gap-8 md:grid-cols-[1.2fr_1fr_auto]">
          <div className="hero-fade max-w-xl">
            <p className="text-2xl leading-tight font-medium md:text-[2rem]">
              I&apos;m a <RoleCycler roles={profile.roles} />
            </p>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-fog">{profile.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {stats.slice(0, 3).map((s) => (
                <div key={s.label}>
                  <Counter value={s.value} suffix={s.suffix} className="font-display text-3xl font-extrabold text-bone" />
                  <p className="max-w-[9rem] text-[11px] leading-tight text-fog">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-fade flex flex-wrap gap-3">
            <Magnetic>
              <SectionLink id="projects" className="group relative block overflow-hidden rounded-full bg-bone px-6 py-3.5 text-sm font-semibold text-black">
                <span className="relative z-10">See my work →</span>
                <span className="absolute inset-0 translate-y-full rounded-full bg-accent transition-transform duration-500 ease-out-expo group-hover:translate-y-0" />
              </SectionLink>
            </Magnetic>
            <Magnetic>
              <Link href="/contact" className="glass flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold hover:border-accent hover:text-accent">
                Hire me
              </Link>
            </Magnetic>
            <Magnetic>
              <a href="/api/resume" className="flex items-center gap-2 rounded-full px-4 py-3.5 text-sm font-semibold text-fog hover:text-accent">
                Résumé ↓
              </a>
            </Magnetic>
          </div>
          <div className="hero-fade hidden justify-self-end md:block">
            <OrbitBadge />
          </div>
        </div>
        <div className="hero-fade">
          <TechMarquee items={tech} />
        </div>
      </div>
    </section>
  );
}
