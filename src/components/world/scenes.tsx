import type { CSSProperties, ComponentType } from "react";
import type { RealmKind } from "./realms";

/**
 * The five worlds. Each is three things stacked:
 *   1. a CSS backdrop (the fallback, marked `fb`: hidden once the shader is live),
 *   2. a <canvas data-gl> the stage paints a procedural atmosphere into (see shaders.ts),
 *   3. crisp SVG/CSS objects on top: the things that make a place feel inhabited.
 * Scenes read `--d` (0..1 depth into the world), `--a` (0..1 arrival, 1 = settled)
 * and `--mx/--my` (pointer) from the stage. Randomness is seeded: server and browser agree.
 */

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const fx = (v: number, d = 2) => Number(v.toFixed(d));
const vars = (o: Record<string, string | number>) => o as CSSProperties;

/* ------------------------------- generators ------------------------------- */

/** A field of stars as one box-shadow list (one element, one paint). */
function starfield(seed: number, count: number, y0 = 0, y1 = 100, repeatY = 0) {
  const r = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = fx(r() * 100);
    const y = fx(y0 + r() * (y1 - y0));
    const t = r();
    const c = t < 0.12 ? "rgb(255 214 176 / .9)" : t < 0.32 ? "rgb(186 214 255 / .9)" : "rgb(255 255 255 / .85)";
    out.push(`${x}vw ${y}vh ${c}`);
    if (repeatY) out.push(`${x}vw ${fx(y + repeatY)}vh ${c}`);
  }
  return out.join(",");
}

/** Midpoint-displacement ridge: natural mountain skylines. */
function ridgePoints(seed: number, base: number, rough: number, depth = 7, falloff = 0.55) {
  const r = rng(seed);
  let pts: [number, number][] = [
    [-20, base + (r() - 0.5) * rough],
    [1620, base + (r() - 0.5) * rough],
  ];
  let disp = rough;
  for (let k = 0; k < depth; k++) {
    const next: [number, number][] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      next.push([(x0 + x1) / 2, (y0 + y1) / 2 + (r() - 0.5) * disp], [x1, y1]);
    }
    pts = next;
    disp *= falloff;
  }
  return pts;
}
const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${fx(x, 1)} ${fx(y, 1)}`).join("");
const closed = (pts: [number, number][], floor = 420) => `${line(pts)}L1620 ${floor}L-20 ${floor}Z`;

/** One three-tier pine standing on the ground between x and x+w. */
function pine(x: number, w: number, h: number, ground: (x: number) => number) {
  const cx = x + w / 2;
  const g = ground(cx);
  const pts: [number, number][] = [
    [x, ground(x)],
    [cx - w * 0.2, g - h * 0.34],
    [cx - w * 0.36, g - h * 0.34],
    [cx - w * 0.13, g - h * 0.66],
    [cx - w * 0.25, g - h * 0.66],
    [cx, g - h],
    [cx + w * 0.25, g - h * 0.66],
    [cx + w * 0.13, g - h * 0.66],
    [cx + w * 0.36, g - h * 0.34],
    [cx + w * 0.2, g - h * 0.34],
    [x + w, ground(x + w)],
  ];
  return pts.map(([a, b]) => `L${fx(a, 1)} ${fx(b, 1)}`).join("");
}

/** A rolling ground line crowded with pines, with an optional clearing. */
function treeline(seed: number, base: number, amp: number, minH: number, maxH: number, density = 0.8, glade?: [number, number]) {
  const r = rng(seed);
  const p1 = r() * 6;
  const p2 = r() * 6;
  const ground = (x: number) => base + Math.sin(x / 260 + p1) * amp + Math.sin(x / 97 + p2) * amp * 0.3;
  let d = `M-20 420L-20 ${fx(ground(-20), 1)}`;
  let x = -20;
  while (x < 1620) {
    const open = glade && x > glade[0] && x < glade[1];
    if (!open && r() < density) {
      const w = 16 + r() * 20;
      d += pine(x, w, minH + r() * (maxH - minH), ground);
      x += w;
    } else {
      x += 6 + r() * 14;
      d += `L${fx(x, 1)} ${fx(ground(x), 1)}`;
    }
  }
  return { d: `${d}L1620 420Z`, ground };
}

/** Loose stands of pines, each its own shape, on any ground line. */
function pines(seed: number, x0: number, x1: number, ground: (x: number) => number, minH: number, maxH: number) {
  const r = rng(seed);
  let d = "";
  let x = x0;
  while (x < x1) {
    const w = 18 + r() * 22;
    const g = (v: number) => ground(v) + 4;
    d += `M${fx(x, 1)} ${fx(g(x), 1)}${pine(x, w, minH + r() * (maxH - minH), g)}Z`;
    x += w * (0.5 + r() * 0.6);
  }
  return d;
}

/** Underwater surface seen from below: a wavy band that tiles seamlessly at 50%. */
function surfaceWave(y: number, amp: number, period: number) {
  let d = `M0 0V${y}`;
  for (let x = 0; x < 2880; x += period) d += `Q${x + period / 4} ${y + amp} ${x + period / 2} ${y}T${x + period} ${y}`;
  return `${d}V0Z`;
}

/** Kelp fronds: tapering ribbons that lean further the higher they reach. */
function kelp(seed: number, count: number) {
  const r = rng(seed);
  return Array.from({ length: count }, (_, j) => {
    const x = 24 + (j / count) * 300 + r() * 26;
    const H = 170 + r() * 220;
    const w0 = 6 + r() * 8;
    const amp = 10 + r() * 18;
    const ph = r() * 6;
    const left: string[] = [];
    const right: string[] = [];
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      const cx = x + Math.sin(t * 5 + ph) * amp * t;
      const y = 400 - t * H;
      const w = w0 * Math.pow(1 - t, 0.6);
      left.push(`${fx(cx - w, 1)} ${fx(y, 1)}`);
      right.unshift(`${fx(cx + w, 1)} ${fx(y, 1)}`);
    }
    return { d: `M${left.join("L")}L${right.join("L")}Z`, dur: fx(5 + r() * 4), delay: fx(-r() * 6) };
  });
}

function scatter<T>(seed: number, n: number, make: (r: () => number, i: number) => T) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => make(r, i));
}

/* --------------------------------- assets --------------------------------- */

const STARS_A = starfield(11, 170, 0, 112);
const STARS_B = starfield(12, 80, 0, 104);
const STARS_C = starfield(13, 30, 0, 90);
const SNOW = starfield(21, 70, 0, 100, 100);
const FOREST_STARS = starfield(31, 60, 0, 45);
const SKY_STARS = starfield(41, 60, 0, 34);
const AURORA_STARS = starfield(51, 130, 0, 66);
const AURORA_STARS_B = starfield(52, 26, 0, 52);
const FLAKES_A = starfield(55, 60, 0, 100, 100);
const FLAKES_B = starfield(56, 34, 0, 100, 100);

const SPARKS = scatter(14, 7, (r) => ({ left: fx(4 + r() * 92), top: fx(5 + r() * 34), s: fx(0.6 + r() * 0.9), delay: fx(-r() * 6), dur: fx(3 + r() * 4) }));

const WAVE_A = surfaceWave(70, 22, 240);
const WAVE_B = surfaceWave(86, 16, 180);
const WATERLINE = surfaceWave(40, 14, 160);

const RIDGE_FAR = closed(ridgePoints(32, 230, 180, 7, 0.52));
const TREES_MID = treeline(33, 285, 26, 50, 105, 0.7, [880, 1040]);
const TREES_NEAR = treeline(34, 330, 18, 80, 170, 0.85);
const CAMP_Y = fx(TREES_MID.ground(950), 1);

const PEAKS_FAR = ridgePoints(53, 215, 320, 6, 0.54);
const PEAKS_NEAR = ridgePoints(54, 330, 150, 6, 0.5);

const shoreY = (x: number) => 196 + 15 * Math.sin(x / 230 + 1) + 7 * Math.sin(x / 83);
const SHORE_PTS = Array.from({ length: 83 }, (_, i): [number, number] => [-20 + i * 20, shoreY(-20 + i * 20)]);
const SHORE = closed(SHORE_PTS, 360);
const SHORE_LINE = line(SHORE_PTS);
const SHORE_PINES = pines(61, -10, 400, shoreY, 60, 150) + pines(62, 980, 1250, shoreY, 46, 118) + pines(63, 1490, 1620, shoreY, 70, 150);
const CABIN_Y = fx(shoreY(1368) - 92, 1);

const BUBBLES = scatter(23, 20, (r) => ({
  left: fx(r() * 100),
  size: fx(4 + r() * r() * 22),
  dur: fx(9 + r() * 14),
  delay: fx(-r() * 22),
}));
const SPLASH = scatter(24, 26, (r) => ({ left: fx(r() * 100), top: fx(r() * 100), size: fx(5 + r() * r() * 34) }));

const school = (seed: number, n: number) =>
  scatter(seed, n, (r) => ({ x: fx(r() * 82), y: fx(r() * 84), s: fx(0.55 + r() * 0.7), delay: fx(-r() * 1.2) }));
const SCHOOL_A = school(25, 18);
const SCHOOL_B = school(26, 13);
const KELP_L = kelp(27, 7);
const KELP_R = kelp(28, 6);

const FLIES = scatter(35, 24, (r) => {
  const p = () => `${fx((r() - 0.5) * 18, 1)}vw`;
  const q = () => `${fx((r() - 0.5) * 14, 1)}vh`;
  return { left: fx(r() * 100), top: fx(42 + r() * 54), t: fx(10 + r() * 12), b: fx(2 + r() * 3), delay: fx(-r() * 12), x1: p(), y1: q(), x2: p(), y2: q(), x3: p(), y3: q() };
});
const LEAVES = scatter(36, 9, (r) => ({ left: fx(r() * 100), dur: fx(13 + r() * 12), delay: fx(-r() * 24), s: fx(0.7 + r() * 0.8), hue: Math.floor(r() * 3) }));

type Cloud = { x: number; y: number; w: number; dur: number; delay: number };
const WISPS = scatter<Cloud>(42, 8, (r) => ({ x: fx(-20 + r() * 100), y: fx(90 + r() * 300), w: fx(48 + r() * 40), dur: fx(36 + r() * 40), delay: fx(-r() * 40) }));
const FLOCK = [[0, 0], [9, 5], [-9, 5], [18, 10], [-18, 10], [27, 16], [-25, 15]] as const;
const FAR_BIRDS = scatter(43, 5, (r) => ({ x: fx(r() * 60), y: fx(r() * 30), delay: fx(-r()) }));

const ENVELOPE = "M50 3C23 3 5 24 5 50c0 27 26 47 37 67h16c11-20 37-40 37-67C95 24 77 3 50 3Z";
const BIRD = "M1 6Q4.5 0 8 5Q11.5 0 15 6";
const FISH = "M0 6C6 0 16 0 22 6 16 12 6 12 0 6ZM21 6l8-5v10Z";
const WHALE =
  "M30 118C70 70 190 48 320 58c100 8 180 34 228 50l62-46c-4 30-14 46-30 56 18 6 30 20 36 50l-70-40c-66 22-146 38-226 38-120 2-230-6-290-48ZM210 160c22 40 70 54 100 36-28-10-60-24-74-40ZM400 62c12-18 28-20 36-12l4 18Z";

/* --------------------------------- pieces --------------------------------- */

function Stars({ shadow, className = "" }: { shadow: string; className?: string }) {
  return <div className={`w-stars ${className}`} style={{ boxShadow: shadow }} />;
}

/** The surface the stage paints this world's atmosphere into. */
const Atmosphere = () => <canvas data-gl className="scene-gl" />;

function Jelly({ id, className }: { id: string; className: string }) {
  return (
    <div className={`oc-jelly ${className}`}>
      <svg viewBox="0 0 120 230" fill="none">
        <defs>
          <radialGradient id={id} cx="50%" cy="30%" r="70%">
            <stop offset="0" stopColor="#ffe3ff" stopOpacity=".95" />
            <stop offset=".45" stopColor="#d08bff" stopOpacity=".5" />
            <stop offset="1" stopColor="#7b5cff" stopOpacity=".05" />
          </radialGradient>
        </defs>
        <g className="tent" stroke="#f0c6ff" strokeOpacity=".5" strokeWidth="1.3" strokeLinecap="round">
          <path d="M32 64c-6 30 8 52-2 86s6 50 0 74" />
          <path d="M50 66c-4 32 8 50 0 82s4 40 0 58" />
          <path d="M70 66c4 32-8 50 0 82s-4 40 0 62" />
          <path d="M88 64c6 30-8 52 2 86s-6 46 0 70" />
          <path d="M60 64c0 40 4 70 0 110" strokeOpacity=".3" strokeWidth="3" />
        </g>
        <g className="bell">
          <path d="M8 64C8 18 112 18 112 64c-6 6-12-2-18 4s-12-4-18 2-12-4-16 2-12-6-18-2-12-6-18-2S14 58 8 64Z" fill={`url(#${id})`} />
          <path d="M22 50c8-20 40-30 64-14" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

function School({ fish, className }: { fish: typeof SCHOOL_A; className: string }) {
  return (
    <div className={`oc-school ${className}`}>
      {fish.map((f, i) => (
        <svg key={i} viewBox="0 0 30 12" style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${fx(f.s * 26)}px`, animationDelay: `${f.delay}s` }}>
          <path d={FISH} />
        </svg>
      ))}
    </div>
  );
}

function Kelp({ fronds, className }: { fronds: typeof KELP_L; className: string }) {
  return (
    <svg className={`oc-kelp ${className}`} viewBox="0 0 360 400" preserveAspectRatio="xMidYMax meet">
      {fronds.map((f, i) => (
        <path key={i} d={f.d} style={{ animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }} />
      ))}
    </svg>
  );
}

function Balloon({ id, a, b, className }: { id: string; a: string; b: string; className: string }) {
  return (
    <div className={`sk-balloon ${className}`}>
      <svg viewBox="0 0 100 146">
        <defs>
          <clipPath id={`${id}-c`}>
            <path d={ENVELOPE} />
          </clipPath>
          <linearGradient id={`${id}-s`} x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".38" />
            <stop offset=".42" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#1a0b2e" stopOpacity=".6" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${id}-c)`}>
          <rect width="100" height="122" fill={a} />
          <ellipse cx="50" cy="54" rx="43" ry="72" fill={b} />
          <ellipse cx="50" cy="54" rx="27" ry="72" fill={a} />
          <ellipse cx="50" cy="54" rx="10" ry="72" fill={b} />
          <rect y="92" width="100" height="5" fill="#fff" opacity=".28" />
          <rect width="100" height="122" fill={`url(#${id}-s)`} />
        </g>
        <path d="M43 117l3.5 15M57 117l-3.5 15M50 118v14" stroke="#2a1838" strokeWidth=".9" />
        <rect x="44.5" y="132" width="11" height="9" rx="1.6" fill="#3d2433" />
        <rect x="44.5" y="132" width="11" height="2.4" rx="1.2" fill="#5c3a48" />
      </svg>
    </div>
  );
}

/* --------------------------------- scenes --------------------------------- */

function Cosmos() {
  return (
    <>
      <div className="cos-bg" />
      <div className="cos-nebula fb" />
      <Atmosphere />
      <div className="cos-starfield fb w-par-1">
        <Stars shadow={STARS_A} />
        <Stars shadow={STARS_B} className="w-stars-b" />
        <Stars shadow={STARS_C} className="w-stars-c" />
      </div>
      <div className="cos-sparks w-par-2">
        {SPARKS.map((s, i) => (
          <i key={i} style={vars({ left: `${s.left}%`, top: `${s.top}%`, "--s": s.s, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` })} />
        ))}
      </div>
      <span className="cos-shoot" />
      <span className="cos-shoot cos-shoot-b" />
    </>
  );
}

function Ocean() {
  return (
    <>
      <div className="oc-water" />
      <Atmosphere />
      <div className="oc-surface w-par-1">
        <svg viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d={WAVE_A} />
        </svg>
        <svg viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d={WAVE_B} />
        </svg>
      </div>
      <div className="oc-whale w-par-1">
        <svg viewBox="0 0 640 220">
          <path d={WHALE} />
        </svg>
      </div>
      <School fish={SCHOOL_B} className="oc-school-b" />
      <div className="oc-snow w-par-2">
        <Stars shadow={SNOW} />
      </div>
      <School fish={SCHOOL_A} className="oc-school-a" />
      <div className="oc-bubbles">
        {BUBBLES.map((b, i) => (
          <i key={i} style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
        ))}
      </div>
      <div className="oc-deep">
        <Jelly id="jelly-a" className="oc-jelly-a w-par-3" />
        <Jelly id="jelly-b" className="oc-jelly-b w-par-2" />
      </div>
      <Kelp fronds={KELP_L} className="oc-kelp-l w-par-3" />
      <Kelp fronds={KELP_R} className="oc-kelp-r w-par-3" />
      {/* arrival: you hit the water from above, and the surface sweeps up past you */}
      <div className="oc-air">
        <div className="oc-air-sky" />
        <svg viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d={WATERLINE} />
        </svg>
      </div>
      <div className="oc-splash">
        {SPLASH.map((b, i) => (
          <i key={i} style={{ left: `${b.left}%`, top: `${b.top}%`, width: b.size, height: b.size }} />
        ))}
      </div>
    </>
  );
}

function Forest() {
  return (
    <>
      <div className="fo-sky" />
      <Atmosphere />
      <Stars shadow={FOREST_STARS} className="fo-stars" />
      <div className="fo-moon w-par-1" data-anchor />
      <div className="fo-birds">
        {FAR_BIRDS.map((b, i) => (
          <svg key={i} viewBox="0 0 16 8" style={{ left: `${b.x}%`, top: `${b.y}%`, animationDelay: `${b.delay}s` }}>
            <path d={BIRD} />
          </svg>
        ))}
      </div>
      <div className="fo-layer fo-l1 w-par-1">
        <svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice">
          <path d={RIDGE_FAR} />
        </svg>
      </div>
      <div className="fo-mist fo-m1 fb" />
      <div className="fo-layer fo-l2 w-par-2">
        <svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice">
          <defs>
            <radialGradient id="fire-glow">
              <stop offset="0" stopColor="#ffb347" stopOpacity=".55" />
              <stop offset=".4" stopColor="#ff8a3d" stopOpacity=".16" />
              <stop offset="1" stopColor="#ff8a3d" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="tent-lit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffb347" stopOpacity=".25" />
              <stop offset="1" stopColor="#ffd98a" stopOpacity=".95" />
            </linearGradient>
          </defs>
          <path d={TREES_MID.d} />
          {/* a camp in the clearing: someone is home */}
          <g className="fo-camp" transform={`translate(906 ${fx(CAMP_Y - 58, 1)})`}>
            <circle className="glow" cx="78" cy="52" r="70" fill="url(#fire-glow)" />
            <path d="M4 60 34 12 64 60Z" fill="#0b1711" />
            <path d="M34 12v-7" stroke="#0b1711" strokeWidth="1.6" />
            <path d="M27 60 34 30 41 60Z" fill="url(#tent-lit)" />
            <path d="M68 60l20-3M70 56l17 5" stroke="#1c0f08" strokeWidth="2.4" strokeLinecap="round" />
            <path className="flame" d="M78 58c-6-6-3-13 0-18 3 5 6 12 0 18Z" fill="#ffb347" />
            <path className="flame flame-b" d="M78 58c-3-3-2-7 0-10 2 3 3 7 0 10Z" fill="#fff3b8" />
            <circle className="ember" cx="76" cy="40" r="1" fill="#ffd98a" />
            <circle className="ember ember-b" cx="81" cy="38" r=".8" fill="#ffb347" />
          </g>
        </svg>
      </div>
      <div className="fo-mist fo-m2 fb" />
      <div className="fo-layer fo-l3 w-par-3">
        <svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice">
          <path d={TREES_NEAR.d} />
        </svg>
      </div>
      <div className="fo-flies">
        {FLIES.map((f, i) => (
          <i
            key={i}
            style={vars({
              left: `${f.left}%`,
              top: `${f.top}%`,
              "--t": `${f.t}s`,
              "--b": `${f.b}s`,
              animationDelay: `${f.delay}s, ${fx(f.delay / 3)}s`,
              "--x1": f.x1, "--y1": f.y1, "--x2": f.x2, "--y2": f.y2, "--x3": f.x3, "--y3": f.y3,
            })}
          />
        ))}
      </div>
      <div className="fo-leaves">
        {LEAVES.map((l, i) => (
          <i key={i} data-hue={l.hue} style={vars({ left: `${l.left}%`, "--s": l.s, animationDuration: `${l.dur}s`, animationDelay: `${l.delay}s` })} />
        ))}
      </div>
    </>
  );
}

function Sky() {
  return (
    <>
      <div className="sk-bg" />
      <div className="sk-sun fb" />
      <div className="sk-sea fb" />
      <Atmosphere />
      <Stars shadow={SKY_STARS} className="sk-stars" />
      <div className="sk-flock">
        {FLOCK.map(([x, y], i) => (
          <svg key={i} viewBox="0 0 16 8" style={{ left: `${x * 2.2 + 60}px`, top: `${y * 2.2}px`, animationDelay: `${-i * 0.13}s` }}>
            <path d={BIRD} />
          </svg>
        ))}
      </div>
      <div className="sk-drift w-par-2">
        <Balloon id="bl-a" a="#ff8f6b" b="#ffd9a8" className="sk-b1" />
        <Balloon id="bl-b" a="#8a6bff" b="#d5c6ff" className="sk-b2" />
        <Balloon id="bl-c" a="#ff6b9a" b="#ffd0de" className="sk-b3" />
        <Balloon id="bl-d" a="#3fc7d6" b="#d4fbff" className="sk-b4" />
      </div>
      <div className="sk-plane">
        <i />
        <svg viewBox="0 0 64 48">
          <path d="M2 22 62 2 40 46 30 30Z" fill="#fff" />
          <path d="M62 2 30 30l-3 14 9-8" fill="#d6c2ea" />
          <path d="M62 2 30 30" stroke="#b79fd6" strokeWidth=".8" />
        </svg>
      </div>
      <div className="sk-layer w-par-3">
        {WISPS.map((c, i) => (
          <i key={i} className="cloud" style={{ left: `${c.x}vw`, top: `${c.y}vh`, width: `${c.w}vw`, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }} />
        ))}
      </div>
      <div className="sk-night" />
      {/* arrival: you climb up through a deck of cloud */}
      <div className="sk-punch">
        <i />
        <i />
        <i />
        <i />
      </div>
    </>
  );
}

function Aurora() {
  return (
    <>
      <div className="au-bg" />
      <Atmosphere />
      <div className="au-starfield w-par-1">
        <Stars shadow={AURORA_STARS} />
        <Stars shadow={AURORA_STARS_B} className="w-stars-c" />
      </div>
      <div className="au-lights fb">
        <i className="au-a" />
        <i className="au-b" />
        <i className="au-c" />
      </div>
      <span className="cos-shoot au-shoot" />
      {/* the far range, and its reflection in the lake */}
      <div className="au-peaks au-mirror w-par-1">
        <svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice">
          <path d={closed(PEAKS_FAR)} />
        </svg>
      </div>
      <div className="au-peaks au-p1 w-par-1">
        <svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="peak-far" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1c3a57" />
              <stop offset=".55" stopColor="#0a1f33" />
              <stop offset="1" stopColor="#051423" />
            </linearGradient>
            <linearGradient id="peak-near" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0d2238" />
              <stop offset="1" stopColor="#040d18" />
            </linearGradient>
          </defs>
          <path d={closed(PEAKS_FAR)} fill="url(#peak-far)" />
          <path d={line(PEAKS_FAR)} className="snow" />
          <path d={closed(PEAKS_NEAR)} fill="url(#peak-near)" />
          <path d={line(PEAKS_NEAR)} className="snow snow-b" />
        </svg>
      </div>
      {/* the near shore: snow, pines, and a cabin with the lights on */}
      <div className="au-shore w-par-3">
        <svg viewBox="0 0 1600 340" preserveAspectRatio="xMaxYMax slice">
          <defs>
            <linearGradient id="shore-snow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1b3b58" />
              <stop offset=".35" stopColor="#0b1d30" />
              <stop offset="1" stopColor="#030912" />
            </linearGradient>
            <radialGradient id="cabin-glow">
              <stop offset="0" stopColor="#ffcf7a" stopOpacity=".5" />
              <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d={SHORE_PINES} className="pines" />
          <path d={SHORE} fill="url(#shore-snow)" />
          <path d={SHORE_LINE} className="snow" />
          <g transform={`translate(1300 ${CABIN_Y})`}>
            <ellipse cx="60" cy="96" rx="120" ry="20" fill="url(#cabin-glow)" />
            <circle cx="36" cy="66" r="44" fill="url(#cabin-glow)" />
            <g className="smoke">
              <circle cx="103" cy="18" r="6" />
              <circle cx="103" cy="18" r="6" />
              <circle cx="103" cy="18" r="6" />
            </g>
            <rect x="96" y="22" width="12" height="22" fill="#070c15" />
            <rect x="94" y="19" width="16" height="5" rx="2" fill="#cfe3f5" opacity=".85" />
            <rect x="14" y="52" width="100" height="44" fill="#080d16" />
            <path d="M14 62h100M14 73h100M14 84h100" stroke="#0f1826" strokeWidth="1.2" />
            <path d="M4 56 64 16l60 40Z" fill="#0a111c" />
            <path d="M4 56 64 16l60 40-7 3L64 25 11 59Z" fill="#d8e9f8" opacity=".9" />
            <rect x="26" y="62" width="22" height="20" rx="1.5" fill="#ffcf7a" className="window" />
            <path d="M37 62v20M26 72h22" stroke="#6b4a1e" strokeWidth="1.4" />
            <rect x="78" y="64" width="18" height="32" rx="1.5" fill="#1b130a" />
            <circle cx="92" cy="81" r="1.2" fill="#ffcf7a" />
          </g>
        </svg>
      </div>
      <div className="au-snow">
        <Stars shadow={FLAKES_A} />
        <Stars shadow={FLAKES_B} className="w-stars-c" />
      </div>
      {/* arrival: a flurry that clears as the lights wake */}
      <div className="au-flurry" />
    </>
  );
}

export const SCENES: Record<RealmKind, ComponentType> = {
  cosmos: Cosmos,
  ocean: Ocean,
  forest: Forest,
  sky: Sky,
  aurora: Aurora,
};
