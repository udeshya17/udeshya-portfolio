"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { scrollState, subscribeActive } from "./scroll/scrollState";
import { UNIVERSES } from "./universes";

/** A cinematic, purely typographic cue each time you cross into a new universe. */
export default function UniverseSignal() {
  const pathname = usePathname();
  const [shown, setShown] = useState<number | null>(null);
  const timer = useRef<number>(0);

  useEffect(() => {
    let last = scrollState.active;
    const unsub = subscribeActive(() => {
      const i = scrollState.active;
      if (i === last || i < 0) return;
      last = i;
      if (!scrollState.introDone || scrollState.lock !== null || scrollState.y < 50) return;
      setShown(i);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setShown(null), 2200);
    });
    return () => {
      unsub();
    };
  }, []);

  if (pathname !== "/") return null;
  const u = shown === null ? null : UNIVERSES[shown];
  return (
    <div aria-live="polite" className="pointer-events-none fixed top-5 left-8 z-[96] hidden lg:block">
      <AnimatePresence mode="wait">
        {u && (
          <motion.div key={u.id} initial="in" animate="show" exit="out" className="flex items-start gap-4">
            <motion.span
              variants={{ in: { scaleY: 0 }, show: { scaleY: 1 }, out: { scaleY: 0 } }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="block h-12 w-px origin-top"
              style={{ background: u.ui[0] }}
            />
            <span className="block overflow-hidden">
              <motion.span
                variants={{ in: { y: "110%" }, show: { y: "0%" }, out: { y: "-110%" } }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="block font-mono text-[10px] tracking-[0.3em] text-fog uppercase"
              >
                Entering universe {String(shown! + 1).padStart(2, "0")}
              </motion.span>
              <motion.span
                variants={{ in: { y: "110%" }, show: { y: "0%" }, out: { y: "-110%" } }}
                transition={{ duration: 0.8, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="block font-serif text-3xl italic"
                style={{ color: u.ui[0] }}
              >
                {u.name}
              </motion.span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
