import { Suspense } from "react";
import Portfolio from "@/components/Portfolio";
import Stats from "@/components/sections/Stats";
import { StatsSkeleton } from "@/components/sections/StatsView";
import { getContent } from "@/lib/content/get";
import { siteUrl } from "@/lib/og";

export default async function Home() {
  const content = await getContent();
  const { profile, skills, seo } = content;
  const url = siteUrl(seo.siteUrl);
  // structured data: helps search engines show a rich result for your name
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.title,
    description: seo.description,
    url,
    email: `mailto:${profile.email}`,
    address: { "@type": "PostalAddress", addressCountry: profile.location },
    sameAs: profile.socials.map((s) => s.url).filter((u) => /^https?:/.test(u)),
    knowsAbout: skills.filter((g) => g.name !== "Human").flatMap((g) => g.items),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Portfolio
      content={content}
      stats={
        <Suspense fallback={<StatsSkeleton />}>
          <Stats config={content.statsConfig} />
        </Suspense>
      }
      />
    </>
  );
}
