"use client";

import { useState } from "react";
import type { Profile, ResumeMeta } from "@/lib/content/types";
import Link from "next/link";
import SiteFooter from "../SiteFooter";
import { FadeIn, Kicker, Magnetic, Reveal } from "../ui/primitives";

export default function Contact({ profile, resume }: { profile: Profile; resume: ResumeMeta }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };
  const updated = new Date(resume.updatedAt);

  return (
    <section id="contact" className="relative z-10 flex min-h-[100svh] flex-col justify-end px-5 pt-32 pb-6 md:px-10 lg:pt-40">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="lg:w-[54%]">
          <Kicker className="mb-8">Say hello</Kicker>
          <Reveal as="h2" type="words" className="h-section">
            Got a universe that needs <span className="font-serif font-normal text-accent italic">building?</span>
          </Reveal>

          <FadeIn className="mt-8 md:mt-12">
            <p className="mb-3 font-mono text-[11px] tracking-[0.25em] text-fog uppercase">Drop a line</p>
            <button onClick={copy} className="group text-left" data-cursor={copied ? "Copied" : "Copy"}>
              <span className="font-display text-[clamp(1.5rem,3.4vw,3.4rem)] leading-tight font-bold tracking-tight [overflow-wrap:anywhere] transition-colors group-hover:text-accent">
                {profile.email}
              </span>
              <span className="mt-2 block font-mono text-xs text-fog">{copied ? "✓ Copied to clipboard" : "Click to copy"}</span>
            </button>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-8 flex flex-wrap gap-3 md:mt-10">
            <Magnetic>
              <Link href="/contact" className="group relative block overflow-hidden rounded-full bg-accent px-7 py-4 font-semibold text-black">
                <span className="relative z-10">Start a project →</span>
                <span className="absolute inset-0 translate-y-full rounded-full bg-bone transition-transform duration-500 ease-out-expo group-hover:translate-y-0" />
              </Link>
            </Magnetic>
            <Magnetic>
              <a href="/api/resume" className="glass block rounded-full px-7 py-4 font-semibold hover:border-accent hover:text-accent" data-cursor="PDF">
                Download résumé ↓
              </a>
            </Magnetic>
          </FadeIn>

          <FadeIn delay={0.15} className="mt-5 font-mono text-[11px] text-fog">
            {resume.fileName} · {(resume.size / 1024).toFixed(0)} KB · updated{" "}
            {Number.isNaN(updated.getTime()) ? "recently" : updated.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}
          </FadeIn>
        </div>

        <SiteFooter profile={profile} />
      </div>
    </section>
  );
}
