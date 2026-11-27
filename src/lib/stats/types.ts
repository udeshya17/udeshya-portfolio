export type CalendarDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };

export type GithubStats = {
  ok: true;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  url: string;
  publicRepos: number;
  followers: number;
  following: number;
  totalStars: number;
  totalForks: number;
  createdAt: string;
  languages: { name: string; count: number; color: string }[];
  topRepos: {
    name: string;
    description: string;
    stars: number;
    forks: number;
    language: string;
    url: string;
    updatedAt: string;
  }[];
  contributions: { total: number; days: CalendarDay[] } | null;
};

export type LeetcodeStats = {
  ok: true;
  username: string;
  url: string;
  ranking: number | null;
  solved: { all: number; easy: number; medium: number; hard: number };
  totals: { all: number; easy: number; medium: number; hard: number };
  acceptanceRate: number | null;
  contest: { rating: number; attended: number; topPercentage: number | null } | null;
  badges: { name: string; icon: string }[];
  topSkills: { name: string; count: number }[];
  languages: { name: string; solved: number }[];
  calendar: { total: number; streak: number; activeDays: number; days: CalendarDay[] };
};

export type StatsFailure = { ok: false; username: string; url: string; error: string };
