"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { scrollState, type GalleryItem } from "../scroll/scrollState";

/**
 * Projects as curved screens on a tilted ring in space.
 * The Projects section drives `scrollState.gallery.progress`; the ring rotates so
 * the active project swings to the front, where its live website scrolls inside it.
 */

const PANEL_W = 6.4;
const PANEL_H = 4;
const PROJECTS_UNIVERSE = 5;

const vertex = /* glsl */ `
uniform float uBend;
uniform float uTime;
uniform float uVel;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  // curve the screen like a cinema panel, plus a scroll-speed ripple
  p.z -= (p.x * p.x) * uBend;
  p.z += sin(p.x * 1.2 + uTime * 2.0) * uVel * 0.25;
  p.y += sin(p.x * 0.8 + uTime * 1.5) * uVel * 0.12;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const fragment = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uRepeat;
uniform float uScroll;
uniform float uFacing;
uniform float uVis;
uniform float uVel;
uniform float uReflect;
uniform vec3 uAccent;
uniform vec2 uSize;
varying vec2 vUv;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 uv = vUv;
  if (uReflect > 0.5) uv.y = 1.0 - uv.y;
  // texture window: the top of a tall screenshot, scrolling down over time on the front panel
  float maxOff = 1.0 - uRepeat.y;
  vec2 tuv = vec2(uv.x * uRepeat.x, uv.y * uRepeat.y + maxOff * (1.0 - uScroll));
  // chromatic split grows with scroll speed
  float shift = uVel * 0.006;
  vec3 col;
  col.r = texture2D(uMap, tuv + vec2(shift, 0.0)).r;
  col.g = texture2D(uMap, tuv).g;
  col.b = texture2D(uMap, tuv - vec2(shift, 0.0)).b;

  // rounded corners + accent edge glow
  vec2 p = (vUv - 0.5) * uSize;
  float d = roundedBox(p, uSize * 0.5, 0.18);
  float mask = 1.0 - smoothstep(-0.01, 0.01, d);
  float edge = smoothstep(0.06, 0.0, abs(d)) * 0.9;

  // panels turned away from the viewer fall into shadow
  float lit = mix(0.12, 1.0, smoothstep(0.0, 1.0, uFacing));
  float grey = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(grey) * 0.6, col, smoothstep(0.35, 0.95, uFacing));
  col *= lit;
  col += uAccent * edge * (0.35 + 0.65 * uFacing);

  float alpha = mask * uVis;
  if (uReflect > 0.5) alpha *= 0.16 * smoothstep(0.35, 1.0, vUv.y); // fade the mirror image
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

/** Designed poster for projects without a live website. */
function posterTexture(item: GalleryItem): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1280;
  c.height = 800;
  const g = c.getContext("2d")!;
  g.fillStyle = "#07070d";
  g.fillRect(0, 0, c.width, c.height);
  const glow = (x: number, y: number, r: number, a: string) => {
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, a);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, c.width, c.height);
  };
  glow(980, 160, 620, `${item.accent}cc`);
  glow(160, 760, 520, `${item.accent}55`);
  g.strokeStyle = "rgba(255,255,255,0.06)";
  for (let x = 0; x < c.width; x += 64) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, c.height);
    g.stroke();
  }
  for (let y = 0; y < c.height; y += 64) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(c.width, y);
    g.stroke();
  }
  const font = getComputedStyle(document.documentElement).getPropertyValue("--font-syne").trim() || "sans-serif";
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.font = `500 30px ${font}`;
  g.fillText(item.category.toUpperCase(), 80, 110);
  g.fillStyle = "#f2f2f8";
  const maxW = c.width - 170;
  let size = 128;
  let lines = [item.name];
  const fits = () => lines.every((l) => g.measureText(l).width <= maxW);
  g.font = `800 ${size}px ${font}`;
  if (!fits()) {
    // break into two balanced lines
    const words = item.name.split(" ");
    const mid = Math.ceil(words.length / 2);
    lines = words.length > 1 ? [words.slice(0, mid).join(" "), words.slice(mid).join(" ")] : lines;
  }
  while (!fits() && size > 44) {
    size -= 6;
    g.font = `800 ${size}px ${font}`;
  }
  lines.forEach((l, i) => g.fillText(l, 76, c.height - 120 - (lines.length - 1 - i) * size * 1.02));
  g.fillStyle = item.accent;
  g.fillRect(80, c.height - 80, 120, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function Panel({ item, index, count, radius }: { item: GalleryItem; index: number; count: number; radius: number }) {
  const group = useRef<THREE.Group>(null);
  const frontMesh = useRef<THREE.Mesh>(null);
  const mirrorMesh = useRef<THREE.Mesh>(null);
  const tmp = useRef({ n: new THREE.Vector3(), c: new THREE.Vector3(), w: new THREE.Vector3(), q: new THREE.Quaternion() });
  const scroll = useRef(0);
  const [shot, setShot] = useState<{ tex: THREE.Texture; repeatY: number } | null>(null);
  const { gl, camera } = useThree();

  // designed poster: shown for projects without a site, and while a screenshot loads
  const poster = useMemo(() => posterTexture(item), [item]);
  useEffect(() => () => poster.dispose(), [poster]);

  useEffect(() => {
    if (!item.src) return;
    let disposed = false;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader().load(item.src, (t) => {
      if (disposed) return t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = gl.capabilities.getMaxAnisotropy();
      const img = t.image as HTMLImageElement;
      loaded = t;
      // show a 16:10 window of the tall screenshot
      setShot({ tex: t, repeatY: Math.min(1, img.width / img.height / (PANEL_W / PANEL_H)) });
    });
    return () => {
      disposed = true;
      loaded?.dispose();
    };
  }, [item.src, gl]);

  const [front, mirror] = useMemo(() => {
    const make = (reflect: boolean) =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uMap: { value: null },
          uRepeat: { value: new THREE.Vector2(1, 1) },
          uScroll: { value: 0 },
          uFacing: { value: 0 },
          uVis: { value: 0 },
          uVel: { value: 0 },
          uBend: { value: 0.012 },
          uTime: { value: 0 },
          uReflect: { value: reflect ? 1 : 0 },
          uAccent: { value: new THREE.Color(item.accent) },
          uSize: { value: new THREE.Vector2(PANEL_W, PANEL_H) },
        },
      });
    return [make(false), make(true)];
  }, [item.accent]);

  const geometry = useMemo(() => new THREE.PlaneGeometry(PANEL_W, PANEL_H, 64, 1), []);
  useEffect(
    () => () => {
      geometry.dispose();
      front.dispose();
      mirror.dispose();
    },
    [geometry, front, mirror],
  );

  const angle = (index / count) * Math.PI * 2;

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g || !frontMesh.current || !mirrorMesh.current) return;
    const dt = Math.min(rawDt, 0.05);
    const t = tmp.current;
    // how directly this panel faces the camera
    g.getWorldPosition(t.w);
    t.n.set(0, 0, 1).applyQuaternion(g.getWorldQuaternion(t.q));
    t.c.copy(camera.position).sub(t.w).normalize();
    const facing = Math.max(0, t.n.dot(t.c));
    const isActive = scrollState.gallery.active === index;
    // the front screen slowly tours the website; the others rest at the top
    const target = shot && isActive && facing > 0.9 ? (Math.sin(performance.now() / 9000 - Math.PI / 2) + 1) / 2 : 0;
    scroll.current += (target - scroll.current) * Math.min(1, dt * (isActive ? 0.8 : 3));
    const vel = Math.min(Math.abs(scrollState.velocity) / 30, 1);
    const vis = galleryVisibility();
    for (const mesh of [frontMesh.current, mirrorMesh.current]) {
      const u = (mesh.material as THREE.ShaderMaterial).uniforms;
      u.uMap.value = shot?.tex ?? poster;
      u.uRepeat.value.set(1, shot?.repeatY ?? 1);
      u.uScroll.value = scroll.current;
      u.uFacing.value = facing;
      u.uTime.value += dt;
      u.uVel.value += (vel - u.uVel.value) * Math.min(1, dt * 4);
      u.uVis.value = vis;
    }
  });

  return (
    <group ref={group} position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]} rotation={[0, angle, 0]}>
      <mesh ref={frontMesh} geometry={geometry} material={front} frustumCulled={false} />
      <mesh ref={mirrorMesh} geometry={geometry} material={mirror} position={[0, -PANEL_H - 0.18, 0]} frustumCulled={false} />
    </group>
  );
}

const presence = { v: 1 };

/** 0..1: how much the ring should show (current universe x still inside the gallery). */
function galleryVisibility() {
  const d = Math.abs(scrollState.sceneMorph - PROJECTS_UNIVERSE);
  return Math.max(0, 1 - d * 2.2) * presence.v;
}

export default function ProjectGallery() {
  const ring = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const rot = useRef(0);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const { size } = useThree();

  // pick up the project list published by the Projects section
  useEffect(() => {
    let last: GalleryItem[] = [];
    const id = window.setInterval(() => {
      if (scrollState.gallery.items !== last) {
        last = scrollState.gallery.items;
        setItems(last);
      }
    }, 300);
    return () => window.clearInterval(id);
  }, []);

  const count = Math.max(items.length, 1);
  const radius = Math.max(7.5, (count * PANEL_W * 1.18) / (Math.PI * 2));

  useFrame((_, rawDt) => {
    const r = ring.current;
    const g = root.current;
    if (!r || !g) return;
    const dt = Math.min(rawDt, 0.05);
    presence.v += ((scrollState.gallery.present ? 1 : 0) - presence.v) * Math.min(1, dt * 3.5);
    const vis = galleryVisibility();
    g.visible = vis > 0.01 && items.length > 0;
    if (!g.visible) return;
    const step = (Math.PI * 2) / count;
    const target = -scrollState.gallery.progress * (count - 1) * step;
    rot.current += (target - rot.current) * Math.min(1, dt * 3.2);
    r.rotation.y = rot.current;

    const portrait = size.width < size.height;
    const px = Math.abs(scrollState.pointer.x) > 1 ? 0 : scrollState.pointer.x;
    const py = Math.abs(scrollState.pointer.y) > 1 ? 0 : scrollState.pointer.y;
    // enter from below, settle on the right half of the screen (top half on phones)
    const rise = (1 - vis) * -3;
    g.position.set(portrait ? 0 : 2.45, (portrait ? 2.55 : -0.05) + rise, -radius - 1.2);
    g.scale.setScalar(portrait ? 0.5 : 0.86);
    g.rotation.x = 0.07 + py * 0.04;
    g.rotation.z = -0.035;
    g.rotation.y = px * 0.08;
  });

  return (
    <group ref={root} visible={false}>
      <group ref={ring}>
        {items.map((item, i) => (
          <Panel key={item.slug} item={item} index={i} count={count} radius={radius} />
        ))}
      </group>
    </group>
  );
}
