import { getContent } from "@/lib/content/get";
import { renderProjectOg, siteUrl } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Project case study";

export async function generateStaticParams() {
  const { projects } = await getContent();
  return projects.length ? projects.map((p) => ({ slug: p.slug })) : [{ slug: "__none__" }];
}

export default async function ProjectTwitter({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { projects, profile, seo } = await getContent();
  const p = projects.find((x) => x.slug === slug) ?? projects[0];
  const url = siteUrl(seo.siteUrl);
  return renderProjectOg({
    name: p.name,
    tagline: p.tagline,
    category: p.category.split("·")[0].trim(),
    year: p.year,
    stack: p.stack,
    accent: p.accent || "#b69cff",
    author: profile.name,
    host: url ? new URL(url).host : "",
  });
}
