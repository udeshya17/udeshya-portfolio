"use client";

import gsap from "gsap";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Profile } from "@/lib/content/types";
import { LOADER_DONE_EVENT, scrollState, scrollToId, subscribeActive } from "../scroll/scrollState";
import { SocialLinks } from "../ui/SocialIcon";
import { Magnetic, Scramble } from "../ui/primitives";
import { UNIVERSES } from "../universes";

export const useActive = () =>
  useSyncExternalStore(
    subscribeActive,
    () => Math.max(0, scrollState.active),
    () => 0,
  );

/** Jump to a home-page universe from anywhere on the site. */
export function useGoToUniverse() {
  const pathname = usePathname();
  const router = useRouter();
  return (id: string) => {
    if (pathname === "/") scrollToId(id);
    else router.push(`/#${id}`);
  };
}

export const PAGES = [
  { href: "/", label: "Home" },
  { href: "/#projects", label: "Work" },
  { href: "/#about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Logo({ className = "h-8 w-8", spin = false }: { className?: string; spin?: boolean }) {
  const orbit = useRef<SVGGElement>(null);
  useEffect(() => {
    if (!spin) return;
    const tick = () => orbit.current?.setAttribute("transform", `rotate(${-28 + scrollState.progress * 360} 32 32)`);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [spin]);
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="lg-nav" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="0.55" stopColor="var(--accent-2)" />
          <stop offset="1" stopColor="#8b6cff" />
        </linearGradient>
      </defs>
      <g ref={orbit} transform="rotate(-28 32 32)">
        <ellipse cx="32" cy="32" rx="27" ry="9.5" fill="none" stroke="url(#lg-nav)" strokeWidth="1.6" opacity="0.65" />
        <circle cx="58" cy="30" r="3" fill="var(--accent)" />
      </g>
      <path d="M20 16v18a12 12 0 0 0 24 0V16" fill="none" stroke="url(#lg-nav)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function ProgressRing() {
  const circle = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const C = 2 * Math.PI * 9;
    const tick = () => circle.current?.setAttribute("stroke-dashoffset", String(C * (1 - scrollState.progress)));
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  return (
    <svg viewBox="0 0 22 22" className="h-[22px] w-[22px] -rotate-90">
      <circle cx="11" cy="11" r="9" fill="none" stroke="rgb(255 255 255 / .12)" strokeWidth="2" />
      <circle
        ref={circle}
        cx="11"
        cy="11"
        r="9"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={2 * Math.PI * 9}
        strokeDashoffset={2 * Math.PI * 9}
      />
    </svg>
  );
}

const isActivePage = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : href.startsWith("/#") ? false : pathname.startsWith(href);

function Island() {
  const active = useActive();
  const pathname = usePathname();
  const go = useGoToUniverse();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const u = UNIVERSES[active] ?? UNIVERSES[0];
  // on the home page the pill follows the section you're in
  const sectionPage = u.id === "projects" ? "/#projects" : u.id === "about" ? "/#about" : u.id === "contact" ? "/contact" : "/";
  const current = pathname === "/" ? sectionPage : (PAGES.find((p) => isActivePage(pathname, p.href))?.href ?? null);
  const pill = hover ?? current;

  return (
    <div className="pointer-events-auto relative hidden md:block" onMouseLeave={() => setOpen(false)}>
      <nav className="glass flex items-center gap-1 rounded-full p-1.5" aria-label="Primary">
        <button
          onMouseEnter={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1.5 transition-colors hover:bg-white/5"
        >
          <ProgressRing />
          <span className="font-mono text-[11px] tracking-[0.2em] text-accent">U·{String(active + 1).padStart(2, "0")}</span>
          <span className="relative h-4 w-24 overflow-hidden text-left text-[13px] font-medium">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={u.name}
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -18, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 leading-4 whitespace-nowrap"
              >
                {u.name}
              </motion.span>
            </AnimatePresence>
          </span>
          <svg viewBox="0 0 12 12" className={`h-3 w-3 text-fog transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="m3 4.5 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="mx-1 h-5 w-px bg-line" />
        <ul className="flex items-center" onMouseLeave={() => setHover(null)}>
          {PAGES.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                onMouseEnter={() => setHover(p.href)}
                scroll={!p.href.startsWith("/#")}
                onClick={(e) => {
                  if (pathname !== "/") return;
                  if (p.href.startsWith("/#")) {
                    e.preventDefault();
                    scrollToId(p.href.slice(2));
                  } else if (p.href === "/") {
                    e.preventDefault();
                    scrollToId("home");
                  }
                }}
                className={`relative block rounded-full px-3.5 py-1.5 text-[13px] whitespace-nowrap transition-colors ${current === p.href ? "text-bone" : "text-bone/65 hover:text-bone"}`}
              >
                {pill === p.href && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-white/10" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                <span className="relative">{p.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scale: 0.97, filter: "blur(6px)" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 pt-3"
          >
            <div className="w-[min(640px,80vw)] rounded-3xl border border-line bg-[#0a0a12]/95 p-3 shadow-2xl backdrop-blur-2xl">
              <p className="px-3 pt-1 pb-3 font-mono text-[10px] tracking-[0.3em] text-fog uppercase">Jump to a universe</p>
              <div className="grid grid-cols-3 gap-1">
                {UNIVERSES.map((x, i) => (
                  <button
                    key={x.id}
                    onClick={() => {
                      setOpen(false);
                      go(x.id);
                    }}
                    className={`group flex items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-white/5 ${i === active ? "bg-white/[0.06]" : ""}`}
                  >
                    <span
                      className="h-8 w-8 shrink-0 rounded-full transition-transform duration-500 group-hover:scale-110"
                      style={{ background: `radial-gradient(circle at 35% 30%, ${x.colors[2]}, ${x.colors[1]} 45%, ${x.colors[0]} 80%)`, boxShadow: `0 0 18px ${x.ui[0]}55` }}
                    />
                    <span className="min-w-0">
                      <span className="block font-mono text-[10px] text-fog">U·{String(i + 1).padStart(2, "0")}</span>
                      <span className="block truncate text-[13px] font-medium">{x.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Clock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const fmt = () => {
      try {
        return new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: timezone,
          timeZoneName: "short",
        }).format(new Date());
      } catch {
        return new Date().toLocaleTimeString();
      }
    };
    const first = window.setTimeout(() => setNow(fmt()), 0);
    const id = window.setInterval(() => setNow(fmt()), 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [timezone]);
  return <span className="tabular-nums">{now || "--:--:--"}</span>;
}

function Menu({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: Profile }) {
  const active = useActive();
  const goUniverse = useGoToUniverse();
  const go = (id: string) => {
    onClose();
    window.setTimeout(() => goUniverse(id), 450);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="menu"
          initial={{ clipPath: "circle(0% at calc(100% - 52px) 44px)" }}
          animate={{ clipPath: "circle(150% at calc(100% - 52px) 44px)" }}
          exit={{ clipPath: "circle(0% at calc(100% - 52px) 44px)" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[90] overflow-y-auto bg-[#07070d]"
          data-lenis-prevent
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_45%),radial-gradient(circle_at_10%_90%,color-mix(in_srgb,var(--accent-2)_14%,transparent),transparent_40%)]" />
          <div className="relative mx-auto grid min-h-full max-w-[1500px] grid-cols-1 gap-12 px-6 pt-24 pb-28 md:grid-cols-[1.3fr_1fr] md:px-12 md:pb-10">
            <div>
              <p className="mb-4 font-mono text-[11px] tracking-[0.3em] text-fog uppercase">Universes</p>
              <ul className="flex flex-col">
                {UNIVERSES.map((u, i) => (
                  <motion.li
                    key={u.id}
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -30, opacity: 0 }}
                    transition={{ delay: 0.25 + i * 0.045, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="border-b border-line"
                  >
                    <button onClick={() => go(u.id)} className="group flex w-full items-center gap-5 py-[1vh] text-left" data-cursor="Go">
                      <span className="w-8 font-mono text-xs text-fog">{String(i + 1).padStart(2, "0")}</span>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-500 group-hover:scale-[2.2]" style={{ background: u.ui[0], boxShadow: `0 0 14px ${u.ui[0]}` }} />
                      <span className="relative block h-[1.05em] overflow-hidden font-display text-[clamp(1.8rem,5vh,3.4rem)] leading-[1.05] font-bold tracking-tight">
                        <span className={`block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full ${i === active ? "text-accent" : ""}`}>{u.nav}</span>
                        <span className="block font-serif font-normal italic transition-transform duration-500 ease-out-expo group-hover:-translate-y-full" style={{ color: u.ui[0] }}>
                          {u.name}
                        </span>
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.45, duration: 0.8 }}
              className="flex flex-col gap-10 text-sm md:justify-end"
            >
              <div>
                <p className="mb-4 font-mono text-[11px] tracking-[0.3em] text-fog uppercase">Pages</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { href: "/#projects", label: "Selected work", sub: "Case studies" },
                    { href: "/contact", label: "Contact", sub: "Start a project" },
                    { href: "/api/resume", label: "Résumé", sub: "Download PDF" },
                    { href: "/#stats", label: "Live stats", sub: "LeetCode · GitHub" },
                  ].map((p) =>
                    p.href.startsWith("/api") ? (
                      <a key={p.href} href={p.href} className="group glass rounded-2xl p-4 transition-colors hover:border-accent/60">
                        <span className="flex items-center justify-between font-display text-lg font-bold">
                          {p.label}
                          <span className="text-fog transition-transform duration-300 group-hover:translate-y-0.5 group-hover:text-accent">↓</span>
                        </span>
                        <span className="mt-1 block text-xs text-fog">{p.sub}</span>
                      </a>
                    ) : (
                      <Link
                        key={p.href}
                        href={p.href}
                        scroll={!p.href.startsWith("/#")}
                        onClick={(e) => {
                          if (p.href.startsWith("/#")) {
                            e.preventDefault();
                            go(p.href.slice(2));
                          } else onClose();
                        }}
                        className="group glass rounded-2xl p-4 transition-colors hover:border-accent/60"
                      >
                        <span className="flex items-center justify-between font-display text-lg font-bold">
                          {p.label}
                          <span className="text-fog transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent">→</span>
                        </span>
                        <span className="mt-1 block text-xs text-fog">{p.sub}</span>
                      </Link>
                    ),
                  )}
                </div>
              </div>
              <div>
                <p className="mb-3 font-mono text-[11px] tracking-[0.3em] text-fog uppercase">Say hello</p>
                <a href={`mailto:${profile.email}`} className="font-display text-2xl font-semibold break-all hover:text-accent md:text-3xl">
                  {profile.email}
                </a>
              </div>
              <div>
                <p className="mb-3 font-mono text-[11px] tracking-[0.3em] text-fog uppercase">Connect</p>
                <SocialLinks socials={profile.socials} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 font-mono text-[11px] tracking-[0.2em] text-fog uppercase">
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${profile.available ? "animate-pulse-dot bg-accent" : "bg-fog"}`} />
                  {profile.availabilityText}
                </span>
                <span>
                  {profile.location} · <Clock timezone={profile.timezone} />
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Navbar({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // close the menu on navigation (adjust state during render, no effect needed)
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (open) scrollState.lenis?.stop();
    else scrollState.lenis?.start();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // slide in after the loader
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    gsap.set(el, { yPercent: -140, opacity: 0 });
    const show = () => gsap.to(el, { yPercent: 0, opacity: 1, duration: 1.2, delay: 0.6, ease: "expo.out" });
    if (scrollState.introDone) show();
    window.addEventListener(LOADER_DONE_EVENT, show);
    return () => window.removeEventListener(LOADER_DONE_EVENT, show);
  }, []);

  // hide the side groups while scrolling down, reveal on scroll up
  useEffect(() => {
    const sides = bar.current ? Array.from(bar.current.querySelectorAll<HTMLElement>(".nav-side")) : [];
    let hidden = false;
    let last = 0;
    const tick = () => {
      const y = scrollState.y;
      const dy = y - last;
      last = y;
      if (y > 180 && dy > 0.5 && !hidden) {
        hidden = true;
        gsap.to(sides, { yPercent: -150, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.04 });
      } else if ((y < 180 || dy < -0.5) && hidden) {
        hidden = false;
        gsap.to(sides, { yPercent: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.04 });
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[94] h-28 bg-gradient-to-b from-void/85 via-void/40 to-transparent" />
      <header ref={bar} className="pointer-events-none fixed inset-x-0 top-0 z-[95] grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 md:px-8 md:py-5">
        <div className="nav-side justify-self-start">
          <Link href="/" className="pointer-events-auto flex items-center gap-2.5" aria-label="Home">
            <Logo className="h-10 w-10" spin />
            <span className="hidden flex-col sm:flex">
              <Scramble text={profile.firstName.toUpperCase()} className="font-display text-sm leading-none font-bold tracking-[0.25em]" />
              <span className="mt-1 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.18em] text-fog uppercase">
                <span className={`h-1.5 w-1.5 rounded-full ${profile.available ? "bg-accent" : "bg-fog"}`} />
                {profile.available ? "Available" : "Busy"} · {profile.location}
              </span>
            </span>
          </Link>
        </div>

        <Island />

        <div className="pointer-events-auto flex items-center gap-2 justify-self-end">
          <div className="nav-side flex items-center gap-2">
            <Magnetic>
              <a
                href="/api/resume"
                className="group glass hidden h-11 w-11 items-center justify-center rounded-full transition-colors hover:border-accent hover:text-accent lg:flex"
                data-cursor="PDF"
                aria-label="Download résumé"
                title="Download résumé"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 2v9m0 0 3.5-3.5M8 11 4.5 7.5M3 14h10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </Magnetic>
            <Magnetic>
              <Link
                href="/contact"
                className="group relative hidden items-center gap-2 overflow-hidden rounded-full bg-accent py-2 pr-2 pl-5 text-[13px] font-semibold text-black sm:flex"
              >
                <span className="relative z-10">Let&apos;s talk</span>
                <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black text-accent transition-transform duration-500 group-hover:-rotate-45">
                  →
                </span>
                <span className="absolute inset-0 translate-y-full bg-bone transition-transform duration-500 ease-out-expo group-hover:translate-y-0" />
              </Link>
            </Magnetic>
          </div>
          <Magnetic>
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="glass relative flex h-11 w-11 items-center justify-center rounded-full"
            >
              <span className={`absolute h-[1.5px] w-4 bg-bone transition-transform duration-500 ease-out-expo ${open ? "rotate-45" : "-translate-y-[3.5px]"}`} />
              <span className={`absolute h-[1.5px] w-4 bg-bone transition-transform duration-500 ease-out-expo ${open ? "-rotate-45" : "translate-y-[3.5px]"}`} />
            </button>
          </Magnetic>
        </div>
      </header>
      <Menu open={open} onClose={() => setOpen(false)} profile={profile} />
    </>
  );
}
