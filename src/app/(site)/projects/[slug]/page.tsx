import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProjectDetail from "@/components/pages/ProjectDetail";
import { getContent } from "@/lib/content/get";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { projects } = await getContent();
  return projects.length ? projects.map((p) => ({ slug: p.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { projects } = await getContent();
  const p = projects.find((x) => x.slug === slug);
  if (!p) return { title: "Project not found" };
  return {
    title: `${p.name} — Case study`,
    description: p.description,
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: { type: "article", url: `/projects/${p.slug}`, title: `${p.name} — ${p.tagline}`, description: p.description },
    twitter: { card: "summary_large_image", title: `${p.name} — ${p.tagline}`, description: p.description },
  };
}

async function Project({ slug }: { slug: string }) {
  const { projects, profile } = await getContent();
  const index = projects.findIndex((x) => x.slug === slug);
  if (index === -1) notFound();
  const next = projects[(index + 1) % projects.length];
  return <ProjectDetail p={projects[index]} next={next} index={index} total={projects.length} profile={profile} />;
}

function ProjectSkeleton() {
  return (
    <main className="relative z-10 px-5 pt-36 md:px-10">
      <div className="mx-auto max-w-[1500px] animate-pulse space-y-6">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="h-28 w-3/4 rounded-2xl bg-white/10" />
        <div className="h-[60vh] rounded-[1.6rem] bg-white/5" />
      </div>
    </main>
  );
}

export default function ProjectPage({ params }: Props) {
  return <Suspense fallback={<ProjectSkeleton />}>{params.then(({ slug }) => <Project slug={slug} />)}</Suspense>;
}
