"use client";

import Link from "next/link";
import type { Profile } from "@/lib/content/types";
import { Logo } from "./nav/Navbar";
import { scrollState } from "./scroll/scrollState";
import SectionLink from "./ui/SectionLink";
import { SocialLinks } from "./ui/SocialIcon";

export default function SiteFooter({ profile }: { profile: Profile }) {
  const toTop = () => {
    if (scrollState.lenis) scrollState.lenis.scrollTo(0, { duration: 2.4 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <footer className="mt-12 grid gap-6 border-t border-line pt-6 pb-20 text-sm text-fog md:mt-20 md:grid-cols-[1fr_auto_1fr] md:items-center md:pb-0">
      <div className="flex items-center gap-3">
        <Logo className="h-7 w-7" />
        <span>© {profile.name}. Crafted across 9 universes.</span>
      </div>
      <div className="flex flex-col items-start gap-3 md:items-center">
        <nav className="flex gap-5">
          <Link href="/" className="hover:text-accent">Home</Link>
          <SectionLink id="projects" className="hover:text-accent">Work</SectionLink>
          <Link href="/contact" className="hover:text-accent">Contact</Link>
          <a href="/api/resume" className="hover:text-accent">Résumé</a>
        </nav>
        <SocialLinks socials={profile.socials} size="sm" />
      </div>
      <div className="flex items-center justify-between gap-4 md:justify-end">
        <span className="font-mono text-[11px]">Next.js · Three.js · GSAP</span>
        <button onClick={toTop} className="glass rounded-full px-4 py-2 text-bone hover:text-accent" data-cursor="Up">
          Back to top ↑
        </button>
      </div>
    </footer>
  );
}
