import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CalendarDay, LeetcodeStats, StatsFailure } from "./types";

const QUERY = `query($u:String!){
  allQuestionsCount{difficulty count}
  matchedUser(username:$u){
    username
    profile{ranking}
    submitStatsGlobal{acSubmissionNum{difficulty count submissions}}
    submitStats{totalSubmissionNum{difficulty count submissions}}
    badges{name icon}
    languageProblemCount{languageName problemsSolved}
    tagProblemCounts{
      advanced{tagName problemsSolved}
      intermediate{tagName problemsSolved}
      fundamental{tagName problemsSolved}
    }
    userCalendar{streak totalActiveDays submissionCalendar}
  }
  userContestRanking(username:$u){rating attendedContestsCount topPercentage}
}`;

type Num = { difficulty: string; count: number; submissions?: number };
const pick = (arr: Num[] | undefined, d: string) => arr?.find((x) => x.difficulty === d);

function levelFor(count: number, max: number): CalendarDay["level"] {
  if (count <= 0) return 0;
  const r = count / Math.max(max, 1);
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
}

export async function getLeetcodeStats(username: string): Promise<LeetcodeStats | StatsFailure> {
  "use cache";
  cacheTag("stats", `leetcode:${username}`);
  cacheLife("hours");

  const url = `https://leetcode.com/u/${username}/`;
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
        "User-Agent": "Mozilla/5.0 (portfolio-stats)",
      },
      body: JSON.stringify({ query: QUERY, variables: { u: username } }),
    });
    if (!res.ok) throw new Error(`LeetCode request failed (${res.status})`);
    const { data } = await res.json();
    const u = data?.matchedUser;
    if (!u) throw new Error("LeetCode user not found");

    const ac: Num[] = u.submitStatsGlobal?.acSubmissionNum ?? [];
    const tot: Num[] = u.submitStats?.totalSubmissionNum ?? [];
    const all: Num[] = data.allQuestionsCount ?? [];

    const acSubs = pick(ac, "All")?.submissions ?? 0;
    const totalSubs = pick(tot, "All")?.submissions ?? 0;

    // Calendar: unix-seconds -> count. Build the trailing 52 weeks.
    const raw: Record<string, number> = JSON.parse(u.userCalendar?.submissionCalendar || "{}");
    const byDate = new Map<string, number>();
    for (const [ts, c] of Object.entries(raw)) {
      const d = new Date(Number(ts) * 1000).toISOString().slice(0, 10);
      byDate.set(d, (byDate.get(d) ?? 0) + c);
    }
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 364));
    start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // align to Sunday like GitHub
    const counts: { date: string; count: number }[] = [];
    for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      counts.push({ date: key, count: byDate.get(key) ?? 0 });
    }
    const max = Math.max(...counts.map((c) => c.count), 1);
    const days = counts.map((c) => ({ ...c, level: levelFor(c.count, max) }));

    const tags = [
      ...(u.tagProblemCounts?.advanced ?? []),
      ...(u.tagProblemCounts?.intermediate ?? []),
      ...(u.tagProblemCounts?.fundamental ?? []),
    ] as { tagName: string; problemsSolved: number }[];

    const contest = data.userContestRanking;

    return {
      ok: true,
      username: u.username,
      url,
      ranking: u.profile?.ranking ?? null,
      solved: {
        all: pick(ac, "All")?.count ?? 0,
        easy: pick(ac, "Easy")?.count ?? 0,
        medium: pick(ac, "Medium")?.count ?? 0,
        hard: pick(ac, "Hard")?.count ?? 0,
      },
      totals: {
        all: pick(all, "All")?.count ?? 0,
        easy: pick(all, "Easy")?.count ?? 0,
        medium: pick(all, "Medium")?.count ?? 0,
        hard: pick(all, "Hard")?.count ?? 0,
      },
      acceptanceRate: totalSubs ? Math.round((acSubs / totalSubs) * 1000) / 10 : null,
      contest: contest
        ? {
            rating: Math.round(contest.rating),
            attended: contest.attendedContestsCount,
            topPercentage: contest.topPercentage ?? null,
          }
        : null,
      badges: (u.badges ?? []).slice(0, 6).map((b: { name: string; icon: string }) => ({
        name: b.name,
        icon: b.icon.startsWith("http") ? b.icon : `https://leetcode.com${b.icon}`,
      })),
      topSkills: tags
        .sort((a, b) => b.problemsSolved - a.problemsSolved)
        .slice(0, 8)
        .map((t) => ({ name: t.tagName, count: t.problemsSolved })),
      languages: (u.languageProblemCount ?? [])
        .sort(
          (a: { problemsSolved: number }, b: { problemsSolved: number }) => b.problemsSolved - a.problemsSolved,
        )
        .slice(0, 5)
        .map((l: { languageName: string; problemsSolved: number }) => ({
          name: l.languageName,
          solved: l.problemsSolved,
        })),
      calendar: {
        total: counts.reduce((s, c) => s + c.count, 0),
        streak: u.userCalendar?.streak ?? 0,
        activeDays: u.userCalendar?.totalActiveDays ?? 0,
        days,
      },
    };
  } catch (err) {
    return { ok: false, username, url, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
