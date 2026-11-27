"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scrollState } from "../scroll/scrollState";
import { multiverseBubbles, randoms } from "./shapes";

/**
 * Realistic hero objects that live inside the particle universes.
 * Each receives `vis(i)`: 0..1 visibility derived from the current morph value.
 */

const noise = /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}
`;

/* ------------------------------- black hole ------------------------------- */

const diskVertex = /* glsl */ `
varying vec2 vPos;
varying vec3 vWorld;
void main(){
  vPos = position.xy;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const diskFragment = /* glsl */ `
uniform float uTime;
uniform float uVis;
uniform float uInner;
uniform float uOuter;
varying vec2 vPos;
${noise}
void main(){
  float r = length(vPos);
  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float ang = atan(vPos.y, vPos.x);
  // Keplerian shear: inner gas orbits faster
  float swirl = ang * 3.0 + uTime * 1.4 / (0.35 + t * 2.0);
  float gas = fbm(vec2(swirl, t * 9.0 - uTime * 0.25));
  float streaks = fbm(vec2(ang * 12.0 + uTime * 0.9 / (0.3 + t), t * 30.0));
  // relativistic beaming: one side brighter
  float doppler = 1.0 + 0.75 * sin(ang + 0.6);
  vec3 hot = vec3(1.0, 0.96, 0.88);
  vec3 warm = vec3(1.0, 0.55, 0.18);
  vec3 cool = vec3(0.55, 0.12, 0.05);
  vec3 col = mix(hot, warm, smoothstep(0.0, 0.35, t));
  col = mix(col, cool, smoothstep(0.35, 1.0, t));
  float intensity = (0.35 + gas * 1.1 + streaks * 0.35) * doppler * (1.25 - t);
  float alpha = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.6, 1.0, t)) * uVis;
  gl_FragColor = vec4(col * intensity * 1.6, alpha * clamp(intensity, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

function BlackHole({ vis }: { vis: () => number }) {
  const disk = useRef<THREE.ShaderMaterial>(null);
  const halo = useRef<THREE.ShaderMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const lens = useRef<THREE.Group>(null);
  const horizon = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);

  const diskMat = useMemo(
    () => ({
      uniforms: { uTime: { value: 0 }, uVis: { value: 0 }, uInner: { value: 0.52 }, uOuter: { value: 2.1 } },
      vertexShader: diskVertex,
      fragmentShader: diskFragment,
    }),
    [],
  );
  const haloMat = useMemo(
    () => ({
      uniforms: { uTime: { value: 0 }, uVis: { value: 0 }, uInner: { value: 0.5 }, uOuter: { value: 0.95 } },
      vertexShader: diskVertex,
      fragmentShader: diskFragment,
    }),
    [],
  );

  useFrame(({ camera }, dt) => {
    const v = vis();
    if (group.current) group.current.visible = v > 0.01;
    if (v <= 0.01) return;
    for (const m of [disk.current, halo.current]) {
      if (!m) continue;
      m.uniforms.uTime.value += Math.min(dt, 0.05);
      m.uniforms.uVis.value = v;
    }
    if (halo.current) halo.current.uniforms.uVis.value = v * 0.75;
    if (horizon.current) horizon.current.opacity = v;
    if (glow.current) glow.current.opacity = v * 0.35;
    // lensed image of the far side of the disk always faces the viewer
    if (lens.current && group.current) {
      lens.current.quaternion.copy(group.current.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(camera.quaternion));
    }
  });

  return (
    <group ref={group}>
      <mesh renderOrder={2}>
        <sphereGeometry args={[0.46, 48, 48]} />
        <meshBasicMaterial ref={horizon} color="#000000" transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <ringGeometry args={[0.52, 2.1, 160, 1]} />
        <shaderMaterial ref={disk} args={[diskMat]} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <group ref={lens}>
        <mesh renderOrder={1}>
          <ringGeometry args={[0.5, 0.95, 128, 1]} />
          <shaderMaterial ref={halo} args={[haloMat]} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh renderOrder={0}>
          <circleGeometry args={[1.25, 64]} />
          <meshBasicMaterial ref={glow} color="#ff7a3d" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} alphaMap={RADIAL} />
        </mesh>
      </group>
    </group>
  );
}

/* --------------------------------- planet --------------------------------- */

const planetVertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main(){
  vObj = position;
  vNormalV = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const planetFragment = /* glsl */ `
uniform float uTime;
uniform float uVis;
varying vec3 vObj;
varying vec3 vNormalV;
varying vec3 vViewPos;
${noise}
void main(){
  vec3 n = normalize(vObj);
  float lat = n.y;
  float lon = atan(n.z, n.x);
  // gas-giant bands, warped by turbulence and slowly drifting
  float warp = fbm(vec2(lon * 2.0 + uTime * 0.03, lat * 6.0)) * 0.35;
  float bands = fbm(vec2(lat * 9.0 + warp * 3.0, lon * 0.6 + uTime * 0.02));
  float storm = smoothstep(0.82, 0.9, 1.0 - length(vec2((lon - 1.2) * 0.6, (lat + 0.28) * 2.2)));
  vec3 c1 = vec3(0.95, 0.78, 0.55);
  vec3 c2 = vec3(0.78, 0.42, 0.22);
  vec3 c3 = vec3(0.98, 0.9, 0.78);
  vec3 c4 = vec3(0.55, 0.22, 0.16);
  vec3 col = mix(c2, c1, smoothstep(0.3, 0.6, bands));
  col = mix(col, c3, smoothstep(0.62, 0.8, bands) * 0.7);
  col = mix(col, c4, smoothstep(0.25, 0.1, bands) * 0.6);
  col = mix(col, vec3(0.85, 0.35, 0.22), storm);
  // lighting: key light from upper-left, soft terminator, rim scattering
  vec3 L = normalize(vec3(-0.65, 0.45, 0.6));
  vec3 N = normalize(vNormalV);
  float diff = smoothstep(-0.15, 0.85, dot(N, L));
  float rim = pow(1.0 - max(dot(N, normalize(-vViewPos)), 0.0), 3.0);
  vec3 lit = col * (0.04 + diff * 1.15) + vec3(1.0, 0.6, 0.35) * rim * diff * 0.8;
  gl_FragColor = vec4(lit, uVis);
  #include <colorspace_fragment>
}`;

const atmoFragment = /* glsl */ `
uniform float uVis;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main(){
  vec3 N = normalize(vNormalV);
  float f = pow(1.0 - abs(dot(N, normalize(-vViewPos))), 2.5);
  vec3 L = normalize(vec3(-0.65, 0.45, 0.6));
  float side = smoothstep(-0.4, 0.8, dot(N, L));
  gl_FragColor = vec4(vec3(1.0, 0.62, 0.32) * f * (0.25 + side), f * uVis * (0.25 + side));
  #include <colorspace_fragment>
}`;

const ringFragment = /* glsl */ `
uniform float uVis;
uniform float uInner;
uniform float uOuter;
varying vec2 vPos;
${noise}
void main(){
  float r = length(vPos);
  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float bands = vnoise(vec2(t * 70.0, 0.5)) * 0.6 + vnoise(vec2(t * 18.0, 3.1)) * 0.4;
  float gap = smoothstep(0.52, 0.55, t) * (1.0 - smoothstep(0.58, 0.61, t)); // Cassini-like division
  float a = bands * (1.0 - gap * 0.9) * smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.92, 1.0, t));
  // planet shadow falls across the back of the rings
  float ang = atan(vPos.y, vPos.x);
  float shadow = 1.0 - 0.75 * smoothstep(0.2, 0.0, abs(ang - 0.75)) ;
  vec3 col = mix(vec3(0.95, 0.82, 0.62), vec3(0.75, 0.55, 0.38), t) * shadow;
  gl_FragColor = vec4(col * 1.1, a * 0.85 * uVis);
  #include <colorspace_fragment>
}`;

function Planet({ vis }: { vis: () => number }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.ShaderMaterial>(null);
  const atmo = useRef<THREE.ShaderMaterial>(null);
  const ring = useRef<THREE.ShaderMaterial>(null);
  const bodyArgs = useMemo(() => ({ uniforms: { uTime: { value: 0 }, uVis: { value: 0 } }, vertexShader: planetVertex, fragmentShader: planetFragment }), []);
  const atmoArgs = useMemo(() => ({ uniforms: { uVis: { value: 0 } }, vertexShader: planetVertex, fragmentShader: atmoFragment }), []);
  const ringArgs = useMemo(
    () => ({ uniforms: { uVis: { value: 0 }, uInner: { value: 1.75 }, uOuter: { value: 3.0 } }, vertexShader: diskVertex, fragmentShader: ringFragment }),
    [],
  );

  useFrame((_, dt) => {
    const v = vis();
    if (group.current) group.current.visible = v > 0.01;
    if (v <= 0.01) return;
    if (body.current) {
      body.current.uniforms.uTime.value += Math.min(dt, 0.05);
      body.current.uniforms.uVis.value = v;
      body.current.transparent = v < 0.99;
    }
    if (atmo.current) atmo.current.uniforms.uVis.value = v;
    if (ring.current) ring.current.uniforms.uVis.value = v;
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1.22, 96, 96]} />
        <shaderMaterial ref={body} args={[bodyArgs]} />
      </mesh>
      <mesh scale={1.1}>
        <sphereGeometry args={[1.22, 64, 64]} />
        <shaderMaterial ref={atmo} args={[atmoArgs]} transparent depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.75, 3.0, 192, 1]} />
        <shaderMaterial ref={ring} args={[ringArgs]} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* -------------------------------- bubbles --------------------------------- */

function Bubbles({ vis, lite }: { vis: () => number; lite: boolean }) {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const bubbles = useMemo(() => multiverseBubbles(), []);

  useFrame(({ clock }) => {
    const v = vis();
    if (group.current) group.current.visible = v > 0.01;
    if (v <= 0.01) return;
    mats.current.forEach((m, i) => {
      if (!m) return;
      m.opacity = v * (lite ? 0.45 : 0.9);
      m.iridescenceThicknessRange = [180 + Math.sin(clock.elapsedTime * 0.6 + i) * 120, 700];
    });
  });

  return (
    <group ref={group}>
      {bubbles.map((b, i) => (
        <mesh key={i} position={b.c}>
          <sphereGeometry args={[b.r * 0.97, 64, 64]} />
          <meshPhysicalMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            transparent
            depthWrite={false}
            roughness={0.04}
            metalness={0}
            transmission={lite ? 0 : 1}
            thickness={0.25}
            ior={1.2}
            iridescence={1}
            iridescenceIOR={1.35}
            clearcoat={1}
            envMapIntensity={1.6}
            color="#ffffff"
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------- crystal core ------------------------------ */

function Crystal({ vis, lite }: { vis: () => number; lite: boolean }) {
  const group = useRef<THREE.Group>(null);
  const solid = useRef<THREE.MeshPhysicalMaterial>(null);
  const wire = useRef<THREE.LineBasicMaterial>(null);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.95, 1)), []);

  useFrame((_, dt) => {
    const v = vis();
    if (group.current) {
      group.current.visible = v > 0.01;
      group.current.rotation.x += dt * 0.15;
      group.current.rotation.z += dt * 0.1;
    }
    if (solid.current) solid.current.opacity = v * (lite ? 0.35 : 0.9);
    if (wire.current) wire.current.opacity = v * 0.55;
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[0.92, 1]} />
        <meshPhysicalMaterial
          ref={solid}
          transparent
          flatShading
          roughness={0.08}
          transmission={lite ? 0 : 1}
          thickness={1.2}
          ior={1.6}
          iridescence={0.6}
          clearcoat={1}
          envMapIntensity={2}
          color="#dffcff"
          opacity={0}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial ref={wire} color="#3fe0ff" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  );
}

/* -------------------------------- fireflies ------------------------------- */

const fireflyVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aRand;
varying float vBlink;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.4 + aRand * 30.0) * 0.25;
  p.y += sin(uTime * 0.3 + aRand * 17.0) * 0.18;
  p.z += cos(uTime * 0.35 + aRand * 11.0) * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vBlink = pow(0.5 + 0.5 * sin(uTime * (1.2 + aRand * 2.5) + aRand * 50.0), 3.0);
  gl_PointSize = (40.0 + aRand * 50.0) * uPixelRatio / -mv.z;
}`;
const fireflyFragment = /* glsl */ `
uniform float uVis;
varying float vBlink;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = pow(smoothstep(0.5, 0.0, d), 2.2);
  gl_FragColor = vec4(vec3(1.0, 0.95, 0.55) * (0.6 + vBlink), a * vBlink * uVis);
  #include <colorspace_fragment>
}`;

function Fireflies({ vis }: { vis: () => number }) {
  const ref = useRef<THREE.Points>(null);
  const [geometry, material] = useMemo(() => {
    const n = 140;
    const r = randoms(n * 4, 77);
    const pos = new Float32Array(n * 3);
    const rand = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (r[i * 4] - 0.5) * 7;
      pos[i * 3 + 1] = -2.6 + r[i * 4 + 1] * 5.5;
      pos[i * 3 + 2] = (r[i * 4 + 2] - 0.5) * 4;
      rand[i] = r[i * 4 + 3];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: fireflyVertex,
      fragmentShader: fireflyFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uVis: { value: 0 } },
    });
    return [g, m] as const;
  }, []);

  useFrame(({ gl }, dt) => {
    const v = vis();
    const pts = ref.current;
    if (!pts) return;
    pts.visible = v > 0.01;
    const m = pts.material as THREE.ShaderMaterial;
    m.uniforms.uTime.value += Math.min(dt, 0.05);
    m.uniforms.uPixelRatio.value = gl.getPixelRatio();
    m.uniforms.uVis.value = v;
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}

/* --------------------------------- shared --------------------------------- */

const RADIAL = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.35, "#888");
  g.addColorStop(1, "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

/** Studio lighting baked into an environment map; no HDR download needed. */
export function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#05050c"]} />
      <Lightformer form="circle" intensity={1.6} position={[0, 6, -4]} scale={7} color="#d9ccff" />
      <Lightformer form="circle" intensity={1.1} position={[-7, 1, 2]} rotation-y={Math.PI / 2} scale={6} color="#9eefff" />
      <Lightformer form="circle" intensity={0.9} position={[7, -1, 2]} rotation-y={-Math.PI / 2} scale={6} color="#ffb3cc" />
      <Lightformer form="ring" intensity={2.2} position={[0, 0, 9]} scale={3} color="#ffffff" />
    </Environment>
  );
}

/** Which set piece lives in which universe (index into UNIVERSES). */
export function SetPieces({ lite }: { lite: boolean }) {
  const vis = (i: number) => () => {
    const d = Math.abs(scrollState.sceneMorph - i);
    return Math.max(0, 1 - d * 1.8);
  };
  return (
    <>
      <BlackHole vis={vis(0)} />
      <Planet vis={vis(1)} />
      <Bubbles vis={vis(2)} lite={lite} />
      <Crystal vis={vis(3)} lite={lite} />
      <Fireflies vis={vis(6)} />
    </>
  );
}
