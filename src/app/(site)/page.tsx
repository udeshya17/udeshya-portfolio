import { Suspense } from "react";
import Portfolio from "@/components/Portfolio";
import Stats from "@/components/sections/Stats";
import { StatsSkeleton } from "@/components/sections/StatsView";
import { getContent } from "@/lib/content/get";

export default async function Home() {
  const content = await getContent();
  return (
    <Portfolio
      content={content}
      stats={
        <Suspense fallback={<StatsSkeleton />}>
          <Stats config={content.statsConfig} />
        </Suspense>
      }
    />
  );
}
