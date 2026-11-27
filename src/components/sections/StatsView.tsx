"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import type { CalendarDay, GithubStats, LeetcodeStats, StatsFailure } from "@/lib/stats/types";
import { Counter, FadeIn, Reveal, UniverseTag } from "../ui/primitives";

// Validated categorical palette (dark surface): always paired with text labels.
const DIFF = { easy: "#0fa596", medium: "#c98a00", hard: "#f43f5e" } as const;

/* -------------------------------- heatmap --------------------------------- */

function Heatmap({ days, hue, unit }: { days: CalendarDay[]; hue: string; unit: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  // group into weeks (columns), Sunday-first
  const weeks: (CalendarDay | null)[][] = [];
  if (days.length) {
    const firstDow = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
    let week: (CalendarDay | null)[] = Array(firstDow).fill(null);
    for (const d of days) {
      week.push(d);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length) weeks.push([...week, ...Array(7 - week.length).fill(null)]);
  }
  const visible = weeks.slice(-53);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el.querySelectorAll(".hm-col"), { opacity: 0, y: 8 }, {
        opacity: 1,
        y: 0,
        stagger: 0.012,
        duration: 0.5,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    }, el);
    return () => ctx.revert();
  }, [days]);

  const opacity = [0.07, 0.3, 0.52, 0.76, 1];
  return (
    <div ref={ref} className="relative">
      <div className="no-scrollbar overflow-x-auto" data-lenis-prevent>
        <div className="flex w-max gap-[3px]" onPointerLeave={() => setTip(null)}>
          {visible.map((w, i) => (
            <div key={i} className="hm-col flex flex-col gap-[3px]">
              {w.map((d, k) =>
                d ? (
                  <div
                    key={k}
                    className="h-[11px] w-[11px] rounded-[3px] transition-transform hover:scale-150"
                    style={{ background: d.level === 0 ? "rgb(255 255 255 / .06)" : hue, opacity: d.level === 0 ? 1 : opacity[d.level] }}
                    onPointerEnter={(e) => {
                      const box = ref.current!.getBoundingClientRect();
                      const r = (e.target as HTMLElement).getBoundingClientRect();
                      setTip({
                        x: r.left - box.left + r.width / 2,
                        y: r.top - box.top,
                        text: `${d.count} ${unit}${d.count === 1 ? "" : "s"} · ${new Date(`${d.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`,
                      });
                    }}
                  />
                ) : (
                  <div key={k} className="h-[11px] w-[11px]" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md bg-bone px-2 py-1 font-mono text-[11px] whitespace-nowrap text-black"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      )}
      <div className="mt-3 flex items-center justify-end gap-1.5 font-mono text-[10px] text-fog">
        Less
        {opacity.map((o, i) => (
          <span key={i} className="h-[10px] w-[10px] rounded-[3px]" style={{ background: i === 0 ? "rgb(255 255 255 / .06)" : hue, opacity: i === 0 ? 1 : o }} />
        ))}
        More
      </div>
    </div>
  );
}

/* ------------------------------- primitives ------------------------------- */

function Tile({ label, value, suffix = "", hint }: { label: string; value: number | null; suffix?: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white/[0.02] p-4">
      <p className="font-mono text-[10px] tracking-[0.2em] text-fog uppercase">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight md:text-3xl">
        {value === null ? "—" : <Counter value={value} suffix={suffix} />}
      </p>
      {hint && <p className="mt-1 text-xs text-fog">{hint}</p>}
    </div>
  );
}

function PanelHeader({ kicker, title, href }: { kicker: string; title: string; href: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] tracking-[0.25em] text-fog uppercase">{kicker}</p>
        <h3 className="mt-2 font-display text-3xl font-bold tracking-tight">{title}</h3>
      </div>
      <a href={href} target="_blank" rel="noreferrer" className="rounded-full border border-line px-4 py-2 text-sm whitespace-nowrap hover:border-accent hover:text-accent">
        Profile ↗
      </a>
    </div>
  );
}

function Failure({ name, f }: { name: string; f: StatsFailure }) {
  return (
    <div className="flex min-h-80 flex-col justify-between rounded-[2rem] border border-line bg-[#090b14]/90 p-7 backdrop-blur-xl md:p-9">
      <PanelHeader kicker={name} title={`@${f.username}`} href={f.url} />
      <p className="text-fog">
        Live {name} stats are taking a breather right now ({f.error}). The profile link above always works.
      </p>
    </div>
  );
}

/* -------------------------------- leetcode -------------------------------- */

function DifficultyRings({ s }: { s: LeetcodeStats }) {
  const ref = useRef<SVGSVGElement>(null);
  const rings = [
    { key: "easy", r: 74, solved: s.solved.easy, total: s.totals.easy },
    { key: "medium", r: 60, solved: s.solved.medium, total: s.totals.medium },
    { key: "hard", r: 46, solved: s.solved.hard, total: s.totals.hard },
  ] as const;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      el.querySelectorAll<SVGCircleElement>(".arc").forEach((c) => {
        const full = Number(c.dataset.full);
        gsap.fromTo(
          c,
          { strokeDashoffset: full },
          {
            strokeDashoffset: Number(c.dataset.offset),
            duration: 2,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          },
        );
      });
    }, el);
    return () => ctx.revert();
  }, [s]);
  return (
    <div className="relative mx-auto h-48 w-48 shrink-0">
      <svg ref={ref} viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label={`${s.solved.all} of ${s.totals.all} problems solved`}>
        {rings.map(({ key, r, solved, total }) => {
          const C = 2 * Math.PI * r;
          const pct = total ? Math.max(solved / total, solved ? 0.01 : 0) : 0;
          if (!solved) return <circle key={key} cx="90" cy="90" r={r} fill="none" stroke="rgb(255 255 255 / .06)" strokeWidth="9" />;
          return (
            <g key={key}>
              <circle cx="90" cy="90" r={r} fill="none" stroke="rgb(255 255 255 / .06)" strokeWidth="9" />
              <circle
                className="arc"
                cx="90"
                cy="90"
                r={r}
                fill="none"
                stroke={DIFF[key]}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C}
                data-full={C}
                data-offset={C * (1 - pct)}
              >
                <title>{`${key}: ${solved} / ${total}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Counter value={s.solved.all} className="font-display text-4xl font-extrabold" />
        <span className="font-mono text-[10px] tracking-widest text-fog uppercase">/ {s.totals.all} solved</span>
      </div>
    </div>
  );
}

function Leetcode({ s }: { s: LeetcodeStats }) {
  return (
    <div className="rounded-[2rem] border border-line bg-[#090b14]/90 p-6 backdrop-blur-xl md:p-9">
      <PanelHeader kicker="LeetCode · problem solving" title={`@${s.username}`} href={s.url} />
      <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row">
        <DifficultyRings s={s} />
        <div className="w-full flex-1 space-y-4">
          {(["easy", "medium", "hard"] as const).map((k) => {
            const solved = s.solved[k];
            const total = s.totals[k];
            return (
              <div key={k}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 capitalize">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: DIFF[k] }} />
                    {k}
                  </span>
                  <span className="font-mono text-fog">
                    <span className="text-bone">{solved}</span> / {total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${total ? (solved / total) * 100 : 0}%`, background: DIFF[k] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Global rank" value={s.ranking} />
        <Tile label="Acceptance" value={s.acceptanceRate === null ? null : Math.round(s.acceptanceRate)} suffix="%" />
        <Tile label="Contest" value={s.contest?.rating ?? null} hint={s.contest ? `${s.contest.attended} contests` : "No contests yet"} />
        <Tile label="Best streak" value={s.calendar.streak} suffix="d" hint={`${s.calendar.activeDays} active days`} />
      </div>
      <div className="mt-8">
        <p className="mb-3 font-mono text-[11px] tracking-[0.2em] text-fog uppercase">{s.calendar.total} submissions in the last year</p>
        <Heatmap days={s.calendar.days} hue="#d4ff3f" unit="submission" />
      </div>
      {s.topSkills.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-1.5">
          {s.topSkills.map((t) => (
            <span key={t.name} className="rounded-full border border-line px-3 py-1 text-xs text-bone/80">
              {t.name} <span className="text-fog">×{t.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- github --------------------------------- */

function Github({ s }: { s: GithubStats }) {
  const totalLang = s.languages.reduce((a, l) => a + l.count, 0) || 1;
  return (
    <div className="rounded-[2rem] border border-line bg-[#090b14]/90 p-6 backdrop-blur-xl md:p-9">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.avatar} alt="" className="h-14 w-14 rounded-2xl border border-line" />
          <div>
            <p className="font-mono text-[11px] tracking-[0.25em] text-fog uppercase">GitHub · open source</p>
            <h3 className="mt-1 font-display text-3xl font-bold tracking-tight">@{s.username}</h3>
          </div>
        </div>
        <a href={s.url} target="_blank" rel="noreferrer" className="rounded-full border border-line px-4 py-2 text-sm whitespace-nowrap hover:border-accent hover:text-accent">
          Profile ↗
        </a>
      </div>
      {s.bio && <p className="mt-4 text-fog">{s.bio}</p>}

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Contributions" value={s.contributions?.total ?? null} hint="last 12 months" />
        <Tile label="Public repos" value={s.publicRepos} />
        <Tile label="Stars earned" value={s.totalStars} />
        <Tile label="Followers" value={s.followers} />
      </div>

      {s.contributions && (
        <div className="mt-8">
          <p className="mb-3 font-mono text-[11px] tracking-[0.2em] text-fog uppercase">Contribution graph</p>
          <Heatmap days={s.contributions.days} hue="#3fe0ff" unit="contribution" />
        </div>
      )}

      {s.languages.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-mono text-[11px] tracking-[0.2em] text-fog uppercase">Languages across repositories</p>
          <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
            {s.languages.map((l) => (
              <div key={l.name} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(l.count / totalLang) * 100}%`, background: l.color }} title={`${l.name}: ${l.count} repos`} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fog">
            {s.languages.map((l) => (
              <span key={l.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                <span className="text-bone/90">{l.name}</span> {Math.round((l.count / totalLang) * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {s.topRepos.length > 0 && (
        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {s.topRepos.slice(0, 4).map((r) => (
            <a key={r.name} href={r.url} target="_blank" rel="noreferrer" className="group rounded-2xl border border-line p-4 transition-colors hover:border-cyan/50 hover:bg-white/[0.03]">
              <p className="truncate font-medium group-hover:text-cyan">{r.name}</p>
              <p className="mt-1 line-clamp-2 min-h-8 text-xs text-fog">{r.description || "No description"}</p>
              <p className="mt-2 flex gap-3 font-mono text-[11px] text-fog">
                {r.language && <span>{r.language}</span>}
                <span>★ {r.stars}</span>
                <span>⑂ {r.forks}</span>
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- view ---------------------------------- */

export default function StatsView({
  leetcode,
  github,
}: {
  leetcode: LeetcodeStats | StatsFailure | null;
  github: GithubStats | StatsFailure | null;
}) {
  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="max-w-3xl">
        <UniverseTag index={8} name="Signal" className="mb-8" />
        <Reveal as="h2" type="words" className="font-display text-[8.2vw] leading-[0.95] sm:text-5xl font-extrabold tracking-tight md:text-7xl">
          The <span className="font-serif font-normal text-cyan italic">signal</span> behind the noise.
        </Reveal>
        <Reveal as="p" className="mt-6 max-w-lg text-lg text-fog">
          Live from LeetCode and GitHub, refreshed every few hours. Problem solving and shipping, measured.
        </Reveal>
      </div>
      <div className="mt-16 grid items-start gap-5 lg:grid-cols-2">
        {leetcode && (
          <FadeIn y={60}>{leetcode.ok ? <Leetcode s={leetcode} /> : <Failure name="LeetCode" f={leetcode} />}</FadeIn>
        )}
        {github && (
          <FadeIn y={60} delay={0.1}>
            {github.ok ? <Github s={github} /> : <Failure name="GitHub" f={github} />}
          </FadeIn>
        )}
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1500px] gap-5 pt-48 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="glass h-[560px] animate-pulse rounded-[2rem]" />
      ))}
    </div>
  );
}
