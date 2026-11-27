import { getGithubStats } from "@/lib/stats/github";
import { getLeetcodeStats } from "@/lib/stats/leetcode";
import type { StatsConfig } from "@/lib/content/types";
import StatsView from "./StatsView";

/** Server component: fetches (cached) live stats, then hands them to the animated view. */
export default async function Stats({ config }: { config: StatsConfig }) {
  const [leetcode, github] = await Promise.all([
    config.showLeetcode && config.leetcodeUsername ? getLeetcodeStats(config.leetcodeUsername) : null,
    config.showGithub && config.githubUsername ? getGithubStats(config.githubUsername) : null,
  ]);
  return <StatsView leetcode={leetcode} github={github} />;
}
