import {
  siBehance,
  siBluesky,
  siCalendly,
  siCodechef,
  siCodeforces,
  siDevdotto,
  siDiscord,
  siDribbble,
  siFacebook,
  siFiverr,
  siGeeksforgeeks,
  siGithub,
  siHackerrank,
  siHashnode,
  siInstagram,
  siKaggle,
  siLeetcode,
  siMedium,
  siPeerlist,
  siProducthunt,
  siReddit,
  siStackoverflow,
  siSubstack,
  siTelegram,
  siThreads,
  siUpwork,
  siWhatsapp,
  siX,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";

type Platform = { match: RegExp; icon?: SimpleIcon; name: string; color: string; custom?: "linkedin" | "mail" | "phone" | "web" };

/** Detects the platform from a link's URL or label. Order matters. */
const PLATFORMS: Platform[] = [
  { match: /mailto:|^email$|gmail/i, name: "Email", color: "#d4ff3f", custom: "mail" },
  { match: /^tel:|^phone$/i, name: "Phone", color: "#d4ff3f", custom: "phone" },
  { match: /linkedin/i, name: "LinkedIn", color: "#0A66C2", custom: "linkedin" },
  { match: /github/i, icon: siGithub, name: "GitHub", color: "#ffffff" },
  { match: /(^|\/\/|\.)(x|twitter)\.com|^x$|twitter/i, icon: siX, name: "X", color: "#ffffff" },
  { match: /instagram/i, icon: siInstagram, name: "Instagram", color: "#FF0069" },
  { match: /youtube|youtu\.be/i, icon: siYoutube, name: "YouTube", color: "#FF0000" },
  { match: /leetcode/i, icon: siLeetcode, name: "LeetCode", color: "#FFA116" },
  { match: /medium\.com|^medium$/i, icon: siMedium, name: "Medium", color: "#ffffff" },
  { match: /dev\.to/i, icon: siDevdotto, name: "DEV", color: "#ffffff" },
  { match: /hashnode/i, icon: siHashnode, name: "Hashnode", color: "#2962FF" },
  { match: /dribbble/i, icon: siDribbble, name: "Dribbble", color: "#EA4C89" },
  { match: /behance/i, icon: siBehance, name: "Behance", color: "#1769FF" },
  { match: /discord/i, icon: siDiscord, name: "Discord", color: "#5865F2" },
  { match: /t\.me|telegram/i, icon: siTelegram, name: "Telegram", color: "#26A5E4" },
  { match: /wa\.me|whatsapp/i, icon: siWhatsapp, name: "WhatsApp", color: "#25D366" },
  { match: /facebook|fb\.com/i, icon: siFacebook, name: "Facebook", color: "#0866FF" },
  { match: /stackoverflow/i, icon: siStackoverflow, name: "Stack Overflow", color: "#F58025" },
  { match: /peerlist/i, icon: siPeerlist, name: "Peerlist", color: "#00AA45" },
  { match: /threads\.net|threads\.com/i, icon: siThreads, name: "Threads", color: "#ffffff" },
  { match: /calendly/i, icon: siCalendly, name: "Calendly", color: "#006BFF" },
  { match: /bsky|bluesky/i, icon: siBluesky, name: "Bluesky", color: "#1185FE" },
  { match: /reddit/i, icon: siReddit, name: "Reddit", color: "#FF4500" },
  { match: /kaggle/i, icon: siKaggle, name: "Kaggle", color: "#20BEFF" },
  { match: /hackerrank/i, icon: siHackerrank, name: "HackerRank", color: "#00EA64" },
  { match: /codechef/i, icon: siCodechef, name: "CodeChef", color: "#c9a27a" },
  { match: /codeforces/i, icon: siCodeforces, name: "Codeforces", color: "#1F8ACB" },
  { match: /geeksforgeeks/i, icon: siGeeksforgeeks, name: "GeeksforGeeks", color: "#2F8D46" },
  { match: /substack/i, icon: siSubstack, name: "Substack", color: "#FF6719" },
  { match: /producthunt/i, icon: siProducthunt, name: "Product Hunt", color: "#DA552F" },
  { match: /upwork/i, icon: siUpwork, name: "Upwork", color: "#6FDA44" },
  { match: /fiverr/i, icon: siFiverr, name: "Fiverr", color: "#1DBF73" },
];

export function detectPlatform(url: string, label = ""): Platform {
  return (
    PLATFORMS.find((p) => p.match.test(url) || p.match.test(label)) ?? {
      match: /./,
      name: label || "Website",
      color: "#d4ff3f",
      custom: "web",
    }
  );
}

export function SocialIcon({ url, label = "", className = "h-5 w-5" }: { url: string; label?: string; className?: string }) {
  const p = detectPlatform(url, label);
  if (p.icon) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d={p.icon.path} />
      </svg>
    );
  }
  switch (p.custom) {
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="4" />
          <rect x="6" y="10" width="2.6" height="8" rx=".4" fill="#04040a" />
          <circle cx="7.3" cy="6.9" r="1.55" fill="#04040a" />
          <path d="M11 10h2.5v1.2c.5-.8 1.5-1.4 2.8-1.4 2.2 0 3 1.4 3 3.6V18h-2.6v-4.2c0-1.1-.3-1.9-1.4-1.9s-1.7.8-1.7 1.9V18H11z" fill="#04040a" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3" />
        </svg>
      );
  }
}

/** Row/grid of brand-colored social buttons. */
export function SocialLinks({
  socials,
  size = "md",
  showLabel = false,
}: {
  socials: { label: string; url: string }[];
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const box = size === "lg" ? "h-14 px-5" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return (
    <div className="flex flex-wrap gap-2">
      {socials.map((s) => {
        const p = detectPlatform(s.url, s.label);
        return (
          <a
            key={s.url}
            href={s.url}
            target={s.url.startsWith("mailto:") || s.url.startsWith("tel:") ? undefined : "_blank"}
            rel="noreferrer"
            aria-label={s.label || p.name}
            title={s.label || p.name}
            className={`group glass relative flex items-center justify-center gap-3 overflow-hidden rounded-full ${showLabel ? "h-12 px-5" : box} transition-[border-color,transform] duration-300 hover:-translate-y-0.5`}
            style={{ ["--brand" as string]: p.color }}
            data-cursor={showLabel ? undefined : p.name}
          >
            <span className="absolute inset-0 translate-y-full bg-[var(--brand)] opacity-90 transition-transform duration-500 ease-out-expo group-hover:translate-y-0" />
            <span className="relative text-bone transition-colors duration-300 group-hover:text-black">
              <SocialIcon url={s.url} label={s.label} className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} />
            </span>
            {showLabel && <span className="relative text-sm font-medium transition-colors duration-300 group-hover:text-black">{s.label || p.name}</span>}
          </a>
        );
      })}
    </div>
  );
}
