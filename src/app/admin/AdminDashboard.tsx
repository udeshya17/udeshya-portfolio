"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import type { Message, SiteContent } from "@/lib/content/types";
import {
  type ActionResult,
  deleteMessage,
  logout,
  markMessage,
  refreshPreview,
  refreshStats,
  resetContent,
  restoreDefaultResume,
  saveContent,
  uploadImage,
  uploadResume,
} from "./actions";

/* --------------------------------- schema --------------------------------- */

type FieldType = "text" | "textarea" | "tags" | "lines" | "bool" | "number" | "color" | "image" | "metrics";
type Field = { key: string; label: string; type: FieldType; help?: string; wide?: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = Record<string, any>;

const F = {
  profile: [
    { key: "name", label: "Full name", type: "text" },
    { key: "firstName", label: "Short name (navbar)", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "timezone", label: "Timezone (IANA, e.g. Asia/Kolkata)", type: "text" },
    { key: "availabilityText", label: "Availability text", type: "text" },
    { key: "available", label: "Available for work", type: "bool" },
    { key: "nowBuilding", label: "Now building (hero note)", type: "text", wide: true },
    { key: "headline", label: "Hero headline (wrap one word in *asterisks* to highlight it)", type: "text", wide: true },
    { key: "roles", label: "Roles (used in the menu and SEO)", type: "tags", wide: true },
    { key: "tagline", label: "Hero tagline", type: "textarea", wide: true },
    { key: "summary", label: "Summary", type: "textarea", wide: true },
    { key: "manifesto", label: "Manifesto (Origin section, revealed word by word)", type: "textarea", wide: true },
  ],
  social: [
    { key: "label", label: "Label", type: "text" },
    { key: "url", label: "URL", type: "text" },
  ],
  stat: [
    { key: "value", label: "Number", type: "number" },
    { key: "suffix", label: "Suffix (e.g. +)", type: "text" },
    { key: "label", label: "Label", type: "text", wide: true },
  ],
  domain: [
    { key: "name", label: "Name", type: "text" },
    { key: "tags", label: "Tags", type: "tags" },
    { key: "blurb", label: "Blurb", type: "textarea", wide: true },
  ],
  skill: [
    { key: "name", label: "Group name", type: "text" },
    { key: "items", label: "Skills", type: "tags", wide: true },
  ],
  experience: [
    { key: "role", label: "Role", type: "text" },
    { key: "company", label: "Company", type: "text" },
    { key: "type", label: "Type", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "start", label: "Start", type: "text" },
    { key: "end", label: "End", type: "text" },
    { key: "highlights", label: "Highlights (one per line)", type: "lines", wide: true },
    { key: "stack", label: "Stack", type: "tags", wide: true },
  ],
  project: [
    { key: "name", label: "Name", type: "text" },
    { key: "slug", label: "URL slug (auto from name if empty)", type: "text" },
    { key: "category", label: "Category (e.g. Fintech · Blockchain)", type: "text" },
    { key: "year", label: "Year", type: "text" },
    { key: "tagline", label: "Tagline", type: "text", wide: true },
    { key: "description", label: "Short description (cards)", type: "textarea", wide: true },
    { key: "role", label: "Your role", type: "text" },
    { key: "client", label: "Client / company", type: "text" },
    { key: "duration", label: "Timeline", type: "text" },
    { key: "featured", label: "Featured on home page", type: "bool" },
    { key: "stack", label: "Stack", type: "tags", wide: true },
    { key: "url", label: "Live URL (auto-captures a scrolling preview)", type: "text" },
    { key: "repo", label: "Repo URL", type: "text" },
    { key: "accent", label: "Accent color", type: "color" },
    { key: "preview", label: "Website screenshot (optional; overrides the auto-capture; use a tall full-page image)", type: "image", wide: true },
    { key: "image", label: "Cover image (used when there is no live URL)", type: "image", wide: true },
    { key: "overview", label: "Case study · Overview", type: "textarea", wide: true },
    { key: "challenge", label: "Case study · Challenge", type: "textarea", wide: true },
    { key: "solution", label: "Case study · Solution", type: "textarea", wide: true },
    { key: "features", label: "Key features (one per line)", type: "lines", wide: true },
    { key: "results", label: "Impact metrics (one per line: value | label)", type: "metrics", wide: true },
    { key: "gallery", label: "Gallery image URLs (one per line)", type: "lines", wide: true },
  ],
  service: [
    { key: "title", label: "Title", type: "text" },
    { key: "deliverables", label: "Deliverables", type: "tags" },
    { key: "blurb", label: "Description", type: "textarea", wide: true },
  ],
  step: [
    { key: "title", label: "Step", type: "text" },
    { key: "duration", label: "When", type: "text" },
    { key: "blurb", label: "Description", type: "textarea", wide: true },
  ],
  testimonial: [
    { key: "name", label: "Name", type: "text" },
    { key: "role", label: "Role", type: "text" },
    { key: "company", label: "Company", type: "text" },
    { key: "quote", label: "Quote (use real words from real people)", type: "textarea", wide: true },
    { key: "avatar", label: "Photo", type: "image", wide: true },
  ],
  faq: [
    { key: "q", label: "Question", type: "text", wide: true },
    { key: "a", label: "Answer", type: "textarea", wide: true },
  ],
  contact: [
    { key: "heading", label: "Page heading", type: "text", wide: true },
    { key: "intro", label: "Intro", type: "textarea", wide: true },
    { key: "responseTime", label: "Response time", type: "text" },
    { key: "bookingUrl", label: "Booking link (Calendly / Cal.com, optional)", type: "text" },
    { key: "projectTypes", label: "Project type options", type: "tags", wide: true },
    { key: "budgets", label: "Budget options", type: "tags", wide: true },
  ],
  education: [
    { key: "degree", label: "Degree", type: "text" },
    { key: "field", label: "Field", type: "text" },
    { key: "school", label: "School", type: "text", wide: true },
    { key: "start", label: "Start", type: "text" },
    { key: "end", label: "End", type: "text" },
    { key: "score", label: "Score", type: "text" },
  ],
  statsConfig: [
    { key: "githubUsername", label: "GitHub username", type: "text" },
    { key: "leetcodeUsername", label: "LeetCode username", type: "text" },
    { key: "showGithub", label: "Show GitHub analytics", type: "bool" },
    { key: "showLeetcode", label: "Show LeetCode analytics", type: "bool" },
  ],
  seo: [
    { key: "title", label: "Page title", type: "text", wide: true },
    { key: "description", label: "Meta description", type: "textarea", wide: true },
    { key: "siteUrl", label: "Site URL (for social previews)", type: "text", wide: true },
  ],
} satisfies Record<string, Field[]>;

const blank = (fields: Field[]): Obj =>
  Object.fromEntries(
    fields.map((f) => [
      f.key,
      f.type === "tags" || f.type === "lines" || f.type === "metrics" ? [] : f.type === "bool" ? false : f.type === "number" ? 0 : f.type === "color" ? "#d4ff3f" : "",
    ]),
  );

/* --------------------------------- inputs --------------------------------- */

const inputCls = "w-full rounded-xl border border-line bg-black/30 px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-acid";

function Tags({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const items = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length) onChange([...value, ...items]);
    setDraft("");
  };
  return (
    <div className={`${inputCls} flex flex-wrap gap-1.5`}>
      {value.map((t, i) => (
        <span key={`${t}-${i}`} className="flex items-center gap-1 rounded-full bg-white/10 py-1 pr-1.5 pl-3 text-sm">
          {t}
          <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="rounded-full px-1 text-fog hover:text-rose" aria-label={`Remove ${t}`}>
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder="Type, then Enter"
        className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-none"
      />
    </div>
  );
}

function ImageInput({ value, onChange, toast }: { value: string; onChange: (v: string) => void; toast: (r: ActionResult) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, start] = useTransition();
  return (
    <div className="flex items-start gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-16 w-24 shrink-0 rounded-lg border border-line object-cover" />
      ) : (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-xs text-fog">none</div>
      )}
      <div className="flex-1 space-y-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" className={inputCls} />
        <div className="flex gap-2">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.set("file", file);
              start(async () => {
                const r = await uploadImage(fd);
                toast(r);
                if (r.ok && r.url) onChange(r.url);
              });
              e.target.value = "";
            }}
          />
          <button type="button" onClick={() => ref.current?.click()} className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-acid" disabled={busy}>
            {busy ? "Uploading…" : "Upload image"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")} className="rounded-full px-3 py-1.5 text-xs text-fog hover:text-rose">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldInput({ f, value, onChange, toast }: { f: Field; value: unknown; onChange: (v: unknown) => void; toast: (r: ActionResult) => void }) {
  switch (f.type) {
    case "textarea":
      return <textarea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} rows={4} className={inputCls} />;
    case "lines":
      return (
        <textarea
          value={((value as string[]) ?? []).join("\n")}
          onChange={(e) => onChange(e.target.value.split("\n"))}
          onBlur={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
          rows={5}
          className={inputCls}
        />
      );
    case "tags":
      return <Tags value={(value as string[]) ?? []} onChange={onChange} />;
    case "metrics":
      return (
        <textarea
          defaultValue={((value as { value: string; label: string }[]) ?? []).map((m) => `${m.value} | ${m.label}`).join("\n")}
          onBlur={(e) =>
            onChange(
              e.target.value
                .split("\n")
                .map((l) => l.split("|").map((x) => x.trim()))
                .filter(([v]) => v)
                .map(([v, ...rest]) => ({ value: v, label: rest.join(" | ") })),
            )
          }
          rows={4}
          placeholder="25% | Faster loads"
          className={inputCls}
        />
      );
    case "bool":
      return (
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          onClick={() => onChange(!value)}
          className={`relative h-7 w-12 rounded-full transition-colors ${value ? "bg-acid" : "bg-white/15"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-black transition-all ${value ? "left-6" : "left-1"}`} />
        </button>
      );
    case "number":
      return <input type="number" value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className={inputCls} />;
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input type="color" value={String(value || "#d4ff3f")} onChange={(e) => onChange(e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-transparent" />
          <input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputCls} />
        </div>
      );
    case "image":
      return <ImageInput value={String(value ?? "")} onChange={onChange} toast={toast} />;
    default:
      return <input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
  }
}

function ObjectForm({ fields, value, onChange, toast }: { fields: Field[]; value: Obj; onChange: (v: Obj) => void; toast: (r: ActionResult) => void }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {fields.map((f) => (
        <label key={f.key} className={`block ${f.wide ? "md:col-span-2" : ""}`} onClick={(e) => f.type === "bool" && e.preventDefault()}>
          <span className="mb-2 block font-mono text-[11px] tracking-[0.15em] text-fog uppercase">{f.label}</span>
          <FieldInput f={f} value={value[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} toast={toast} />
          {f.help && <span className="mt-1 block text-xs text-fog">{f.help}</span>}
        </label>
      ))}
    </div>
  );
}

function Collection({
  items,
  onChange,
  fields,
  title,
  noun,
  toast,
}: {
  items: Obj[];
  onChange: (v: Obj[]) => void;
  fields: Field[];
  title: (item: Obj, i: number) => string;
  noun: string;
  toast: (r: ActionResult) => void;
}) {
  const [open, setOpen] = useState<number | null>(items.length ? 0 : null);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen(j);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white/[0.02]">
          <div className="flex items-center gap-2 px-4 py-3">
            <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex flex-1 items-center gap-3 text-left">
              <span className="font-mono text-xs text-fog">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-medium">{title(item, i) || `Untitled ${noun}`}</span>
              <span className={`ml-auto text-fog transition-transform ${open === i ? "rotate-180" : ""}`}>⌄</span>
            </button>
            <button type="button" onClick={() => move(i, -1)} className="rounded-lg px-2 py-1 text-fog hover:bg-white/10 hover:text-bone" aria-label="Move up">
              ↑
            </button>
            <button type="button" onClick={() => move(i, 1)} className="rounded-lg px-2 py-1 text-fog hover:bg-white/10 hover:text-bone" aria-label="Move down">
              ↓
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete this ${noun}?`)) {
                  onChange(items.filter((_, k) => k !== i));
                  setOpen(null);
                }
              }}
              className="rounded-lg px-2 py-1 text-fog hover:bg-rose/15 hover:text-rose"
              aria-label="Delete"
            >
              ✕
            </button>
          </div>
          {open === i && (
            <div className="border-t border-line p-5">
              <ObjectForm fields={fields} value={item} onChange={(v) => onChange(items.map((x, k) => (k === i ? v : x)))} toast={toast} />
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          onChange([...items, blank(fields)]);
          setOpen(items.length);
        }}
        className="w-full rounded-2xl border border-dashed border-line py-4 text-sm text-fog transition-colors hover:border-acid hover:text-acid"
      >
        + Add {noun}
      </button>
    </div>
  );
}

/* --------------------------------- panels --------------------------------- */

function Card({ title, desc, children, actions }: { title: string; desc?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="glass rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
          {desc && <p className="mt-1 text-sm text-fog">{desc}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function ResumePanel({ content, onSaved, toast }: { content: SiteContent; onSaved: (c: SiteContent) => void; toast: (r: ActionResult) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, start] = useTransition();
  const [drag, setDrag] = useState(false);
  const send = (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const r = await uploadResume(fd);
      toast(r);
      if (r.ok && r.content) onSaved(r.content);
    });
  };
  return (
    <Card title="Résumé" desc="Visitors download this from the navbar, hero and contact section.">
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-line p-5">
        <div className="flex h-14 w-11 items-center justify-center rounded-md bg-rose/15 font-mono text-[10px] font-bold text-rose">PDF</div>
        <div className="flex-1">
          <p className="font-medium">{content.resume.fileName}</p>
          <p className="text-sm text-fog">
            {(content.resume.size / 1024).toFixed(0)} KB · updated {new Date(content.resume.updatedAt).toLocaleString()}
          </p>
        </div>
        <a href="/api/resume?view" target="_blank" rel="noreferrer" className="rounded-full border border-line px-4 py-2 text-sm hover:border-acid">
          Preview
        </a>
        <a href="/api/resume" className="rounded-full border border-line px-4 py-2 text-sm hover:border-acid">
          Download
        </a>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) send(f);
        }}
        onClick={() => ref.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${drag ? "border-acid bg-acid/5" : "border-line hover:border-fog"}`}
      >
        <p className="font-display text-xl font-bold">{busy ? "Uploading…" : "Drop a new PDF here"}</p>
        <p className="mt-1 text-sm text-fog">or click to browse · max 4 MB · replaces the live résumé instantly</p>
        <input
          ref={ref}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) send(f);
            e.target.value = "";
          }}
        />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          confirm("Restore the résumé bundled with the site?") &&
          start(async () => {
            const r = await restoreDefaultResume();
            toast(r);
            if (r.ok && r.content) onSaved(r.content);
          })
        }
        className="mt-4 text-sm text-fog hover:text-rose"
      >
        Restore bundled résumé
      </button>
    </Card>
  );
}

/* ---------------------------------- root ---------------------------------- */

const TABS = [
  { id: "profile", label: "Profile", icon: "◉" },
  { id: "highlights", label: "Highlights", icon: "✦" },
  { id: "inbox", label: "Inbox", icon: "✉" },
  { id: "domains", label: "Domains", icon: "◎" },
  { id: "services", label: "Services", icon: "◆" },
  { id: "skills", label: "Skills", icon: "✳" },
  { id: "experience", label: "Experience", icon: "⟡" },
  { id: "projects", label: "Projects", icon: "◈" },
  { id: "process", label: "Process", icon: "→" },
  { id: "testimonials", label: "Testimonials", icon: "❝" },
  { id: "contact", label: "Contact page", icon: "☏" },
  { id: "education", label: "Education", icon: "◇" },
  { id: "stats", label: "Live stats", icon: "∿" },
  { id: "resume", label: "Résumé", icon: "⇩" },
  { id: "seo", label: "SEO", icon: "⌕" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AdminDashboard({ initial, storage, initialMessages }: { initial: SiteContent; storage: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const unread = messages.filter((m) => !m.read).length;
  const router = useRouter();
  const [content, setContent] = useState<SiteContent>(initial);
  const [saved, setSaved] = useState<string>(JSON.stringify(initial));
  const [tab, setTab] = useState<TabId>("profile");
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const dirty = useMemo(() => JSON.stringify(content) !== saved, [content, saved]);

  const toast = (r: ActionResult) => {
    setNotice(r);
    window.setTimeout(() => setNotice((n) => (n === r ? null : n)), 3500);
  };
  const applySaved = (c: SiteContent) => {
    setContent(c);
    setSaved(JSON.stringify(c));
  };
  const set = <K extends keyof SiteContent>(key: K, v: SiteContent[K]) => setContent((c) => ({ ...c, [key]: v }));

  const save = () =>
    start(async () => {
      const r = await saveContent(content);
      toast(r);
      if (r.ok && r.content) applySaved(r.content);
    });

  let panel: ReactNode;
  switch (tab) {
    case "profile":
      panel = (
        <div className="space-y-6">
          <Card title="Profile" desc="Hero, navbar, menu and contact all read from here.">
            <ObjectForm fields={F.profile} value={content.profile} onChange={(v) => set("profile", v as SiteContent["profile"])} toast={toast} />
          </Card>
          <Card title="Social links" desc="Icons are detected automatically from the URL: GitHub, LinkedIn, X, Instagram, YouTube, LeetCode, WhatsApp (wa.me), Telegram, Discord, Medium, Dev.to, Peerlist, Dribbble, Behance, Upwork, Fiverr and more. Use mailto: for email.">
            <Collection
              items={content.profile.socials}
              onChange={(v) => set("profile", { ...content.profile, socials: v as SiteContent["profile"]["socials"] })}
              fields={F.social}
              title={(x) => x.label}
              noun="link"
              toast={toast}
            />
          </Card>
        </div>
      );
      break;
    case "highlights":
      panel = (
        <Card title="Highlight counters" desc="Animated numbers in the Origin section.">
          <Collection items={content.stats} onChange={(v) => set("stats", v as SiteContent["stats"])} fields={F.stat} title={(x) => `${x.value}${x.suffix} ${x.label}`} noun="counter" toast={toast} />
        </Card>
      );
      break;
    case "inbox":
      panel = (
        <Card title="Inbox" desc="Messages sent through the contact page. Set RESEND_API_KEY + CONTACT_NOTIFY_EMAIL to also get them by email.">
          {messages.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-10 text-center text-fog">No messages yet. They&apos;ll land here.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <article key={m.id} className={`rounded-2xl border p-5 ${m.read ? "border-line" : "border-acid/40 bg-acid/[0.04]"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {!m.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-acid" />}
                        {m.name} <span className="font-normal text-fog">· {m.email}</span>
                      </p>
                      <p className="mt-1 text-xs text-fog">
                        {new Date(m.createdAt).toLocaleString()}
                        {m.company && ` · ${m.company}`}
                        {m.projectType && ` · ${m.projectType}`}
                        {m.budget && ` · ${m.budget}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message")}`}
                        className="rounded-full bg-acid px-4 py-1.5 text-xs font-semibold text-black"
                      >
                        Reply
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          start(async () => {
                            await markMessage(m.id, !m.read);
                            setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, read: !x.read } : x)));
                          })
                        }
                        className="rounded-full border border-line px-4 py-1.5 text-xs hover:border-fog"
                      >
                        {m.read ? "Mark unread" : "Mark read"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          confirm("Delete this message?") &&
                          start(async () => {
                            toast(await deleteMessage(m.id));
                            setMessages((list) => list.filter((x) => x.id !== m.id));
                          })
                        }
                        className="rounded-full px-3 py-1.5 text-xs text-fog hover:text-rose"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-wrap text-bone/90">{m.message}</p>
                </article>
              ))}
            </div>
          )}
        </Card>
      );
      break;
    case "services":
      panel = (
        <Card title="Services" desc="What you offer clients, shown on the home page.">
          <Collection items={content.services} onChange={(v) => set("services", v as SiteContent["services"])} fields={F.service} title={(x) => x.title} noun="service" toast={toast} />
        </Card>
      );
      break;
    case "process":
      panel = (
        <Card title="Process" desc="How you work, step by step.">
          <Collection items={content.process} onChange={(v) => set("process", v as SiteContent["process"])} fields={F.step} title={(x) => x.title} noun="step" toast={toast} />
        </Card>
      );
      break;
    case "testimonials":
      panel = (
        <Card title="Testimonials" desc="Hidden on the site until you add at least one. Only use real quotes, with permission.">
          <Collection items={content.testimonials} onChange={(v) => set("testimonials", v as SiteContent["testimonials"])} fields={F.testimonial} title={(x) => `${x.name} · ${x.company}`} noun="testimonial" toast={toast} />
        </Card>
      );
      break;
    case "contact":
      panel = (
        <div className="space-y-6">
          <Card title="Contact page">
            <ObjectForm fields={F.contact} value={content.contact} onChange={(v) => set("contact", v as SiteContent["contact"])} toast={toast} />
          </Card>
          <Card title="FAQ">
            <Collection items={content.faqs} onChange={(v) => set("faqs", v as SiteContent["faqs"])} fields={F.faq} title={(x) => x.q} noun="question" toast={toast} />
          </Card>
        </div>
      );
      break;
    case "domains":
      panel = (
        <Card title="Domains (the Multiverse)" desc="Each domain becomes a universe card.">
          <Collection items={content.domains} onChange={(v) => set("domains", v as SiteContent["domains"])} fields={F.domain} title={(x) => x.name} noun="domain" toast={toast} />
        </Card>
      );
      break;
    case "skills":
      panel = (
        <Card title="Skills (the Constellation)" desc="Groups of skills rendered as chips.">
          <Collection items={content.skills} onChange={(v) => set("skills", v as SiteContent["skills"])} fields={F.skill} title={(x) => `${x.name} · ${x.items?.length ?? 0}`} noun="group" toast={toast} />
        </Card>
      );
      break;
    case "experience":
      panel = (
        <Card title="Experience (Evolution)" desc="Shown top to bottom on the timeline. Newest first works best.">
          <Collection items={content.experience} onChange={(v) => set("experience", v as SiteContent["experience"])} fields={F.experience} title={(x) => `${x.role} @ ${x.company}`} noun="role" toast={toast} />
        </Card>
      );
      break;
    case "projects":
      panel = (
        <div className="space-y-6">
          <Card title="Projects" desc="Each project gets its own case-study page at /projects/<slug>. Featured ones appear in the home gallery.">
            <Collection items={content.projects} onChange={(v) => set("projects", v as SiteContent["projects"])} fields={F.project} title={(x) => `${x.featured ? "★ " : ""}${x.name}`} noun="project" toast={toast} />
          </Card>
          <Card title="Live website previews" desc="Projects with a live URL get an automatic full-page screenshot that scrolls inside a browser frame. Refresh after you redesign a site.">
            <div className="space-y-2">
              {content.projects.filter((p) => p.url).map((p) => (
                <div key={p.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
                  <span>
                    <span className="font-medium">{p.name}</span> <span className="text-sm text-fog">{p.url}</span>
                  </span>
                  <button type="button" disabled={pending} onClick={() => start(async () => toast(await refreshPreview(p.url)))} className="rounded-full border border-line px-4 py-1.5 text-xs hover:border-acid disabled:opacity-50">
                    ↻ Refresh preview
                  </button>
                </div>
              ))}
              {!content.projects.some((p) => p.url) && <p className="text-sm text-fog">Add a live URL to a project to enable previews.</p>}
            </div>
          </Card>
        </div>
      );
      break;
    case "education":
      panel = (
        <Card title="Education">
          <Collection items={content.education} onChange={(v) => set("education", v as SiteContent["education"])} fields={F.education} title={(x) => `${x.degree} · ${x.school}`} noun="entry" toast={toast} />
        </Card>
      );
      break;
    case "stats":
      panel = (
        <Card
          title="Live stats (Signal)"
          desc="Fetched from LeetCode and GitHub, cached for a few hours. Set GITHUB_TOKEN on the server for higher rate limits."
          actions={
            <button type="button" onClick={() => start(async () => toast(await refreshStats()))} className="rounded-full border border-line px-4 py-2 text-sm hover:border-acid">
              ↻ Refresh now
            </button>
          }
        >
          <ObjectForm fields={F.statsConfig} value={content.statsConfig} onChange={(v) => set("statsConfig", v as SiteContent["statsConfig"])} toast={toast} />
        </Card>
      );
      break;
    case "resume":
      panel = <ResumePanel content={content} onSaved={applySaved} toast={toast} />;
      break;
    case "seo":
      panel = (
        <Card title="SEO & sharing">
          <ObjectForm fields={F.seo} value={content.seo} onChange={(v) => set("seo", v as SiteContent["seo"])} toast={toast} />
        </Card>
      );
      break;
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_85%_0%,rgb(139_108_255/0.14),transparent_40%)]">
      <header className="sticky top-0 z-20 border-b border-line bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-acid uppercase">Mission control</p>
            <p className="font-display text-lg font-bold">{content.profile.name}</p>
          </div>
          <span className="ml-2 hidden rounded-full border border-line px-3 py-1 font-mono text-[10px] text-fog uppercase sm:inline">storage: {storage}</span>
          <div className="ml-auto flex items-center gap-2">
            <a href="/" target="_blank" className="hidden rounded-full border border-line px-4 py-2 text-sm hover:border-bone sm:inline">
              View site ↗
            </a>
            <button
              type="button"
              onClick={() => start(async () => {
                await logout();
                router.refresh();
              })}
              className="rounded-full px-4 py-2 text-sm text-fog hover:text-bone"
            >
              Log out
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending}
              className="rounded-full bg-acid px-5 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-40"
            >
              {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>
      </header>

      {storage === "temporary" && (
        <div className="mx-auto mt-6 max-w-7xl px-5">
          <p className="rounded-2xl border border-rose/40 bg-rose/10 px-5 py-4 text-sm">
            ⚠ No database connected. Edits and uploads are temporary on Vercel and will disappear. Add <code className="text-acid">MONGODB_URI</code> in
            Vercel → Settings → Environment Variables, then redeploy.
          </p>
        </div>
      )}
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 md:grid-cols-[220px_1fr]">
        <nav className="no-scrollbar flex gap-1 overflow-x-auto md:sticky md:top-24 md:flex-col md:self-start">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm whitespace-nowrap transition-colors ${tab === t.id ? "bg-white/10 text-bone" : "text-fog hover:bg-white/5 hover:text-bone"}`}
            >
              <span className={tab === t.id ? "text-acid" : ""}>{t.icon}</span>
              {t.label}
              {t.id === "inbox" && unread > 0 && <span className="ml-auto rounded-full bg-acid px-2 py-0.5 text-[10px] font-bold text-black">{unread}</span>}
            </button>
          ))}
          <div className="my-3 hidden h-px bg-line md:block" />
          <button
            type="button"
            onClick={() =>
              confirm("Reset ALL content to the résumé defaults? Your uploaded résumé is kept.") &&
              start(async () => {
                const r = await resetContent();
                toast(r);
                if (r.ok && r.content) applySaved(r.content);
              })
            }
            className="rounded-xl px-4 py-2.5 text-left text-sm whitespace-nowrap text-fog hover:text-rose"
          >
            ⟲ Reset to defaults
          </button>
        </nav>
        <div className="min-w-0">{panel}</div>
      </div>

      {notice && (
        <div
          role="status"
          className={`fixed right-5 bottom-5 z-30 max-w-sm rounded-2xl border px-5 py-4 text-sm shadow-2xl backdrop-blur-xl ${notice.ok ? "border-acid/40 bg-acid/10 text-bone" : "border-rose/40 bg-rose/10 text-bone"}`}
        >
          {notice.ok ? "✓ " : "⚠ "}
          {notice.message}
        </div>
      )}
    </div>
  );
}
