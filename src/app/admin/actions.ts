"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/content/get";
import { mergeWithDefaults, store } from "@/lib/content/store";
import { defaultContent } from "@/lib/content/defaults";
import type { Message, SiteContent } from "@/lib/content/types";
import { getOrCapturePreview } from "@/lib/preview";

export type ActionResult = { ok: boolean; message: string; url?: string; content?: SiteContent };

/* ---------------------------------- auth ---------------------------------- */

export async function login(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD) {
    return { ok: false, message: "ADMIN_PASSWORD is not set on the server." };
  }
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 900)); // slow down guessing
    return { ok: false, message: "Wrong password. The multiverse remains locked." };
  }
  await createSession();
  return { ok: true, message: "Welcome back." };
}

export async function logout(): Promise<void> {
  await destroySession();
}

/* --------------------------------- content -------------------------------- */

export async function saveContent(content: SiteContent): Promise<ActionResult> {
  await requireAdmin();
  if (typeof content !== "object" || content === null) return { ok: false, message: "Invalid payload." };
  const size = JSON.stringify(content).length;
  if (size > 2_000_000) return { ok: false, message: "Content is too large." };

  // keep only known top-level keys, fill gaps from defaults
  const clean = mergeWithDefaults(
    Object.fromEntries(Object.keys(defaultContent).map((k) => [k, (content as Record<string, unknown>)[k]])) as Partial<SiteContent>,
  );
  await store.writeContent(clean);
  updateTag(CONTENT_TAG);
  return { ok: true, message: "Saved. The universe has been updated.", content: clean };
}

export async function resetContent(): Promise<ActionResult> {
  await requireAdmin();
  const current = mergeWithDefaults(await store.readContent());
  const clean = { ...structuredClone(defaultContent), resume: current.resume };
  await store.writeContent(clean);
  updateTag(CONTENT_TAG);
  return { ok: true, message: "Reset to résumé defaults.", content: clean };
}

export async function refreshStats(): Promise<ActionResult> {
  await requireAdmin();
  updateTag("stats");
  return { ok: true, message: "Live stats will refetch on the next visit." };
}

/* ---------------------------------- files --------------------------------- */

// Vercel limits request bodies to 4.5 MB, so keep uploads under 4 MB
const MAX_RESUME = 4 * 1024 * 1024;
const MAX_IMAGE = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

export async function uploadResume(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a PDF first." };
  if (file.size > MAX_RESUME) return { ok: false, message: "PDF must be under 4 MB." };
  const data = Buffer.from(await file.arrayBuffer());
  if (data.subarray(0, 5).toString() !== "%PDF-") return { ok: false, message: "That file is not a PDF." };

  const fileName = file.name.replace(/[^\w.\- ]/g, "_") || "resume.pdf";
  await store.writeFile("resume", { data, fileName, contentType: "application/pdf" });

  const current = mergeWithDefaults(await store.readContent());
  current.resume = { fileName, size: data.length, updatedAt: new Date().toISOString() };
  await store.writeContent(current);
  updateTag(CONTENT_TAG);
  return { ok: true, message: `Uploaded ${fileName}. Visitors now get the new résumé.`, content: current };
}

export async function restoreDefaultResume(): Promise<ActionResult> {
  await requireAdmin();
  await store.deleteFile("resume");
  const current = mergeWithDefaults(await store.readContent());
  current.resume = structuredClone(defaultContent.resume);
  await store.writeContent(current);
  updateTag(CONTENT_TAG);
  return { ok: true, message: "Restored the bundled résumé.", content: current };
}

export async function uploadImage(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image first." };
  if (file.size > MAX_IMAGE) return { ok: false, message: "Image must be under 4 MB (compress it at squoosh.app)." };
  if (!IMAGE_TYPES.includes(file.type)) return { ok: false, message: "Use PNG, JPG, WebP, GIF or AVIF." };
  const key = `img-${randomUUID()}`;
  await store.writeFile(key, {
    data: Buffer.from(await file.arrayBuffer()),
    fileName: file.name,
    contentType: file.type,
  });
  return { ok: true, message: "Image uploaded. Remember to save.", url: `/api/media/${key}` };
}

/* --------------------------------- inbox ---------------------------------- */

export async function listMessages(): Promise<Message[]> {
  await requireAdmin();
  return store.listMessages();
}

export async function markMessage(id: string, read: boolean): Promise<ActionResult> {
  await requireAdmin();
  await store.updateMessage(id, { read });
  return { ok: true, message: read ? "Marked as read." : "Marked as unread." };
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  await requireAdmin();
  await store.deleteMessage(id);
  return { ok: true, message: "Message deleted." };
}

/* -------------------------------- previews -------------------------------- */

export async function refreshPreview(url: string): Promise<ActionResult> {
  await requireAdmin();
  if (!/^https?:\/\//.test(url)) return { ok: false, message: "Add a full https:// URL first." };
  const buf = await getOrCapturePreview(url, true);
  return buf
    ? { ok: true, message: `Captured a fresh preview of ${new URL(url).host}.` }
    : { ok: false, message: "Couldn't capture that site (it may block screenshots). Upload a screenshot instead." };
}
