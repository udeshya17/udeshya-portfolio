"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { store } from "@/lib/content/store";
import type { Message } from "@/lib/content/types";

export type ContactState = { ok: boolean; message: string; errors?: Partial<Record<"name" | "email" | "message", string>> } | null;

const hits = new Map<string, number[]>();
const LIMIT = 5; // messages per IP per hour

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

async function notify(m: Message) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  if (!key || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || "Portfolio <onboarding@resend.dev>",
        to: [to],
        reply_to: m.email,
        subject: `New enquiry from ${m.name}${m.projectType ? ` · ${m.projectType}` : ""}`,
        text: [
          `Name: ${m.name}`,
          `Email: ${m.email}`,
          m.company && `Company: ${m.company}`,
          m.projectType && `Type: ${m.projectType}`,
          m.budget && `Budget: ${m.budget}`,
          "",
          m.message,
        ]
          .filter((x): x is string => typeof x === "string")
          .join("\n"),
      }),
    });
  } catch (err) {
    console.error("[contact] email notification failed", err);
  }
}

export async function sendMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // honeypot: real people never fill this hidden field
  if (clean(formData.get("website"), 200)) return { ok: true, message: "Thanks! Your message is on its way." };

  const m: Message = {
    id: randomUUID(),
    name: clean(formData.get("name"), 120),
    email: clean(formData.get("email"), 200),
    company: clean(formData.get("company"), 160),
    projectType: clean(formData.get("projectType"), 80),
    budget: clean(formData.get("budget"), 80),
    message: clean(formData.get("message"), 5000),
    createdAt: new Date().toISOString(),
    read: false,
  };

  const errors: NonNullable<ContactState>["errors"] = {};
  if (m.name.length < 2) errors.name = "Please tell me your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m.email)) errors.email = "That email doesn't look right.";
  if (m.message.length < 10) errors.message = "A couple of sentences helps me reply well.";
  if (Object.keys(errors).length) return { ok: false, message: "Please fix the highlighted fields.", errors };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (rateLimited(ip)) return { ok: false, message: "You've sent a few messages already. Please try again later or email me directly." };

  try {
    await store.addMessage(m);
  } catch (err) {
    console.error("[contact] failed to store message", err);
    return { ok: false, message: "Something went wrong saving your message. Please email me directly." };
  }
  await notify(m);
  return { ok: true, message: `Thanks ${m.name.split(" ")[0]}! Your message landed safely. I'll reply soon.` };
}
