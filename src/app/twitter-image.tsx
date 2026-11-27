import { getContent } from "@/lib/content/get";
import { renderSiteOg, siteUrl } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Udeshya Sharma — Senior Full-Stack Developer";

export default async function TwitterImage() {
  const { profile, stats, seo } = await getContent();
  const launches = stats.find((s) => /launch/i.test(s.label)) ?? stats[0];
  const url = siteUrl(seo.siteUrl);
  return renderSiteOg({
    name: profile.name,
    title: profile.title,
    headline: profile.headline || profile.title,
    points: [
      launches ? `${launches.value}${launches.suffix} ${launches.label.toLowerCase()}` : "",
      "Fintech · AI · Web3",
      `${profile.location} · Remote worldwide`,
    ].filter(Boolean),
    host: url ? new URL(url).host : "",
    available: profile.available,
  });
}
