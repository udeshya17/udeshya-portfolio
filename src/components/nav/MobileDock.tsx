"use client";

import gsap from "gsap";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useActive } from "./Navbar";
import { LOADER_DONE_EVENT, scrollState, scrollToId } from "../scroll/scrollState";
import { REALMS } from "../world/realms";

const ICONS = {
  home: "M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5",
  work: "M4 7h16v12H4zM9 7V5h6v2M4 12h16",
  cv: "M12 4v11m0 0 4-4m-4 4-4-4M5 20h14",
  chat: "M4 5h16v11H9l-5 4z",
};

const ITEMS = [
  { href: "/", label: "Home", icon: ICONS.home },
  { href: "/#projects", label: "Work", icon: ICONS.work, section: "projects" },
  { href: "/api/resume", label: "Résumé", icon: ICONS.cv, download: true },
  { href: "/contact", label: "Contact", icon: ICONS.chat },
];

/** Floating bottom dock for phones: thumb-reachable navigation. */
export default function MobileDock() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.set(el, { yPercent: 160 });
    const show = () => gsap.to(el, { yPercent: 0, duration: 1, delay: 0.9, ease: "expo.out" });
    if (scrollState.introDone) show();
    window.addEventListener(LOADER_DONE_EVENT, show);
    const tick = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${scrollState.progress})`;
    };
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener(LOADER_DONE_EVENT, show);
      gsap.ticker.remove(tick);
    };
  }, []);

  const active = useActive();
  const onHome = pathname === "/";
  const inWork = onHome && REALMS[active]?.kind === "sky";
  const isActive = (href: string) =>
    href === "/#projects" ? inWork : href === "/" ? onHome && !inWork : pathname.startsWith(href);

  return (
    <nav ref={ref} aria-label="Quick navigation" className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[80] flex justify-center px-4 lg:hidden">
      <div className="relative flex items-center gap-1 overflow-hidden rounded-full border border-line bg-[#0a0a12]/85 p-1.5 shadow-[0_10px_40px_rgb(0_0_0/0.6)] backdrop-blur-xl">
        {ITEMS.map((it) => {
          const active = isActive(it.href);
          const inner = (
            <>
              {active && (
                <motion.span layoutId="dock-pill" className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <svg viewBox="0 0 24 24" className="relative h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={it.icon} />
              </svg>
              {active && <span className="relative text-[13px] font-semibold">{it.label}</span>}
            </>
          );
          const cls = `relative flex h-11 items-center gap-2 rounded-full px-4 transition-colors ${active ? "text-black" : "text-bone/75"}`;
          return it.download ? (
            <a key={it.href} href={it.href} className={cls} aria-label={it.label}>
              {inner}
            </a>
          ) : (
            <Link
              key={it.href}
              href={it.href}
              scroll={!it.section}
              onClick={(e) => {
                if (!onHome || (!it.section && it.href !== "/")) return;
                e.preventDefault();
                scrollToId(it.section ?? "home");
              }}
              className={cls}
              aria-label={it.label}
            >
              {inner}
            </Link>
          );
        })}
        <div className="absolute inset-x-4 bottom-0 h-[2px] overflow-hidden rounded-full">
          <div ref={bar} className="h-full origin-left bg-accent/70" />
        </div>
      </div>
    </nav>
  );
}
