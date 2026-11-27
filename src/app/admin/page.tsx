import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { getContentFresh } from "@/lib/content/get";
import { storageKind, store } from "@/lib/content/store";
import AdminDashboard from "./AdminDashboard";
import LoginForm from "./LoginForm";

// server actions on this page (uploads, preview refresh) may need extra time
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Mission Control",
  robots: { index: false, follow: false },
};

async function Gate() {
  await connection(); // auth checks read the clock; always render at request time
  if (!adminConfigured()) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-bold">Admin is locked</h1>
        <p className="mt-3 text-fog">
          Set <code className="rounded bg-white/10 px-1.5 py-0.5 text-acid">ADMIN_PASSWORD</code> (and{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-acid">SESSION_SECRET</code>) in your environment, then restart the server.
        </p>
      </Shell>
    );
  }
  if (!(await isAdmin())) {
    return (
      <Shell>
        <LoginForm />
      </Shell>
    );
  }
  const [content, messages] = await Promise.all([getContentFresh(), store.listMessages().catch(() => [])]);
  return <AdminDashboard initial={content} storage={storageKind} initialMessages={messages} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_70%_20%,rgb(139_108_255/0.18),transparent_45%),radial-gradient(circle_at_20%_85%,rgb(212_255_63/0.08),transparent_40%)] p-6">
      <div className="glass w-full max-w-md rounded-[2rem] p-8 md:p-10">{children}</div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center font-mono text-xs tracking-[0.3em] text-fog uppercase">
          Opening mission control…
        </main>
      }
    >
      <Gate />
    </Suspense>
  );
}
