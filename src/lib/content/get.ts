import "server-only";
import { createHash } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { defaultContent } from "./defaults";
import { mergeWithDefaults, store } from "./store";
import type { SiteContent } from "./types";

export const CONTENT_TAG = "site-content";

/** Changes whenever the seed content in defaults.ts changes, so deploys never serve stale defaults. */
const DEFAULTS_VERSION = createHash("sha1").update(JSON.stringify(defaultContent)).digest("hex").slice(0, 12);

async function readContent(version: string): Promise<SiteContent> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("days");
  void version; // part of the cache key
  try {
    return mergeWithDefaults(await store.readContent());
  } catch (err) {
    console.error("[content] falling back to defaults:", err);
    return mergeWithDefaults(null);
  }
}

/** Cached read of the site content. Invalidated by updateTag(CONTENT_TAG) on admin save. */
export function getContent(): Promise<SiteContent> {
  return readContent(DEFAULTS_VERSION);
}

/** Uncached read for the admin editor. */
export async function getContentFresh(): Promise<SiteContent> {
  return mergeWithDefaults(await store.readContent());
}
