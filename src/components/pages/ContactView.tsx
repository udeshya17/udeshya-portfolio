"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState } from "react";
import { sendMessage, type ContactState } from "@/app/(site)/contact/actions";
import type { ContactConfig, Faq, Profile } from "@/lib/content/types";
import SiteFooter from "../SiteFooter";
import { RealmLock } from "../world/Stage";
import { SocialLinks } from "../ui/SocialIcon";
import { FadeIn, Reveal } from "../ui/primitives";

const field =
  "w-full rounded-2xl border border-line bg-black/40 px-4 py-3.5 text-[15px] outline-none transition-colors placeholder:text-fog/60 focus:border-accent";

function Chips({ name, options }: { name: string; options: string[] }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={value} />
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => setValue(value === o ? "" : o)}
          aria-pressed={value === o}
          className={`rounded-full border px-4 py-2 text-sm transition-all ${value === o ? "border-accent bg-accent font-semibold text-black" : "border-line text-bone/80 hover:border-fog"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function ContactForm({ config }: { config: ContactConfig }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendMessage, null);
  const err = state?.errors ?? {};

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-line bg-[#0b0b13]/90 p-6 backdrop-blur-xl md:p-9">
      <div className="pointer-events-none absolute -top-32 -right-32 h-72 w-72 rounded-full bg-accent opacity-20 blur-[100px]" />
      <AnimatePresence mode="wait">
        {state?.ok ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative flex min-h-[520px] flex-col items-center justify-center text-center"
          >
            <motion.span
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-4xl text-black shadow-[0_0_60px_var(--accent)]"
            >
              ✓
            </motion.span>
            <h3 className="mt-8 font-display text-3xl font-bold">Message received</h3>
            <p className="mt-3 max-w-sm text-fog">{state.message}</p>
            <p className="mt-2 font-mono text-[11px] tracking-[0.2em] text-fog uppercase">{config.responseTime}</p>
          </motion.div>
        ) : (
          <motion.form key="form" action={action} exit={{ opacity: 0, y: -10 }} className="relative space-y-6" noValidate>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block font-mono text-[11px] tracking-[0.2em] text-fog uppercase">Your name *</span>
                <input name="name" required autoComplete="name" placeholder="Jane Doe" className={`${field} ${err.name ? "border-rose" : ""}`} />
                {err.name && <span className="mt-1 block text-xs text-rose">{err.name}</span>}
              </label>
              <label className="block">
                <span className="mb-2 block font-mono text-[11px] tracking-[0.2em] text-fog uppercase">Email *</span>
                <input name="email" type="email" required autoComplete="email" placeholder="jane@company.com" className={`${field} ${err.email ? "border-rose" : ""}`} />
                {err.email && <span className="mt-1 block text-xs text-rose">{err.email}</span>}
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block font-mono text-[11px] tracking-[0.2em] text-fog uppercase">Company (optional)</span>
              <input name="company" autoComplete="organization" placeholder="Where do you work?" className={field} />
            </label>
            {config.projectTypes.length > 0 && (
              <div>
                <span className="mb-3 block font-mono text-[11px] tracking-[0.2em] text-fog uppercase">What are we building?</span>
                <Chips name="projectType" options={config.projectTypes} />
              </div>
            )}
            {config.budgets.length > 0 && (
              <div>
                <span className="mb-3 block font-mono text-[11px] tracking-[0.2em] text-fog uppercase">Budget</span>
                <Chips name="budget" options={config.budgets} />
              </div>
            )}
            <label className="block">
              <span className="mb-2 block font-mono text-[11px] tracking-[0.2em] text-fog uppercase">Tell me about it *</span>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="Goals, timeline, links… anything that helps."
                className={`${field} resize-none ${err.message ? "border-rose" : ""}`}
              />
              {err.message && <span className="mt-1 block text-xs text-rose">{err.message}</span>}
            </label>
            {/* honeypot */}
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            {state && !state.ok && <p className="text-sm text-rose">{state.message}</p>}
            <button
              disabled={pending}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-accent py-4 font-semibold text-black transition-opacity disabled:opacity-60"
            >
              <span className="relative z-10">{pending ? "Sending through the wormhole…" : "Send message"}</span>
              <span className="relative z-10 transition-transform duration-500 group-hover:translate-x-1">→</span>
              <span className="absolute inset-0 translate-y-full bg-bone transition-transform duration-500 ease-out-expo group-hover:translate-y-0" />
            </button>
            <p className="text-center text-xs text-fog">{config.responseTime} · Your details are only used to reply to you.</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function FaqList({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line border-y border-line">
      {faqs.map((f, i) => (
        <div key={f.q}>
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-6 py-6 text-left" aria-expanded={open === i}>
            <span className="font-display text-xl font-semibold md:text-2xl">{f.q}</span>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-xl transition-transform duration-500 ${open === i ? "rotate-45 border-accent text-accent" : ""}`}>+</span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                <p className="max-w-3xl pb-6 text-[16px] leading-relaxed text-fog">{f.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function ContactView({ profile, config, faqs }: { profile: Profile; config: ContactConfig; faqs: Faq[] }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  return (
    <main className="relative z-10 px-5 pt-32 md:px-10 md:pt-40">
      <RealmLock realm="aurora" />
      <div className="mx-auto max-w-[1500px]">
        <p className="mb-6 flex items-center gap-3 font-mono text-[11px] tracking-[0.28em] text-fog uppercase">
          <span className={`h-2 w-2 rounded-full ${profile.available ? "animate-pulse-dot bg-accent" : "bg-fog"}`} />
          {profile.availabilityText}
        </p>
        <Reveal as="h1" type="words" className="h-page max-w-5xl">
          {config.heading}
        </Reveal>
        <Reveal as="p" className="mt-6 max-w-xl text-lg text-fog">
          {config.intro}
        </Reveal>

        <div className="mt-16 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="space-y-10">
            <FadeIn>
              <p className="mb-3 font-mono text-[11px] tracking-[0.25em] text-fog uppercase">Email</p>
              <button onClick={copy} className="group text-left" data-cursor={copied ? "Copied" : "Copy"}>
                <span className="font-display text-[clamp(1.4rem,2.6vw,2.4rem)] font-bold [overflow-wrap:anywhere] transition-colors group-hover:text-accent">{profile.email}</span>
                <span className="mt-1 block font-mono text-xs text-fog">{copied ? "✓ Copied" : "Click to copy"}</span>
              </button>
            </FadeIn>
            {config.bookingUrl && (
              <FadeIn>
                <a href={config.bookingUrl} target="_blank" rel="noreferrer" className="glass group flex items-center justify-between rounded-2xl p-5 hover:border-accent">
                  <span>
                    <span className="block font-display text-xl font-bold">Book a call</span>
                    <span className="text-sm text-fog">Pick a time that works for you</span>
                  </span>
                  <span className="text-2xl transition-transform group-hover:-rotate-45 group-hover:text-accent">→</span>
                </a>
              </FadeIn>
            )}
            <FadeIn>
              <p className="mb-4 font-mono text-[11px] tracking-[0.25em] text-fog uppercase">Find me on</p>
              <SocialLinks socials={profile.socials} showLabel />
            </FadeIn>
            <FadeIn className="grid grid-cols-2 border-t border-line pt-6">
              <div>
                <p className="font-serif text-lg text-fog italic">Based in</p>
                <p className="mt-1 font-display text-2xl font-bold">{profile.location}</p>
              </div>
              <div className="border-l border-line pl-6">
                <p className="font-serif text-lg text-fog italic">Replies</p>
                <p className="mt-1 font-display text-2xl font-bold">{config.responseTime.replace(/^Usually replies /i, "")}</p>
              </div>
            </FadeIn>
          </div>
          <FadeIn y={60}>
            <ContactForm config={config} />
          </FadeIn>
        </div>

        {faqs.length > 0 && (
          <section className="mt-32">
            <p className="mb-6 font-mono text-[11px] tracking-[0.28em] text-fog uppercase">
              <span className="text-accent">✦</span> Good to know
            </p>
            <Reveal as="h2" type="words" className="h-sub mb-10">
              Questions, <span className="font-serif font-normal text-accent italic">answered.</span>
            </Reveal>
            <FaqList faqs={faqs} />
          </section>
        )}
        <SiteFooter profile={profile} />
      </div>
    </main>
  );
}
