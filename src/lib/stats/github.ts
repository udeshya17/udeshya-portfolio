import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CalendarDay, GithubStats, StatsFailure } from "./types";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Go: "#00ADD8",
  Rust: "#dea584",
  Solidity: "#AA6746",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  "Jupyter Notebook": "#DA5B0B",
};

function ghHeaders(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-stats",
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function contributionsViaGraphQL(username: string) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`,
      variables: { u: username },
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) return null;
  const levelMap: Record<string, CalendarDay["level"]> = {
    NONE: 0,
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4,
  };
  const days: CalendarDay[] = cal.weeks.flatMap(
    (w: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }) =>
      w.contributionDays.map((d) => ({
        date: d.date,
        count: d.contributionCount,
        level: levelMap[d.contributionLevel] ?? 0,
      })),
  );
  return { total: cal.totalContributions as number, days };
}

/** Token-free fallback: parse the public contributions fragment GitHub renders on profiles. */
async function contributionsViaHtml(username: string) {
  const res = await fetch(`https://github.com/users/${encodeURIComponent(username)}/contributions`, {
    headers: { "User-Agent": "Mozilla/5.0 (portfolio-stats)" },
  });
  if (!res.ok) return null;
  const html = await res.text();

  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^(\d[\d,]*) contribution/.exec(m[2].trim());
    counts.set(m[1], n ? Number(n[1].replace(/,/g, "")) : 0);
  }
  const days: CalendarDay[] = [];
  for (const m of html.matchAll(/<td[^>]*data-date="([^"]+)"[^>]*>/g)) {
    const tag = m[0];
    const id = /id="([^"]+)"/.exec(tag)?.[1] ?? "";
    const level = Number(/data-level="(\d)"/.exec(tag)?.[1] ?? 0) as CalendarDay["level"];
    days.push({ date: m[1], count: counts.get(id) ?? 0, level });
  }
  if (!days.length) return null;
  days.sort((a, b) => a.date.localeCompare(b.date));
  const totalMatch = /id="js-contribution-activity-description"[^>]*>\s*([\d,]+)\s*contribution/.exec(html);
  const total = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : days.reduce((s, d) => s + d.count, 0);
  return { total, days };
}

export async function getGithubStats(username: string): Promise<GithubStats | StatsFailure> {
  "use cache";
  cacheTag("stats", `github:${username}`);
  cacheLife("hours");

  const url = `https://github.com/${username}`;
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers: ghHeaders() }),
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`, {
        headers: ghHeaders(),
      }),
    ]);
    if (!userRes.ok) throw new Error(`GitHub user request failed (${userRes.status})`);
    const user = await userRes.json();
    const repos: {
      name: string;
      description: string | null;
      stargazers_count: number;
      forks_count: number;
      language: string | null;
      html_url: string;
      fork: boolean;
      pushed_at: string;
      size: number;
    }[] = reposRes.ok ? await reposRes.json() : [];

    const own = repos.filter((r) => !r.fork);
    const langCount = new Map<string, number>();
    for (const r of own) if (r.language) langCount.set(r.language, (langCount.get(r.language) ?? 0) + 1);
    const languages = [...langCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count, color: LANG_COLORS[name] ?? "#9aa4b2" }));

    const topRepos = [...own]
      .sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at))
      .slice(0, 6)
      .map((r) => ({
        name: r.name,
        description: r.description ?? "",
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language ?? "",
        url: r.html_url,
        updatedAt: r.pushed_at,
      }));

    let contributions = null;
    try {
      contributions = process.env.GITHUB_TOKEN ? await contributionsViaGraphQL(username) : null;
      contributions ??= await contributionsViaHtml(username);
    } catch {
      contributions = null;
    }

    return {
      ok: true,
      username: user.login,
      name: user.name ?? user.login,
      avatar: user.avatar_url,
      bio: user.bio ?? "",
      url: user.html_url,
      publicRepos: user.public_repos,
      followers: user.followers,
      following: user.following,
      totalStars: own.reduce((s, r) => s + r.stargazers_count, 0),
      totalForks: own.reduce((s, r) => s + r.forks_count, 0),
      createdAt: user.created_at,
      languages,
      topRepos,
      contributions,
    };
  } catch (err) {
    return { ok: false, username, url, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
