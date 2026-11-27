"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { login } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-6">
      <div>
        <p className="font-mono text-[11px] tracking-[0.3em] text-acid uppercase">Mission control</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Enter the control room</h1>
        <p className="mt-2 text-sm text-fog">Manage your profile, projects, skills, stats and résumé.</p>
      </div>
      <label className="block">
        <span className="mb-2 block font-mono text-[11px] tracking-[0.2em] text-fog uppercase">Password</span>
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-xl border border-line bg-black/40 px-4 py-3 outline-none focus:border-acid"
        />
      </label>
      {state && !state.ok && <p className="text-sm text-rose">{state.message}</p>}
      <button disabled={pending} className="w-full rounded-full bg-acid py-3 font-semibold text-black transition-opacity disabled:opacity-60">
        {pending ? "Verifying…" : "Unlock"}
      </button>
      <Link href="/" className="block text-center text-sm text-fog hover:text-bone">
        ← Back to the portfolio
      </Link>
    </form>
  );
}
