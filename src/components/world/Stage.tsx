"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { LOADER_DONE_EVENT, scrollState, setActive, setLock } from "../scroll/scrollState";
import { createLayer, type Layer, type Uniforms } from "./gl";
import { REALMS, realmIndex, type Realm, type RealmKind } from "./realms";
import { SCENES } from "./scenes";
import { EARTH_SHADER, SCENE_SHADERS } from "./shaders";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const geo = (a: number, b: number, t: number) => a * Math.pow(b / a, t); // even-feeling zoom
const RAD = Math.PI / 180;
const SPRITES = 22;
const ORBIT_KM = 412;

/**
 * Every journey goes through orbit. As shares of the scroll through a gate:
 *   0    → UP     you leave the world you're in, straight up (a veil hides the cut)
 *   UP   → OUT    the camera pulls back from the ground until the whole Earth is in view
 *   OUT  → TURN   the Earth turns under you to the next place
 *   TURN → DOWN   you dive at it (another veil, at the cut)
 *   DOWN → 1      you arrive: the new world's own entrance plays, then its title card
 * The first journey starts in orbit already (the hero), so it skips the climb.
 */
const UP = 0.2;
const OUT = 0.34;
const TURN = 0.62;
const DOWN = 0.8;

/** The veil you pass through: on the way up (from) and on the way down (to). */
const VEIL_UP: Partial<Record<RealmKind, string>> = { ocean: "surface", forest: "mist-forest", sky: "mist-sky", aurora: "snow" };
const VEIL_DOWN: Record<RealmKind, string> = { cosmos: "cloud", ocean: "cloud", forest: "mist-forest", sky: "mist-sky", aurora: "snow" };

const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000).toLocaleString("en-US")} m` : `${Math.round(km).toLocaleString("en-US")} km`);
const fmtCoord = (lat: number, lon: number) => {
  const L = ((((lon + 180) % 360) + 360) % 360) - 180;
  return `${Math.abs(lat).toFixed(1)}°${lat < 0 ? "S" : "N"}  ${Math.abs(L).toFixed(1)}°${L < 0 ? "W" : "E"}`;
};

/** Longitude to travel from a to b: the short way round, or a whole extra turn if the hop is small. */
const lonTravel = (a: Realm, b: Realm) => {
  let d = b.place.lon - a.place.lon;
  d = ((((d + 180) % 360) + 360) % 360) - 180;
  if (a.kind !== "cosmos" && Math.abs(d) < 70) d += d < 0 ? -360 : 360; // let the planet revolve
  return d;
};

/**
 * The fixed backdrop behind every page: one world at a time, the Earth they all sit on,
 * and the journeys between them.
 *
 * Home page structure it reads:
 *   [data-realm=k]  a world's sections; scrolling through it sets that scene's `--d` 0..1
 *   [data-gate=k]   a tall section with a sticky frame; scrolling through it is the journey
 *                   from world k-1 to world k
 */
export default function Stage() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const show = () => el.setAttribute("data-ready", "");
    if (scrollState.introDone) show();
    window.addEventListener(LOADER_DONE_EVENT, show);
    return () => window.removeEventListener(LOADER_DONE_EVENT, show);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const wraps = Array.from(el.querySelectorAll<HTMLElement>("[data-scene]"));
    const scenes = wraps.map((w) => w.firstElementChild as HTMLElement);
    const canvases = scenes.map((s) => s.querySelector<HTMLCanvasElement>("canvas[data-gl]"));
    const anchors = scenes.map((s) => s.querySelector<HTMLElement>("[data-anchor]"));
    const earthCanvas = el.querySelector<HTMLCanvasElement>("[data-earth]")!;
    const orbit = el.querySelector<HTMLElement>("[data-orbit]")!;
    const moon = orbit.querySelector<HTMLElement>("[data-moon]")!;
    const iss = orbit.querySelector<HTMLElement>("[data-iss]")!;
    const jet = orbit.querySelector<HTMLElement>("[data-jet]")!;
    const gulls = orbit.querySelector<HTMLElement>("[data-gulls]")!;
    const target = orbit.querySelector<HTMLElement>("[data-target]")!;
    const transit = el.querySelector<HTMLElement>("[data-transit]")!;
    const sprites = Array.from(transit.children) as HTMLElement[];
    const veil = el.querySelector<HTMLElement>("[data-veil]")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compact = Math.min(window.innerWidth, window.innerHeight) < 700;
    const sceneScale = compact ? 0.8 : 0.5; // atmospheres are soft: draw them small, let the browser upscale
    const earthScale = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1);
    const COSMOS = realmIndex("cosmos");

    // independent hashes per sprite, so the debris never lines up
    const hash = (n: number) => {
      const v = Math.sin(n) * 43758.5453;
      return v - Math.floor(v);
    };
    const seeds = sprites.map((_, i) => ({ x: hash(i * 78.23 + 2), z: hash(i * 39.35 + 3), spin: i % 2 ? 1 : -1, size: 0.55 + hash(i * 5.17 + 4) * 0.9 }));

    let gates: HTMLElement[] = [];
    let realms: HTMLElement[] = [];
    const collect = () => {
      gates = Array.from(document.querySelectorAll<HTMLElement>("[data-gate]"));
      realms = [];
      document.querySelectorAll<HTMLElement>("[data-realm]").forEach((r) => (realms[Number(r.dataset.realm)] = r));
    };

    const layers: (Layer | null | undefined)[] = []; // undefined: not tried yet, null: no WebGL
    let earth: Layer | null | undefined;
    const states = wraps.map(() => "");
    const last = { gate: null as HTMLElement | null, d: -1, shown: -1, mx: 0, my: 0, debris: "", alt: "", coord: "", earth: false };
    let hud: { alt: HTMLElement | null; coord: HTMLElement | null } = { alt: null, coord: null };
    const t0 = performance.now();
    let mx = 0;
    let my = 0;
    let page: Element | null = null;
    let frame = 0;

    /** Paint one world's atmosphere. */
    const paint = (i: number, time: number, d: number, a: number, fall = 0) => {
      let layer = layers[i];
      if (layer === undefined) {
        const c = canvases[i];
        layer = layers[i] = c ? createLayer(c, SCENE_SHADERS[REALMS[i].kind], { scale: sceneScale }) : null;
      }
      if (!layer) return;
      const u: Uniforms = { uTime: time, uD: d, uA: a, uFall: fall, uMouse: [mx, my] };
      const anchor = anchors[i]; // a scene's point of interest, in the shader's aspect-correct space
      if (anchor) {
        const m = anchor.getBoundingClientRect();
        u.uP = [(m.left + m.width / 2 - window.innerWidth / 2) / window.innerHeight, (window.innerHeight / 2 - m.top - m.height / 2) / window.innerHeight];
      }
      if (layer.render(u) && !scenes[i].hasAttribute("data-live")) scenes[i].setAttribute("data-live", "");
    };

    /** Paint the Earth. Returns false until its maps have arrived. */
    const paintEarth = (time: number, c: [number, number], r: number, lat: number, lon: number, sun: number[], glare: number, detail: number) => {
      if (earth === undefined) {
        const big = !compact && window.screen.width * (window.devicePixelRatio || 1) > 1600;
        earth = createLayer(earthCanvas, EARTH_SHADER, {
          scale: earthScale,
          alpha: true,
          textures: { uDay: big ? "/earth/day.webp" : "/earth/day-2k.webp", uNight: "/earth/night.webp", uClouds: "/earth/clouds.webp", uOcean: "/earth/ocean.webp" },
        });
      }
      if (!earth) return false;
      const n = Math.hypot(sun[0], sun[1], sun[2]);
      return earth.render({ uTime: time, uC: c, uR: r, uView: [lat * RAD, lon * RAD], uSun: [sun[0] / n, sun[1] / n, sun[2] / n], uGlare: glare, uDetail: detail });
    };

    const tick = () => {
      // client navigation swaps <main> under us: re-scan for gates and worlds
      const main = document.querySelector("main");
      if (main !== page) {
        page = main;
        collect();
      }
      frame++;
      const time = reduce ? 0 : (performance.now() - t0) / 1000;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const aspect = vw / vh;
      const locked = scrollState.lock !== null;
      let from = scrollState.lock ?? 0;
      let to = from;
      let p = 0;
      let gate: HTMLElement | null = null;

      if (!locked) {
        for (const g of gates) {
          const gr = g.getBoundingClientRect();
          let state = "before";
          if (gr.top < vh) {
            const frameH = (g.firstElementChild as HTMLElement).offsetHeight;
            const travel = gr.height - frameH;
            const gp = travel > 0 ? clamp01(-gr.top / travel) : 1;
            const target = Number(g.dataset.gate);
            if (gp >= 1) {
              state = "after";
              from = target;
            } else {
              state = "live";
              gate = g;
              to = target;
              from = target - 1;
              p = gp;
            }
          }
          if (g.dataset.state !== state) {
            g.dataset.state = state;
            for (const k of ["--gp", "--gt", "--ga"]) g.style.removeProperty(k);
          }
        }
      }
      if (!gate) to = from;
      const A = REALMS[from];
      const B = REALMS[to];
      const fromOrbit = from === COSMOS;

      // which single world is on screen: the one you're leaving, space, or the one you're arriving in
      const shown = !gate ? from : p < UP && !fromOrbit ? from : p < DOWN ? COSMOS : to;
      for (let i = 0; i < wraps.length; i++) {
        const s = i === shown ? "on" : "off";
        if (s === states[i]) continue;
        states[i] = s;
        wraps[i].dataset.state = s;
        scenes[i].style.transform = "";
        for (const k of ["--a", "--lv", "--d"]) scenes[i].style.removeProperty(k);
      }
      if (shown !== last.shown) last.d = -1;

      // how deep you are in the world you're in
      let d = scrollState.progress;
      if (!locked) {
        const r = realms[from];
        d = 0;
        if (r) {
          const rr = r.getBoundingClientRect();
          d = clamp01(-rr.top / Math.max(1, rr.height - vh));
        }
      }

      // pointer parallax (also feeds the shaders)
      const px = Math.abs(scrollState.pointer.x) > 1 ? 0 : scrollState.pointer.x;
      const py = Math.abs(scrollState.pointer.y) > 1 ? 0 : scrollState.pointer.y;
      mx += (px - mx) * 0.05;
      my += (py - my) * 0.05;
      if (Math.abs(mx - last.mx) > 0.001 || Math.abs(my - last.my) > 0.001) {
        el.style.setProperty("--mx", mx.toFixed(3));
        el.style.setProperty("--my", my.toFixed(3));
        last.mx = mx;
        last.my = my;
      }

      // the Earth, as the hero shows it: low and to the side, sinking as you read
      const wide = smooth(0.8, 1.3, aspect);
      const hero = { c: [lerp(0.06, 0.56, wide), lerp(-1.02, -1.0, wide) - (fromOrbit ? d : 1) * 0.35] as [number, number], r: lerp(0.66, 0.88, wide) };
      const rOrbit = Math.min(0.4, aspect * 0.43);
      const rClose = rOrbit * 22; // past this the maps run out of detail; the cloud veil takes over
      const sunHero = [-0.338, 0.909, 0.242];
      const sunOrbit = [-0.48, 0.34, 0.81];

      let showEarth = shown === COSMOS && !locked;

      // the splashdown lock on the hero's Earth: sinks with the planet as you read, lets go as you leave orbit
      const lock = showEarth ? clamp01(1 - (fromOrbit ? d : 1) * 3) * (gate ? 1 - smooth(0, 0.06, p) : 1) : 0;
      target.style.opacity = lock.toFixed(3);
      if (lock > 0) target.style.transform = `translate3d(0, ${((fromOrbit ? d : 1) * 35).toFixed(2)}vh, 0)`;
      let ec: [number, number] = hero.c;
      let er = hero.r;
      let lat = REALMS[COSMOS].place.lat;
      let lon = REALMS[COSMOS].place.lon;
      let sun = sunHero;
      let glare = 1;
      let detail = 0;
      let fall = 0;

      if (gate) {
        if (last.gate !== gate) {
          el.style.setProperty("--gate", B.ui[0]);
          hud = { alt: gate.querySelector("[data-alt]"), coord: gate.querySelector("[data-coord]") };
          last.alt = last.coord = "";
        }
        gate.style.setProperty("--gp", p.toFixed(4));
        gate.style.setProperty("--gt", (smooth(0.02, 0.08, p) * (1 - smooth(DOWN, DOWN + 0.06, p))).toFixed(3));
        gate.style.setProperty("--ga", smooth(0.88, 0.98, p).toFixed(3));

        // where the camera is
        const turn = smooth(OUT, TURN, p);
        const dive = smooth(TURN, DOWN, p);
        const dLon = lonTravel(A, B);
        lat = lerp(A.place.lat, B.place.lat, turn);
        lon = A.place.lon + dLon * turn;
        if (fromOrbit) {
          const t = smooth(0, OUT, p);
          ec = [lerp(hero.c[0], 0, t), lerp(hero.c[1], 0, t)];
          er = geo(hero.r, rOrbit, t);
          sun = sunHero.map((v, k) => lerp(v, sunOrbit[k], t));
          glare = lerp(1, 0.55, t);
        } else {
          ec = [0, 0];
          er = geo(rOrbit * 9, rOrbit, smooth(UP, OUT, p));
          sun = sunOrbit;
          glare = 0.55 * smooth(UP + 0.04, OUT, p);
          detail = 1 - smooth(UP, UP + 0.1, p);
        }
        if (p > TURN) {
          er = geo(rOrbit, rClose, dive * dive);
          glare *= 1 - dive;
          detail = smooth(0.45, 0.9, dive);
          fall = dive;
        }

        // the instruments
        const km = fromOrbit || p >= UP ? (p < TURN ? ORBIT_KM : ORBIT_KM * Math.pow(1 - dive, 2.4)) : ORBIT_KM * Math.pow(smooth(0, UP, p), 2.2);
        const alt = fmtKm(km);
        if (hud.alt && alt !== last.alt) hud.alt.textContent = last.alt = alt;
        const coord = fmtCoord(p < UP && !fromOrbit ? A.place.lat : lat, p < UP && !fromOrbit ? A.place.lon : lon);
        if (hud.coord && coord !== last.coord) hud.coord.textContent = last.coord = coord;

        // the veils at the two cuts
        const vUp = fromOrbit ? 0 : smooth(UP - 0.07, UP, p) * (1 - smooth(UP + 0.005, UP + 0.07, p));
        const vDown = smooth(DOWN - 0.1, DOWN, p) * (1 - smooth(DOWN + 0.005, DOWN + 0.08, p));
        const kind = p < (UP + TURN) / 2 ? (VEIL_UP[A.kind] ?? "cloud") : VEIL_DOWN[B.kind];
        if (veil.dataset.kind !== kind) veil.dataset.kind = kind;
        veil.style.opacity = Math.max(vUp, vDown).toFixed(3);
        veil.style.setProperty("--v", (p < (UP + TURN) / 2 ? (p - UP) / 0.14 + 0.5 : (p - DOWN) / 0.14 + 0.5).toFixed(3));

        // the world you're leaving
        if (shown === from && !fromOrbit) {
          const lv = smooth(0, UP, p);
          scenes[from].style.setProperty("--lv", lv.toFixed(4));
          if (A.kind === "ocean") d *= (1 - lv) * (1 - lv); // swimming up: the water lightens, the surface returns
          if (!reduce) scenes[from].style.transform = `scale(${(1 + 0.06 * lv * lv).toFixed(4)})`;
        }
        // space, while you travel
        if (shown === COSMOS) {
          scenes[COSMOS].style.setProperty("--lv", fromOrbit ? smooth(0, 0.08, p).toFixed(3) : "1");
          d = fromOrbit ? 1 : 0;
        }
        // the world you're arriving in
        if (shown === to && to !== from) {
          const arrive = smooth(DOWN + 0.01, 0.97, p);
          scenes[to].style.setProperty("--a", arrive.toFixed(4));
          d = 0;
          if (!reduce) scenes[to].style.transform = `scale(${(1.08 - 0.08 * arrive).toFixed(4)})`;
        }

        // things you pass on the way
        const inOrbit = smooth(OUT - 0.05, OUT + 0.03, p) * (1 - smooth(TURN, TURN + 0.06, p));
        const crossing = smooth(OUT - 0.04, TURN + 0.04, p);
        moon.style.opacity = inOrbit.toFixed(3);
        moon.style.transform = `translate3d(${(-crossing * 4).toFixed(2)}vw, ${(crossing * 2).toFixed(2)}vh, 0)`;
        iss.style.opacity = (smooth(0, 0.08, crossing) * (1 - smooth(0.9, 1, crossing))).toFixed(3);
        iss.style.transform = `translate3d(${lerp(-30, 125, crossing).toFixed(2)}vw, ${(Math.sin(crossing * Math.PI) * -10 + 18).toFixed(2)}vh, 0) rotate(${lerp(-14, 8, crossing).toFixed(2)}deg) scale(${(0.8 + 0.5 * Math.sin(crossing * Math.PI)).toFixed(3)})`;
        const flyby = smooth(DOWN - 0.12, DOWN + 0.01, p);
        const planes = B.kind === "forest" || B.kind === "sky";
        jet.style.opacity = planes ? (smooth(0, 0.15, flyby) * (1 - smooth(0.85, 1, flyby))).toFixed(3) : "0";
        jet.style.transform = `translate3d(${lerp(112, -40, flyby).toFixed(2)}vw, ${lerp(60, 30, flyby).toFixed(2)}vh, 0) scale(${lerp(0.4, 2.4, flyby * flyby).toFixed(3)})`;
        const seabirds = smooth(DOWN, 0.96, p);
        gulls.style.opacity = B.kind === "ocean" ? (smooth(0, 0.15, seabirds) * (1 - smooth(0.8, 1, seabirds))).toFixed(3) : "0";
        gulls.style.transform = `translate3d(${lerp(-25, 110, seabirds).toFixed(2)}vw, ${lerp(30, 16, seabirds).toFixed(2)}vh, 0) scale(${lerp(0.8, 1.6, seabirds).toFixed(3)})`;

        // debris streaming past: on the climb (bubbles, leaves, cloud) and on the dive (air)
        const climb = !fromOrbit ? smooth(0.02, 0.06, p) * (1 - smooth(UP, UP + 0.03, p)) : 0;
        const dropping = smooth(TURN + 0.07, TURN + 0.12, p) * (1 - smooth(DOWN, DOWN + 0.04, p));
        const amp = reduce ? 0 : Math.max(climb, dropping);
        const mode = climb > dropping ? `up-${A.kind}` : "down";
        if (amp > 0.01) {
          if (transit.dataset.kind !== mode) transit.dataset.kind = mode;
          last.debris = mode;
          const upward = mode === "down" || mode === "up-ocean"; // air streaks and bubbles go up; leaves and cloud fall away
          for (let i = 0; i < sprites.length; i++) {
            const sd = seeds[i];
            const s = (sd.z + p * 9 + time * 0.12) % 1;
            const tx = sd.x * vw + Math.sin(s * 5 + i) * 26;
            const ty = upward ? vh + 140 - s * (vh + 320) : -140 + s * (vh + 320);
            const rot = mode === "down" ? 0 : s * 220 * sd.spin;
            sprites[i].style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${(sd.size * (0.7 + 0.7 * s)).toFixed(3)})`;
            sprites[i].style.opacity = (smooth(0, 0.1, s) * (1 - smooth(0.82, 1, s)) * amp).toFixed(3);
          }
        } else if (last.debris) {
          last.debris = "";
          for (const sp of sprites) sp.style.opacity = "0";
        }
      } else if (last.gate) {
        veil.style.opacity = "0";
        for (const o of [moon, iss, jet, gulls]) o.style.opacity = "0";
        for (const sp of sprites) sp.style.opacity = "0";
        last.debris = "";
      }
      last.gate = gate;

      // the world on screen
      if (Math.abs(d - last.d) > 0.0005) {
        scenes[shown].style.setProperty("--d", d.toFixed(4));
        last.d = d;
      }
      const busy = !!gate || Math.abs(scrollState.velocity) > 0.05;
      if (busy || frame % 2 === 0) {
        paint(shown, time, d, gate && shown === to ? smooth(DOWN + 0.01, 0.97, p) : 1, fall);
        if (showEarth) showEarth = paintEarth(time, ec, er, lat, lon, sun, glare, detail);
      } else showEarth = last.earth;
      if (showEarth !== last.earth) {
        earthCanvas.style.opacity = showEarth ? "1" : "0";
        last.earth = showEarth;
      }
      last.shown = shown;

      setActive(gate && p >= DOWN ? to : from);
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div ref={root} aria-hidden className="stage">
      {REALMS.map((r, i) => {
        const Scene = SCENES[r.kind];
        return (
          <div key={r.kind} data-scene={r.kind} data-state={i === 0 ? "on" : "off"} className="scene-wrap">
            <div className={`scene scene-${r.kind}`}>
              <Scene />
            </div>
          </div>
        );
      })}

      <canvas data-earth className="earth-gl" />

      {/* what you meet on the way: the Moon, the space station, a jet, seabirds */}
      <div data-orbit className="orbit">
        <div data-moon className="orbit-moon" />
        <div data-target className="orbit-target">
          <i className="ring" />
          <i className="ring ring-b" />
          <i className="dot" />
          <p>
            <b>{REALMS[1].place.name}</b>
            Splashdown · {Math.abs(REALMS[1].place.lat).toFixed(1)}°S {Math.abs(REALMS[1].place.lon).toFixed(1)}°W
          </p>
        </div>
        <div data-iss className="orbit-iss">
          <Station />
        </div>
        <div data-jet className="orbit-jet">
          <Airliner />
        </div>
        <div data-gulls className="orbit-gulls">
          {[
            [0, 0],
            [26, 10],
            [-20, 14],
            [48, 22],
            [10, 30],
          ].map(([x, y], i) => (
            <svg key={i} viewBox="0 0 30 12" style={{ left: x * 1.6, top: y * 1.6, animationDelay: `${-i * 0.17}s` }}>
              <path d="M1 9Q7 1 15 8Q23 1 29 9" />
            </svg>
          ))}
        </div>
      </div>

      <div data-veil className="veil-layer">
        <i />
        <i />
      </div>
      <div data-transit className="transit">
        {Array.from({ length: SPRITES }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="stage-vignette" />
    </div>
  );
}

/** The International Space Station, roughly to scale with itself: truss, eight solar wings, radiators, modules. */
function Station() {
  const wings = [22, 60, 214, 252];
  return (
    <svg viewBox="0 0 300 130">
      <defs>
        <linearGradient id="iss-pv" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e0b766" />
          <stop offset=".45" stopColor="#8a6428" />
          <stop offset="1" stopColor="#3b2a12" />
        </linearGradient>
        <pattern id="iss-cells" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M5 0H0V5" fill="none" stroke="#2a1d0b" strokeWidth=".7" />
        </pattern>
        <linearGradient id="iss-hull" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9aa3ad" />
        </linearGradient>
      </defs>
      {wings.map((x) => (
        <g key={x}>
          <rect x={x} y="8" width="26" height="50" fill="url(#iss-pv)" />
          <rect x={x} y="8" width="26" height="50" fill="url(#iss-cells)" />
          <rect x={x} y="72" width="26" height="50" fill="url(#iss-pv)" />
          <rect x={x} y="72" width="26" height="50" fill="url(#iss-cells)" />
          <rect x={x + 12} y="56" width="2" height="18" fill="#bfc6cf" />
        </g>
      ))}
      <rect x="14" y="62" width="272" height="6" fill="url(#iss-hull)" />
      <rect x="112" y="26" width="9" height="36" fill="#eef2f6" />
      <rect x="179" y="68" width="9" height="36" fill="#eef2f6" />
      <rect x="128" y="54" width="44" height="22" rx="7" fill="url(#iss-hull)" />
      <rect x="143" y="34" width="14" height="62" rx="6" fill="url(#iss-hull)" />
      <rect x="166" y="58" width="34" height="14" rx="6" fill="url(#iss-hull)" />
      <rect x="100" y="58" width="30" height="14" rx="6" fill="#d7dde4" />
      <circle cx="150" cy="65" r="4" fill="#6c7a89" />
    </svg>
  );
}

/** A twin-engine airliner seen from above, with contrails. */
function Airliner() {
  return (
    <svg viewBox="0 0 240 90">
      <defs>
        <linearGradient id="jet-trail" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="62" y="30" width="178" height="4" rx="2" fill="url(#jet-trail)" />
      <rect x="62" y="56" width="178" height="4" rx="2" fill="url(#jet-trail)" />
      <path d="M4 45c0-3 4-6 10-6h46c6 0 10 3 10 6s-4 6-10 6H14C8 51 4 48 4 45Z" fill="#f4f6f9" />
      <path d="M30 41 52 12h8L46 41ZM30 49l22 29h8L46 49Z" fill="#dfe4ea" />
      <path d="M58 42l10-12h5l-6 12ZM58 48l10 12h5l-6-12Z" fill="#cfd6de" />
      <rect x="44" y="28" width="10" height="5" rx="2" fill="#9aa3ad" />
      <rect x="44" y="57" width="10" height="5" rx="2" fill="#9aa3ad" />
      <circle cx="9" cy="45" r="1.6" fill="#3a4654" />
    </svg>
  );
}

/** Holds the backdrop on one world while a page is mounted (pages other than home). */
export function RealmLock({ realm }: { realm: RealmKind }) {
  useEffect(() => {
    setLock(realmIndex(realm));
    return () => setLock(null);
  }, [realm]);
  return null;
}
