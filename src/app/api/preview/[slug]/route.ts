import { connection } from "next/server";
import { getContent } from "@/lib/content/get";
import { getOrCapturePreview } from "@/lib/preview";

/** Live website preview for a project (only for URLs listed in the site content). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const { projects } = await getContent();
  const project = projects.find((p) => p.slug === slug);
  if (!project?.url || !/^https?:\/\//.test(project.url)) return new Response("Not found", { status: 404 });
  const buf = await getOrCapturePreview(project.url);
  if (!buf) return new Response("Preview unavailable", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
