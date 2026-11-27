"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer } from "@react-three/postprocessing";
import type { ChromaticAberrationEffect } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { LOADER_DONE_EVENT, scrollState } from "../scroll/scrollState";
import { UNIVERSES } from "../universes";
import { SetPieces, StudioEnvironment } from "./SetPieces";
import Horizon from "./Horizon";
import ProjectGallery from "./ProjectGallery";
import { buildShape, randoms, scatter } from "./shapes";

/* --------------------------------- shaders -------------------------------- */

const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uMorph;
uniform float uIntro;
uniform float uSize;
uniform float uPixelRatio;
uniform float uWave;
uniform float uOpacity;
uniform float uAspect;
uniform vec2 uMouse;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec3 aScatter;
attribute float aRand;

varying vec3 vColor;
varying float vAlpha;
varying float vBlur;

void main() {
  // staggered, eased morph between the two neighbouring universes
  float t = clamp(uMorph * 1.45 - aRand * 0.45, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 p = mix(aFrom, aTo, t);

  // particles burst outward mid-transition, then settle into the new form
  vec3 dir = normalize(aScatter);
  p += dir * sin(t * 3.14159) * (0.55 + aRand * 1.1);

  // ocean
  p.y += uWave * (
      sin(p.x * 1.1 + uTime * 1.3) * 0.22
    + sin(p.z * 1.6 - uTime * 1.05) * 0.15
    + sin((p.x + p.z) * 0.55 + uTime * 0.6) * 0.28);

  // idle shimmer, the universe is always breathing
  p += 0.035 * vec3(
    sin(uTime * 0.9 + aRand * 40.0),
    cos(uTime * 0.7 + aRand * 23.0),
    sin(uTime * 0.8 + aRand * 17.0));

  // hot core: particles near the centre take the third colour
  float core = smoothstep(1.7, 0.0, length(p)) * 0.9;

  // big-bang intro: from a far-away shell into the first universe
  float it = clamp(uIntro * 1.35 - aRand * 0.35, 0.0, 1.0);
  it = 1.0 - pow(1.0 - it, 3.0);
  p = mix(aScatter, p, it);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);

  // cursor repulsion, computed in screen space
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 d = ndc - uMouse;
  d.x *= uAspect;
  float force = smoothstep(0.3, 0.0, length(d)) * uIntro;
  mv.xy += normalize(d + 1e-5) * force * 0.6;

  gl_Position = projectionMatrix * mv;
  // cinematic depth of field: crisp at the focal plane, soft bokeh in front and behind
  float blur = clamp(abs(-mv.z - 9.0) / 4.5, 0.0, 1.0);
  vBlur = blur;
  gl_PointSize = uSize * (0.38 + aRand * 0.8) * (1.0 + blur * 2.2) * (1.0 + force * 0.9) * uPixelRatio / -mv.z;

  float h = clamp(0.5 + p.y * 0.2 + (aRand - 0.5) * 0.65, 0.0, 1.0);
  vColor = mix(mix(uColorA, uColorB, h), uColorC, core) + force * 0.35;
  vAlpha = uOpacity * (0.5 + aRand * 0.5) * (0.35 + 0.65 * it) / (1.0 + blur * 3.0);
}
`;

const particleFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vBlur;
void main() {
  float d = length(gl_PointCoord - 0.5);
  // in focus: a bright pin-point with a soft halo; out of focus: an even bokeh disc
  float sharp = pow(smoothstep(0.5, 0.0, d), 2.4) + smoothstep(0.12, 0.0, d) * 0.8;
  float bokeh = smoothstep(0.5, 0.42, d) * 0.55 + smoothstep(0.5, 0.46, d) * 0.25;
  float a = mix(sharp, bokeh, vBlur);
  gl_FragColor = vec4(vColor * (0.6 + a * 0.8), a * vAlpha);
  #include <colorspace_fragment>
}
`;

const starVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uWarp;
attribute float aRand;
varying float vTw;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vTw = 0.45 + 0.55 * sin(uTime * (0.6 + aRand * 2.2) + aRand * 60.0);
  gl_PointSize = (0.8 + aRand * 2.4) * (1.0 + uWarp * 1.5) * uPixelRatio * 60.0 / -mv.z;
}
`;

const starFragment = /* glsl */ `
varying float vTw;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), a * vTw * 0.9);
  #include <colorspace_fragment>
}
`;

/* -------------------------------- helpers --------------------------------- */

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
const tmpC = new THREE.Color();
const colors = UNIVERSES.map((u) => u.colors.map((c) => new THREE.Color(c)) as [THREE.Color, THREE.Color, THREE.Color]);
const bgs = UNIVERSES.map((u) => new THREE.Color(u.bg));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Pointer for parallax: 0 when the pointer is off-screen (sentinel 9). */
const tiltOf = (v: number) => (Math.abs(v) > 1 ? 0 : v);
const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/* ------------------------------- particles -------------------------------- */

function MorphParticles({ shapes, count, lite }: { shapes: Float32Array[]; count: number; lite: boolean }) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);
  const state = useRef({ morph: 0, from: -1, to: -1, intro: 0, introTarget: 0 });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const rand = randoms(count, 11);
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aFrom", new THREE.BufferAttribute(shapes[0].slice(), 3));
    g.setAttribute("aTo", new THREE.BufferAttribute(shapes[1].slice(), 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(scatter(count), 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    return g;
  }, [shapes, count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: 0 },
          uIntro: { value: 0 },
          uSize: { value: 30 },
          uPixelRatio: { value: 1 },
          uWave: { value: 0 },
          uOpacity: { value: 1 },
          uAspect: { value: 1 },
          uMouse: { value: new THREE.Vector2(9, 9) },
          uColorA: { value: colors[0][0].clone() },
          uColorB: { value: colors[0][1].clone() },
          uColorC: { value: colors[0][2].clone() },
        },
      }),
    [],
  );

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useEffect(() => {
    const start = () => (state.current.introTarget = 1);
    if (scrollState.introDone) start();
    window.addEventListener(LOADER_DONE_EVENT, start);
    return () => window.removeEventListener(LOADER_DONE_EVENT, start);
  }, []);

  useFrame(({ size, gl, scene }, rawDt) => {
    const pts = points.current;
    if (!pts) return;
    const material = pts.material as THREE.ShaderMaterial;
    const geometry = pts.geometry;
    const dt = Math.min(rawDt, 0.05);
    const s = state.current;
    const u = material.uniforms;
    const last = UNIVERSES.length - 1;

    s.morph = damp(s.morph, Math.min(scrollState.lock ?? scrollState.morph, last), scrollState.lock !== null ? 1.6 : 3.2, dt);
    s.intro = damp(s.intro, s.introTarget, 1.1, dt);
    const from = Math.min(Math.floor(s.morph), last);
    const to = Math.min(from + 1, last);
    const local = s.morph - from;
    scrollState.sceneMorph = s.morph;

    if (from !== s.from || to !== s.to) {
      (geometry.attributes.aFrom.array as Float32Array).set(shapes[from]);
      (geometry.attributes.aTo.array as Float32Array).set(shapes[to]);
      geometry.attributes.aFrom.needsUpdate = true;
      geometry.attributes.aTo.needsUpdate = true;
      s.from = from;
      s.to = to;
    }

    const A = UNIVERSES[from];
    const B = UNIVERSES[to];
    const aspect = size.width / size.height;
    const portrait = aspect < 1;
    const k = local * local * (3 - 2 * local);

    u.uTime.value += dt;
    u.uMorph.value = local;
    u.uIntro.value = s.intro;
    u.uAspect.value = aspect;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uSize.value = portrait ? 34 : 30;
    u.uWave.value = lerp(A.wave ?? 0, B.wave ?? 0, k);
    u.uOpacity.value = (portrait ? 0.6 : 1) * lerp(A.dim, B.dim, k);
    u.uMouse.value.set(scrollState.pointer.x, scrollState.pointer.y);
    u.uColorA.value.copy(tmpA.copy(colors[from][0]).lerp(colors[to][0], k));
    u.uColorB.value.copy(tmpB.copy(colors[from][1]).lerp(colors[to][1], k));
    u.uColorC.value.copy(tmpC.copy(colors[from][2]).lerp(colors[to][2], k));

    if (scene.background instanceof THREE.Color) {
      scene.background.copy(bgs[from]).lerp(bgs[to], k);
    }

    if (outer.current && inner.current) {
      const xFactor = portrait ? 0 : Math.min(1, aspect / 1.7);
      const oA = portrait && A.mOffset ? A.mOffset : A.offset;
      const oB = portrait && B.mOffset ? B.mOffset : B.offset;
      const fA = portrait && A.mOffset ? 1 : xFactor;
      const fB = portrait && B.mOffset ? 1 : xFactor;
      outer.current.position.set(
        lerp(oA[0] * fA, oB[0] * fB, k),
        lerp(oA[1], oB[1], k),
        lerp(oA[2], oB[2], k),
      );
      outer.current.rotation.x = lerp(A.tilt[0], B.tilt[0], k) + tiltOf(scrollState.pointer.y) * 0.12;
      outer.current.rotation.z = lerp(A.tilt[1], B.tilt[1], k);
      outer.current.rotation.y = tiltOf(scrollState.pointer.x) * 0.2;
      const halfW = Math.tan((45 * Math.PI) / 360) * 9 * aspect;
      scrollState.sceneX = Math.min(1, Math.max(0, 0.5 + outer.current.position.x / (2 * halfW)));
      const sA = portrait ? (A.mScale ?? A.scale * 0.72) : A.scale;
      const sB = portrait ? (B.mScale ?? B.scale * 0.72) : B.scale;
      const sc = lerp(sA, sB, k);
      outer.current.scale.setScalar(sc);
      inner.current.rotation.y += dt * lerp(A.spin, B.spin, k) + scrollState.velocity * 0.0009;
      // contact text and ocean face the camera; ease spin back to 0
      if (lerp(A.spin, B.spin, k) < 0.01) {
        const TAU = Math.PI * 2;
        const wrapped = ((((inner.current.rotation.y + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
        inner.current.rotation.y = damp(wrapped, 0, 2, dt);
      }
    }
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
        <SetPieces lite={lite} />
      </group>
    </group>
  );
}

/* --------------------------------- stars ---------------------------------- */

function Stars({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const warp = useRef(0);

  const [geometry, material] = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const rnd = randoms(count, 21);
    const r3 = randoms(count * 3, 22);
    for (let i = 0; i < count; i++) {
      const u = r3[i * 3] * 2 - 1;
      const t = r3[i * 3 + 1] * Math.PI * 2;
      const r = 22 + r3[i * 3 + 2] * 40;
      const s = Math.sqrt(1 - u * u);
      pos.set([s * Math.cos(t) * r, u * r, s * Math.sin(t) * r], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uWarp: { value: 0 } },
    });
    return [g, m] as const;
  }, [count]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(({ camera, gl }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    warp.current = damp(warp.current, Math.min(Math.abs(scrollState.velocity) / 40, 1), 4, dt);
    if (ref.current) {
      const m = ref.current.material as THREE.ShaderMaterial;
      m.uniforms.uTime.value += dt;
      m.uniforms.uPixelRatio.value = gl.getPixelRatio();
      m.uniforms.uWarp.value = warp.current;
      ref.current.rotation.y += dt * 0.008;
      ref.current.rotation.x = scrollState.progress * 1.4;
    }
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = damp(cam.fov, 45 + warp.current * 16, 5, dt);
    cam.position.x = damp(cam.position.x, tiltOf(scrollState.pointer.x) * 0.35, 2.5, dt);
    cam.position.y = damp(cam.position.y, tiltOf(scrollState.pointer.y) * 0.22, 2.5, dt);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={-2} />;
}

/* ---------------------------------- root ---------------------------------- */

function useShapes() {
  const [data, setData] = useState<{ shapes: Float32Array[]; count: number; lite: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const build = async () => {
      try {
        await document.fonts?.ready;
      } catch {}
      const small = window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4;
      const count = small ? 9000 : 18000;
      const family =
        getComputedStyle(document.documentElement).getPropertyValue("--font-syne").trim() || "sans-serif";
      const shapes = UNIVERSES.map((u) => buildShape(u.shape, count, family));
      if (!cancelled) setData({ shapes, count, lite: small });
    };
    build();
    return () => {
      cancelled = true;
    };
  }, []);
  return data;
}

/** Bloom for realistic glow + chromatic aberration that kicks in with scroll speed. */
function Effects({ lite }: { lite: boolean }) {
  const chroma = useRef<ChromaticAberrationEffect>(null);
  const amount = useRef(0);
  useFrame((_, dt) => {
    amount.current = damp(amount.current, Math.min(Math.abs(scrollState.velocity) / 60, 1), 6, Math.min(dt, 0.05));
    const o = 0.0004 + amount.current * 0.006;
    chroma.current?.offset.set(o, o * 0.6);
  });
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={lite ? 0.55 : 0.85} luminanceThreshold={0.22} luminanceSmoothing={0.35} radius={0.7} />
      <ChromaticAberration ref={chroma} offset={[0.0004, 0.0003]} radialModulation modulationOffset={0.25} />
    </EffectComposer>
  );
}

/** Darkens the half of the screen where text sits, so copy always reads clearly. */
function Scrim() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let x = 0.5;
    const loop = () => {
      x += (scrollState.sceneX - x) * 0.08;
      ref.current?.style.setProperty("--sx", `${(x * 100).toFixed(2)}%`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div
      ref={ref}
      className="absolute inset-0 [background:radial-gradient(ellipse_55%_75%_at_var(--sx,50%)_50%,transparent_0%,rgb(4_4_10/0.35)_55%,rgb(4_4_10/0.62)_100%)]"
    />
  );
}

export default function Scene() {
  const data = useShapes();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 9], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[UNIVERSES[0].bg]} />
        <Stars count={2600} />
        {data && (
          <>
            <StudioEnvironment />
            <Horizon />
            <ProjectGallery />
            <MorphParticles shapes={data.shapes} count={data.count} lite={data.lite} />
            <Effects lite={data.lite} />
          </>
        )}
      </Canvas>
      <Scrim />
    </div>
  );
}
