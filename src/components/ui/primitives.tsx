"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect, useRef, useState, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger, SplitText);

const GLYPHS = "!<>-_\\/[]{}—=+*^?#ABCDEFXYZ01";

/** Text that decodes from random glyphs when hovered (or on mount with `auto`). */
export function Scramble({ text, className, auto = false }: { text: string; className?: string; auto?: boolean }) {
  const [out, setOut] = useState(text);
  const frame = useRef(0);

  const run = () => {
    let i = 0;
    cancelAnimationFrame(frame.current);
    const tick = () => {
      setOut(
        text
          .split("")
          .map((c, idx) => (c === " " || idx < i / 2 ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      i++;
      if (i / 2 <= text.length) frame.current = requestAnimationFrame(tick);
      else setOut(text);
    };
    tick();
  };

  useEffect(() => {
    if (auto) run();
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, text]);

  return (
    <span className={className} onMouseEnter={run} aria-label={text}>
      <span aria-hidden>{out}</span>
    </span>
  );
}

/** Pulls its child toward the cursor. */
export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover)").matches) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [strength]);
  return (
    <div ref={ref} className={className ?? "inline-block"}>
      {children}
    </div>
  );
}

/** Splits text into lines/words and reveals them from a mask when scrolled into view. */
export function Reveal({
  children,
  as: Tag = "div",
  className,
  type = "lines",
  delay = 0,
  stagger,
}: {
  children: ReactNode;
  as?: "div" | "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  type?: "lines" | "words" | "chars";
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let split: SplitText | null = null;
    const ctx = gsap.context(() => {
      split = SplitText.create(el, {
        type: type === "lines" ? "lines" : type === "words" ? "words,lines" : "chars,words,lines",
        mask: "lines",
        autoSplit: true,
        onSplit(self) {
          const targets = type === "lines" ? self.lines : type === "words" ? self.words : self.chars;
          return gsap.fromTo(targets, { yPercent: 110, rotate: type === "chars" ? 8 : 2, opacity: 0 }, {
            yPercent: 0,
            rotate: 0,
            opacity: 1,
            duration: 1.2,
            delay,
            stagger: stagger ?? (type === "chars" ? 0.025 : type === "words" ? 0.04 : 0.1),
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        },
      });
    }, el);
    return () => {
      split?.revert();
      ctx.revert();
    };
  }, [type, delay, stagger]);
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className}>
      {children}
    </Tag>
  );
}

/** Fades/slides a block in when it enters the viewport. */
export function FadeIn({ children, className, y = 40, delay = 0 }: { children: ReactNode; className?: string; y?: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { y, opacity: 0, filter: "blur(8px)" }, {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 1.2,
        delay,
        ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    });
    return () => ctx.revert();
  }, [y, delay]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Number that counts up when visible. */
export function Counter({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { v: 0 };
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        v: value,
        duration: 2.2,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
        onUpdate: () => {
          el.textContent = `${Math.round(obj.v).toLocaleString()}${suffix}`;
        },
      });
    });
    return () => ctx.revert();
  }, [value, suffix]);
  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}

/** Section eyebrow: "✦ Selected work". */
export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-3 font-mono text-[11px] tracking-[0.28em] text-fog uppercase ${className}`}>
      <span className="text-accent">✦</span>
      {children}
    </p>
  );
}
