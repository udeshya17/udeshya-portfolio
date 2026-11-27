import type { ReactNode } from "react";
import { REALMS } from "./realms";

/** One world's worth of sections. The stage reads how far you've scrolled through it. */
export function Realm({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div data-realm={index} className="relative">
      {children}
    </div>
  );
}

/**
 * The journey between two worlds. The section is tall and its frame sticks, so scrolling here
 * doesn't move the page: it lifts you off the ground, out to orbit, turns the Earth to the next
 * place and drops you into it (the stage draws all of that behind this frame). The frame carries
 * the words: a cue before you go, flight instruments on the way, the new world's title when you land.
 */
export function Gate({ to }: { to: number }) {
  const r = REALMS[to];
  return (
    <section data-gate={to} data-state="before" aria-label={`Journey to ${r.name}, ${r.place.name}`} className="gate relative z-10 h-[420vh]">
      <div className="gate-frame sticky top-0 h-[100svh] overflow-hidden">
        {r.cue && (
          <p className="gate-cue">
            <span aria-hidden className="gate-cue-line" />
            {r.cue}
          </p>
        )}

        <div className="gate-hud" aria-hidden>
          <span className="gate-hud-label">Altitude</span>
          <span className="gate-hud-dest">
            <span style={{ color: r.ui[0] }}>{r.place.name}</span>
          </span>
          <b data-alt className="gate-hud-value">
            412 km
          </b>
          <span className="gate-hud-bar">
            <i />
          </span>
          <span data-coord className="gate-hud-coord" />
        </div>

        <div className="gate-card">
          <p className="gate-card-nav">
            {r.place.name}
            <span className="gate-rule" />
            {r.nav}
          </p>
          <h2 style={{ color: r.ui[0] }}>{r.name}</h2>
          <p className="gate-card-line">{r.line}</p>
        </div>
      </div>

      {/* where "jump to this world" lands: the arrival frame, title card and all */}
      <span id={r.id} aria-hidden className="pointer-events-none absolute bottom-0 left-0 block h-[100svh] w-px" />
    </section>
  );
}
