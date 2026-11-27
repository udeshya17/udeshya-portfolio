"use client";

import { forwardRef, useState } from "react";
import type { Project } from "@/lib/content/types";

export function previewSrc(p: Project): string | null {
  if (p.preview) return p.preview;
  if (p.url && /^https?:\/\//.test(p.url)) return `/api/preview/${p.slug}`;
  return null;
}

const domainOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Generative cover used when a project has no screenshot. */
export function GenerativeCover({ p, index = 0, className = "" }: { p: Project; index?: number; className?: string }) {
  if (p.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.image} alt={p.name} className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  const initials = p.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(circle at 20% 30%, ${p.accent}cc, transparent 45%), radial-gradient(circle at 80% 70%, ${p.accent}55, transparent 50%), radial-gradient(circle at 60% 10%, #ffffff22, transparent 35%), #0a0a12`,
      }}
    >
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgb(255_255_255/.08)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-[9rem] leading-none font-extrabold tracking-tighter text-white/10 md:text-[13rem]">{initials}</span>
      </div>
      <div className="absolute top-5 left-6 font-mono text-xs text-white/70">#{String(index + 1).padStart(2, "0")}</div>
      <div className="absolute top-5 right-6 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase">{p.category}</div>
      <div className="absolute right-8 bottom-6 h-24 w-24 rounded-full border border-white/20" style={{ boxShadow: `0 0 80px 10px ${p.accent}66 inset` }} />
    </div>
  );
}

/**
 * A browser window whose page scrolls with `--p` (0..1).
 * Parents drive `--p` from scroll; `hover` mode animates it on mouse-over.
 */
export const BrowserFrame = forwardRef<
  HTMLDivElement,
  { p: Project; index?: number; hover?: boolean; auto?: boolean; className?: string; chrome?: boolean }
>(function BrowserFrame({ p, index = 0, hover = false, auto = false, className = "", chrome = true }, ref) {
  const src = previewSrc(p);
  const [failed, setFailed] = useState(!src);
  const showShot = src && !failed;

  return (
    <div ref={ref} className={`group/frame flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0b0b12] ${className}`}>
      {chrome && (
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-center gap-2 truncate rounded-md bg-white/5 px-3 py-1 font-mono text-[11px] text-fog">
            <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </svg>
            <span className="truncate">{p.url ? domainOf(p.url) : `${p.slug}.internal`}</span>
          </span>
          {showShot && <span className="hidden font-mono text-[10px] tracking-[0.2em] text-accent uppercase sm:inline">Live</span>}
        </div>
      )}
      <div className={`browser-viewport relative min-h-0 flex-1 overflow-hidden ${hover ? "browser-hover" : ""} ${auto ? "browser-auto" : ""}`}>
        {showShot ? (
          <>
            {/* sits underneath; the screenshot covers it as soon as it paints */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0b0b12]">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
              <span className="font-mono text-[10px] tracking-[0.25em] text-fog uppercase">Loading live preview</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={(img) => {
                // errors that fired before hydration
                if (img && img.complete && img.naturalWidth === 0 && img.currentSrc) setFailed(true);
              }}
              src={src!}
              alt={`${p.name} website preview`}
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
              className="browser-shot absolute top-0 left-0 w-full"
            />
          </>
        ) : (
          <GenerativeCover p={p} index={index} />
        )}
      </div>
    </div>
  );
});
