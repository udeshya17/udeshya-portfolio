import type { ShapeKind } from "../universes";

/**
 * Procedural point clouds. Every generator returns exactly `n` xyz triplets,
 * roughly fitting inside a radius-3 sphere so universes can morph into one another.
 */

type Vec3 = [number, number, number];

// Deterministic PRNG so shapes are identical between renders.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number) {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

function onSphere(rand: () => number, r: number): Vec3 {
  const u = rand() * 2 - 1;
  const t = rand() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(t) * r, u * r, s * Math.sin(t) * r];
}

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

function fill(n: number, gen: (i: number) => Vec3): Float32Array {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = gen(i);
    out[i * 3] = p[0];
    out[i * 3 + 1] = p[1];
    out[i * 3 + 2] = p[2];
  }
  return out;
}

/* --------------------------------- shapes --------------------------------- */

function galaxy(n: number) {
  const rand = mulberry32(1);
  const arms = 4;
  return fill(n, (i) => {
    const r = Math.pow(rand(), 1.2) * 2.9 + 1.5; // dust lanes around the raytraced black hole
    const branch = ((i % arms) / arms) * Math.PI * 2;
    const spin = r * 1.55;
    const spread = 0.38 * Math.pow(r / 3.5, 0.8);
    const rx = Math.pow(rand(), 3) * (rand() < 0.5 ? 1 : -1) * spread * 2.2;
    const ry = gauss(rand) * 0.06 * (1.2 - r / 3.6);
    const rz = Math.pow(rand(), 3) * (rand() < 0.5 ? 1 : -1) * spread * 2.2;
    return [Math.cos(branch + spin) * r + rx, ry, Math.sin(branch + spin) * r + rz];
  });
}

function planet(n: number) {
  const rand = mulberry32(2);
  return fill(n, (i) => {
    if (i % 100 < 52) {
      const p = onSphere(rand, 1.35 + gauss(rand) * 0.015);
      return p;
    }
    if (i % 100 < 56) {
      // tiny moon
      const p = onSphere(rand, 0.18);
      return [p[0] + 2.9, p[1] + 0.9, p[2] - 0.6];
    }
    const band = rand();
    const r = band < 0.55 ? 1.9 + rand() * 0.55 : 2.6 + rand() * 0.45;
    const a = rand() * Math.PI * 2;
    return [Math.cos(a) * r, gauss(rand) * 0.018, Math.sin(a) * r];
  });
}

/** Centres + radii of the bubble universes (shared with the glass set piece). */
export function multiverseBubbles(): { c: Vec3; r: number }[] {
  const bubbles: { c: Vec3; r: number }[] = [{ c: [0, 0, 0], r: 0.95 }];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    bubbles.push({
      c: [Math.cos(a) * 2.55, Math.sin(k * 1.7) * 0.9, Math.sin(a) * 1.6],
      r: 0.38 + ((k * 37) % 5) * 0.09,
    });
  }
  return bubbles;
}

function multiverse(n: number) {
  const rand = mulberry32(3);
  const bubbles = multiverseBubbles();
  const weights = bubbles.map((b) => b.r * b.r);
  const total = weights.reduce((s, w) => s + w, 0);
  return fill(n, () => {
    if (rand() < 0.1) {
      // bridges between the core universe and its neighbours
      const b = bubbles[1 + Math.floor(rand() * 6)];
      const p = lerp3([0, 0, 0], b.c, rand());
      return [p[0] + gauss(rand) * 0.02, p[1] + gauss(rand) * 0.02, p[2] + gauss(rand) * 0.02];
    }
    let pick = rand() * total;
    let idx = 0;
    while (pick > weights[idx] && idx < bubbles.length - 1) pick -= weights[idx++];
    const b = bubbles[idx];
    const s = onSphere(rand, b.r);
    return [b.c[0] + s[0], b.c[1] + s[1], b.c[2] + s[2]];
  });
}

function neural(n: number) {
  const rand = mulberry32(4);
  const nodes: Vec3[] = [];
  const count = 150;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    const R = 2.3 + gauss(rand) * 0.12;
    nodes.push([Math.cos(t) * r * R, y * R, Math.sin(t) * r * R]);
  }
  const edges: [Vec3, Vec3][] = [];
  nodes.forEach((a, i) => {
    const near = nodes
      .map((b, j) => ({ j, d: (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 }))
      .filter((x) => x.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 3);
    near.forEach(({ j }) => j > i && edges.push([a, nodes[j]]));
  });
  return fill(n, () => {
    const r = rand();
    if (r < 0.28) {
      const c = nodes[Math.floor(rand() * nodes.length)];
      return [c[0] + gauss(rand) * 0.045, c[1] + gauss(rand) * 0.045, c[2] + gauss(rand) * 0.045];
    }
    if (r < 0.85) {
      const [a, b] = edges[Math.floor(rand() * edges.length)];
      return lerp3(a, b, rand());
    }
    const p = onSphere(rand, Math.cbrt(rand()) * 1.1);
    return p;
  });
}

function dna(n: number) {
  const rand = mulberry32(5);
  const turns = 3.2;
  const H = 6.4;
  const R = 1.05;
  const rungs = 46;
  return fill(n, () => {
    let p: Vec3;
    if (rand() < 0.68) {
      const t = rand();
      const a = t * Math.PI * 2 * turns + (rand() < 0.5 ? 0 : Math.PI);
      p = [
        Math.cos(a) * R + gauss(rand) * 0.05,
        (t - 0.5) * H + gauss(rand) * 0.05,
        Math.sin(a) * R + gauss(rand) * 0.05,
      ];
    } else {
      const k = Math.floor(rand() * rungs);
      const t = (k + 0.5) / rungs;
      const a = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * H;
      p = lerp3([Math.cos(a) * R, y, Math.sin(a) * R], [Math.cos(a + Math.PI) * R, y, Math.sin(a + Math.PI) * R], rand());
    }
    return p;
  });
}

function wormhole(n: number) {
  const rand = mulberry32(6);
  const rings = 34;
  const meridians = 40;
  return fill(n, () => {
    let v: number;
    let a: number;
    if (rand() < 0.62) {
      v = (Math.floor(rand() * rings) / (rings - 1)) * 2 - 1;
      a = rand() * Math.PI * 2;
    } else {
      v = rand() * 2 - 1;
      a = (Math.floor(rand() * meridians) / meridians) * Math.PI * 2;
    }
    const r = 0.32 + 2.5 * v * v;
    return [Math.cos(a) * r, v * 2.6, Math.sin(a) * r];
  });
}

function tree(n: number) {
  const rand = mulberry32(7);
  type Seg = { a: Vec3; b: Vec3; w: number };
  const segs: Seg[] = [];
  const tips: Vec3[] = [];

  const rotate = (d: Vec3, angle: number, axis: Vec3): Vec3 => {
    // Rodrigues' rotation
    const [kx, ky, kz] = axis;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const dot = kx * d[0] + ky * d[1] + kz * d[2];
    return [
      d[0] * c + (ky * d[2] - kz * d[1]) * s + kx * dot * (1 - c),
      d[1] * c + (kz * d[0] - kx * d[2]) * s + ky * dot * (1 - c),
      d[2] * c + (kx * d[1] - ky * d[0]) * s + kz * dot * (1 - c),
    ];
  };
  const norm = (v: Vec3): Vec3 => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };

  const grow = (from: Vec3, dir: Vec3, len: number, w: number, depth: number) => {
    const to: Vec3 = [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len];
    segs.push({ a: from, b: to, w });
    if (depth >= 7) {
      tips.push(to);
      return;
    }
    const kids = depth === 0 ? 3 : rand() < 0.35 ? 3 : 2;
    for (let k = 0; k < kids; k++) {
      const axis = norm([rand() - 0.5, rand() * 0.2 - 0.1, rand() - 0.5]);
      const angle = 0.35 + rand() * 0.45;
      const nd = norm(rotate(dir, angle, axis));
      nd[1] += 0.18; // phototropism
      grow(to, norm(nd), len * (0.68 + rand() * 0.1), w * 0.66, depth + 1);
    }
  };
  grow([0, -3, 0], [0, 1, 0], 1.45, 0.2, 0);

  const segWeights = segs.map((s) => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]) * (0.4 + s.w * 4));
  const total = segWeights.reduce((s, w) => s + w, 0);

  return fill(n, () => {
    if (rand() < 0.4) {
      let pick = rand() * total;
      let idx = 0;
      while (pick > segWeights[idx] && idx < segs.length - 1) pick -= segWeights[idx++];
      const s = segs[idx];
      const p = lerp3(s.a, s.b, rand());
      const o = onSphere(rand, s.w * Math.sqrt(rand()));
      return [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
    }
    const tip = tips[Math.floor(rand() * tips.length)];
    const o = onSphere(rand, Math.abs(gauss(rand)) * 0.34);
    return [tip[0] + o[0], tip[1] + o[1] + 0.05, tip[2] + o[2]];
  });
}

function waves(n: number) {
  const rand = mulberry32(8);
  const rows = 64;
  return fill(n, () => {
    const x = (rand() * 2 - 1) * 6.2;
    const z = (Math.floor(rand() * rows) / (rows - 1)) * 2 - 1;
    const zz = z * 3.6;
    const y = 0.28 * Math.sin(x * 0.7 + zz * 0.5) * Math.cos(zz * 0.8);
    return [x, y, zz];
  });
}

function text(n: number, lines: string[], fontFamily: string) {
  const rand = mulberry32(9);
  const W = 1200;
  const H = 520;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return galaxy(n);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = 220;
  ctx.font = `800 ${size}px ${fontFamily}`;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 0.95));
  const { data } = ctx.getImageData(0, 0, W, H);
  const pts: [number, number][] = [];
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      if (data[(y * W + x) * 4 + 3] > 140) pts.push([x, y]);
    }
  }
  if (!pts.length) return galaxy(n);
  const scale = 6.6 / W;
  return fill(n, () => {
    const p = pts[Math.floor(rand() * pts.length)];
    return [
      (p[0] - W / 2 + (rand() - 0.5) * 3) * scale,
      -(p[1] - H / 2 + (rand() - 0.5) * 3) * scale,
      gauss(rand) * 0.06,
    ];
  });
}

/** Deterministic random floats in [0,1). */
export function randoms(n: number, seed: number) {
  const rand = mulberry32(seed);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rand();
  return out;
}

/** Large, random shell used for the "big bang" intro. */
export function scatter(n: number) {
  const rand = mulberry32(10);
  return fill(n, () => onSphere(rand, 9 + rand() * 14));
}

export function buildShape(kind: ShapeKind, n: number, fontFamily = "sans-serif"): Float32Array {
  switch (kind) {
    case "galaxy":
      return galaxy(n);
    case "planet":
      return planet(n);
    case "multiverse":
      return multiverse(n);
    case "neural":
      return neural(n);
    case "dna":
      return dna(n);
    case "wormhole":
      return wormhole(n);
    case "tree":
      return tree(n);
    case "waves":
      return waves(n);
    case "text":
      return text(n, ["LET'S", "TALK"], fontFamily);
  }
}
