"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scrollState } from "../scroll/scrollState";

/**
 * Hero visual: the curve of a dark planet at sunrise.
 * A full-screen shader draws the planet limb, a layered atmosphere,
 * a sun cresting the horizon with an anamorphic streak, and quiet stars.
 * Calm by design: it breathes, follows the cursor a little, and sinks as you scroll.
 */

const vertex = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const fragment = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uVis;
uniform float uSink;
uniform vec2 uMouse;
uniform float uPortrait;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  // planet: a huge circle whose top edge forms the horizon
  float R = mix(2.4, 1.15, uPortrait);
  float horizon = mix(-0.3, -0.4, uPortrait) - uSink;
  vec2 c = vec2(uMouse.x * 0.03, horizon - R);
  vec2 p = uv - c;
  float d = length(p) - R; // < 0 inside the planet

  // sun sits on the limb, slightly right of centre, drifting with the cursor
  float sunA = mix(0.25, 0.32, uPortrait) + uMouse.x * 0.06;
  vec2 sunDir = vec2(sin(sunA), cos(sunA));
  vec2 sun = c + sunDir * R;
  float ang = atan(p.x, p.y);
  float toSun = abs(ang - sunA); // angular distance along the limb

  // --- atmosphere: tight bright rim + wide soft scattering
  float outside = step(0.0, d);
  float rim = exp(-abs(d) * mix(220.0, 160.0, uPortrait));
  float haze = exp(-max(d, 0.0) * 12.0) * outside;
  float wide = exp(-max(d, 0.0) * 3.4) * outside;
  float nearSun = exp(-toSun * 6.5);
  vec3 cool = vec3(0.32, 0.45, 1.0);      // rayleigh blue
  vec3 violet = vec3(0.62, 0.48, 1.0);
  vec3 warm = vec3(1.0, 0.72, 0.45);
  vec3 atmoCol = mix(mix(violet, cool, smoothstep(0.0, 1.2, toSun)), warm, nearSun);
  float breathe = 0.92 + 0.08 * sin(uTime * 0.6);
  vec3 col = atmoCol * (rim * (0.55 + 1.8 * nearSun) + haze * (0.18 + 0.9 * nearSun) + wide * 0.07) * breathe;

  // --- planet surface: deep night side with a faint dawn terminator and cloud bands
  if (d < 0.0) {
    float depth = clamp(-d * 3.0, 0.0, 1.0);
    vec2 sp = p / R;
    float clouds = fbm(vec2(sp.x * 9.0 + uTime * 0.01, sp.y * 26.0));
    float dawn = exp(d * 14.0) * (0.25 + 0.75 * nearSun);
    vec3 surf = mix(vec3(0.02, 0.025, 0.05), vec3(0.06, 0.07, 0.12), clouds * (1.0 - depth));
    surf += atmoCol * dawn * 0.35;
    col = surf + atmoCol * rim * (0.4 + 1.5 * nearSun);
  }

  // --- the sun: core, bloom and an anamorphic streak along the horizon
  vec2 sv = uv - sun;
  float sd = length(sv);
  float core = exp(-sd * 55.0) * 2.2;
  float bloom = exp(-sd * 10.0) * 0.32;
  float streak = exp(-abs(sv.y) * 180.0) * exp(-abs(sv.x) * 1.6) * 0.65;
  float flare = exp(-abs(sv.y) * 600.0) * exp(-abs(sv.x) * 0.5) * 0.35;
  float sunMask = smoothstep(-0.012, 0.01, d); // partly behind the limb
  col += vec3(1.0, 0.86, 0.7) * (core * sunMask + bloom + streak + flare);

  // --- quiet stars above the horizon, fading into the glow
  vec2 g = uv * 140.0;
  vec2 id = floor(g);
  float h = hash(id);
  float star = step(0.996, h) * smoothstep(0.45, 0.0, length(fract(g) - 0.5)) * (0.4 + 0.6 * sin(uTime * (1.0 + h * 3.0) + h * 40.0));
  col += vec3(0.85, 0.9, 1.0) * star * outside * (1.0 - clamp(wide * 1.5, 0.0, 1.0));

  // alpha: the planet occludes everything behind it; the sky is additive light
  float lum = max(max(col.r, col.g), col.b);
  float a = d < 0.0 ? 1.0 : clamp(lum, 0.0, 1.0);
  gl_FragColor = vec4(col * uVis, a * uVis);
}`;

export default function Horizon() {
  const mesh = useRef<THREE.Mesh>(null);
  const mouse = useRef(new THREE.Vector2());

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        premultipliedAlpha: true,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: {
          uRes: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uVis: { value: 0 },
          uSink: { value: 0 },
          uMouse: { value: new THREE.Vector2() },
          uPortrait: { value: 0 },
        },
      }),
    [],
  );

  useFrame(({ gl, size }, rawDt) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(rawDt, 0.05);
    const s = Math.min(Math.max(scrollState.sceneMorph, 0), 1.5);
    const target = (1 - Math.min(1, s / 0.7)) * (scrollState.introDone ? 1 : 0);
    const u = (m.material as THREE.ShaderMaterial).uniforms;
    u.uVis.value += (target - u.uVis.value) * Math.min(1, dt * 1.6);
    m.visible = u.uVis.value > 0.003;
    if (!m.visible) return;
    const pr = gl.getPixelRatio();
    u.uRes.value.set(size.width * pr, size.height * pr);
    u.uTime.value += dt;
    u.uSink.value = s * s * 0.9;
    u.uPortrait.value = size.width < size.height ? 1 : 0;
    const px = Math.abs(scrollState.pointer.x) > 1 ? 0 : scrollState.pointer.x;
    const py = Math.abs(scrollState.pointer.y) > 1 ? 0 : scrollState.pointer.y;
    mouse.current.x += (px - mouse.current.x) * Math.min(1, dt * 1.5);
    mouse.current.y += (py - mouse.current.y) * Math.min(1, dt * 1.5);
    u.uMouse.value.copy(mouse.current);
  });

  return (
    <mesh ref={mesh} material={material} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
