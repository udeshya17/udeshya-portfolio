import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

async function fonts() {
  const dir = path.join(process.cwd(), "assets", "fonts");
  const load = (f: string) => readFile(path.join(dir, f));
  const [syne7, syne8, serif, inter4, inter5] = await Promise.all([
    load("syne-700.ttf"),
    load("syne-800.ttf"),
    load("instrument-serif-italic.ttf"),
    load("inter-400.ttf"),
    load("inter-500.ttf"),
  ]);
  return [
    { name: "Syne", data: syne7, weight: 700 as const, style: "normal" as const },
    { name: "Syne", data: syne8, weight: 800 as const, style: "normal" as const },
    { name: "Serif", data: serif, weight: 400 as const, style: "italic" as const },
    { name: "Inter", data: inter4, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: inter5, weight: 500 as const, style: "normal" as const },
  ];
}

function Mark({ size = 44, accent = "#b69cff" }: { size?: number; accent?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <ellipse cx="32" cy="32" rx="27" ry="9.5" fill="none" stroke={accent} strokeWidth="1.8" opacity="0.7" transform="rotate(-28 32 32)" />
      <path d="M20 16v18a12 12 0 0 0 24 0V16" fill="none" stroke="#eeeef5" strokeWidth="6" strokeLinecap="round" />
      <circle cx="51" cy="19" r="3.4" fill={accent} />
    </svg>
  );
}

/** Sky + planet horizon at sunrise, drawn with gradients (matches the hero). */
function Horizon({ accent = "#b69cff", sunX = 0.74 }: { accent?: string; sunX?: number }) {
  const sunLeft = Math.round(OG_SIZE.width * sunX);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {/* atmosphere glow */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 420,
          display: "flex",
          background: `radial-gradient(ellipse 55% 60% at ${sunX * 100}% 100%, rgba(255,214,170,0.55), ${accent}40 38%, rgba(70,90,255,0.12) 62%, transparent 80%)`,
        }}
      />
      {/* planet body: a huge circle whose top edge is the horizon */}
      <div
        style={{
          position: "absolute",
          left: -900,
          top: 520,
          width: 3000,
          height: 3000,
          borderRadius: 1500,
          display: "flex",
          background: "#05060c",
          border: "2px solid rgba(255,236,214,0.85)",
          boxShadow: `0 -6px 28px rgba(255,190,140,0.55), 0 -30px 90px ${accent}55`,
        }}
      />
      {/* sun cresting the limb + anamorphic streak */}
      <div
        style={{
          position: "absolute",
          left: sunLeft - 90,
          top: 432,
          width: 180,
          height: 180,
          borderRadius: 90,
          display: "flex",
          background: "radial-gradient(circle, rgba(255,250,240,1) 0%, rgba(255,215,170,0.75) 18%, rgba(255,170,120,0.18) 45%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: sunLeft - 520,
          top: 519,
          width: 1040,
          height: 4,
          display: "flex",
          background: "linear-gradient(90deg, transparent, rgba(255,235,215,0.9) 50%, transparent)",
        }}
      />
    </div>
  );
}

function Stars() {
  // deterministic sprinkle
  const pts = Array.from({ length: 70 }, (_, i) => {
    const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * 1200;
    const y = (Math.sin(i * 53.3 + 1.7) * 0.5 + 0.5) * 470;
    const s = 1 + ((i * 37) % 3);
    const o = 0.25 + ((i * 17) % 10) / 16;
    return { x, y, s, o };
  });
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {pts.map((p, i) => (
        <div key={i} style={{ position: "absolute", left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: 2, background: "#fff", opacity: p.o, display: "flex" }} />
      ))}
    </div>
  );
}

/** Renders "plain *accent* plain" with the starred words in the serif accent. */
function Statement({ text, size, accent }: { text: string; size: number; accent: string }) {
  const parts = (text || "").split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", fontFamily: "Syne", fontWeight: 700, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.035, color: "#eeeef5" }}>
      {parts.flatMap((part, i) => {
        const accentPart = part.startsWith("*") && part.endsWith("*");
        const words = (accentPart ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean);
        return words.map((w, k) => (
          <span
            key={`${i}-${k}`}
            style={
              accentPart
                ? { fontFamily: "Serif", fontStyle: "italic", fontWeight: 400, color: accent, marginRight: size * 0.24, letterSpacing: -size * 0.01, fontSize: size * 1.06 }
                : { marginRight: size * 0.24 }
            }
          >
            {w}
          </span>
        ));
      })}
    </div>
  );
}

export async function renderSiteOg(o: { name: string; title: string; headline: string; points: string[]; host: string; available: boolean }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#05050c", fontFamily: "Inter", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "radial-gradient(ellipse 70% 60% at 15% 0%, rgba(124,92,255,0.22), transparent 60%)" }} />
        <Stars />
        <Horizon />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: "56px 72px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Mark />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 22, letterSpacing: 4, color: "#eeeef5" }}>{o.name.toUpperCase()}</span>
                <span style={{ fontSize: 17, color: "#8d8fa6", marginTop: 2 }}>{o.title}</span>
              </div>
            </div>
            {o.available && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, color: "#eeeef5", padding: "10px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.04)" }}>
                <div style={{ width: 9, height: 9, borderRadius: 9, background: "#b69cff", display: "flex" }} />
                Available for new work
              </div>
            )}
          </div>
          <div style={{ display: "flex", marginTop: 62, maxWidth: 940 }}>
            <Statement text={o.headline} size={68} accent="#c4b0ff" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 30, fontSize: 21, color: "#b9bbd0", fontWeight: 500 }}>
            {o.points.map((p, i) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {i > 0 && <div style={{ width: 5, height: 5, borderRadius: 5, background: "#6b6d85", display: "flex" }} />}
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
        {o.host && (
          <div style={{ position: "absolute", left: 72, bottom: 40, display: "flex", fontSize: 19, color: "#8d8fa6", letterSpacing: 1 }}>{o.host}</div>
        )}
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}

export async function renderProjectOg(o: { name: string; tagline: string; category: string; year: string; stack: string[]; accent: string; author: string; host: string }) {
  const titleSize = o.name.length > 22 ? 72 : o.name.length > 14 ? 88 : 108;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#05050c", fontFamily: "Inter", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", background: `radial-gradient(ellipse 60% 70% at 85% 20%, ${o.accent}55, transparent 60%), radial-gradient(ellipse 50% 50% at 0% 100%, ${o.accent}22, transparent 60%)` }} />
        <Stars />
        <Horizon accent={o.accent} sunX={0.8} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: "56px 72px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Mark size={40} accent={o.accent} />
              <span style={{ fontSize: 19, color: "#b9bbd0" }}>Case study · {o.author}</span>
            </div>
            <span style={{ fontSize: 18, color: "#8d8fa6", letterSpacing: 3 }}>{`${o.category} · ${o.year}`.toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", marginTop: 70, fontFamily: "Syne", fontWeight: 800, fontSize: titleSize, lineHeight: 0.95, letterSpacing: -titleSize * 0.04, color: "#eeeef5" }}>{o.name}</div>
          <div style={{ display: "flex", marginTop: 18, fontFamily: "Serif", fontStyle: "italic", fontSize: 44, color: o.accent }}>{o.tagline}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 34, maxWidth: 900 }}>
            {o.stack.slice(0, 6).map((s) => (
              <div key={s} style={{ display: "flex", padding: "8px 16px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(10,10,18,0.6)", color: "#d6d7e4", fontSize: 18 }}>
                {s}
              </div>
            ))}
          </div>
        </div>
        {o.host && <div style={{ position: "absolute", left: 72, bottom: 40, display: "flex", fontSize: 19, color: "#8d8fa6", letterSpacing: 1 }}>{o.host}</div>}
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}

/** Absolute site URL for metadata: env first, then Vercel's production URL, then the admin setting. */
export function siteUrl(fallback?: string): string | undefined {
  const v = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") || fallback || "";
  try {
    return v ? new URL(v).origin : undefined;
  } catch {
    return undefined;
  }
}
