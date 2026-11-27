import "server-only";
import { createHash } from "node:crypto";
import { store } from "./content/store";

/**
 * Captures a tall screenshot of a live website (via the Microlink screenshot API),
 * hides common modals/cookie banners, scrolls once so reveal-on-scroll content renders,
 * then crops + compresses it with sharp. Stored once, served forever after.
 */

const HIDE_OVERLAYS = [
  "[role=dialog],[aria-modal=true],dialog,.modal,.modal-backdrop,[class*=cookie],[id*=cookie],[class*=Cookie],[class*=consent],[class*=popup],[class*=Popup],[class*=overlay]:not(body):not(html){display:none!important}",
  "html,body{overflow:auto!important}",
];
const PRESCROLL =
  "(async()=>{const h=()=>document.documentElement.scrollHeight;for(let y=0;y<Math.min(h(),9000);y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,90));}window.scrollTo(0,0);})()";

export const previewKey = (url: string) => `preview-${createHash("sha1").update(url).digest("hex").slice(0, 16)}`;

const inflight = new Map<string, Promise<Buffer | null>>();

async function capture(url: string): Promise<Buffer | null> {
  const qs = new URLSearchParams({
    url,
    screenshot: "true",
    meta: "false",
    "screenshot.fullPage": "true",
    "screenshot.type": "jpeg",
    "viewport.width": "1280",
    "viewport.height": "800",
    "viewport.deviceScaleFactor": "1",
    waitForTimeout: "5000",
  });
  qs.append("scripts", PRESCROLL);
  HIDE_OVERLAYS.forEach((c) => qs.append("styles", c));
  const headers: Record<string, string> = {};
  if (process.env.MICROLINK_API_KEY) headers["x-api-key"] = process.env.MICROLINK_API_KEY;
  const base = process.env.MICROLINK_API_KEY ? "https://pro.microlink.io" : "https://api.microlink.io";

  const meta = await (await fetch(`${base}/?${qs}`, { headers, signal: AbortSignal.timeout(90_000) })).json();
  const shot = meta?.data?.screenshot?.url;
  if (meta?.status !== "success" || !shot) return null;
  const raw = Buffer.from(await (await fetch(shot, { signal: AbortSignal.timeout(60_000) })).arrayBuffer());

  const sharp = (await import("sharp")).default;
  const img = sharp(raw, { limitInputPixels: false });
  const { width = 1280, height = 800 } = await img.metadata();
  return img
    .extract({ left: 0, top: 0, width, height: Math.min(height, 4200) })
    .resize({ width: 1200 })
    .webp({ quality: 72 })
    .toBuffer();
}

/** Returns the stored preview, capturing it first if needed (deduplicated per URL). */
export async function getOrCapturePreview(url: string, force = false): Promise<Buffer | null> {
  const key = previewKey(url);
  if (!force) {
    const existing = await store.readFile(key).catch(() => null);
    if (existing) return existing.data;
  }
  if (!inflight.has(key)) {
    inflight.set(
      key,
      capture(url)
        .then(async (buf) => {
          if (buf) await store.writeFile(key, { data: buf, fileName: `${key}.webp`, contentType: "image/webp" });
          return buf;
        })
        .catch((err) => {
          console.error("[preview] capture failed for", url, err);
          return null;
        })
        .finally(() => inflight.delete(key)),
    );
  }
  return inflight.get(key)!;
}
