import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Syne } from "next/font/google";
import { getContent } from "@/lib/content/get";
import { siteUrl } from "@/lib/og";
import "./globals.css";
import "./world.css";

const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { seo, profile } = await getContent();
  const base = siteUrl(seo.siteUrl);
  return {
    metadataBase: base ? new URL(base) : undefined,
    title: { default: seo.title, template: `%s · ${profile.name}` },
    description: seo.description,
    applicationName: profile.name,
    authors: [{ name: profile.name, url: base }],
    creator: profile.name,
    keywords: [
      profile.name,
      "Senior Full-Stack Developer",
      "Full-Stack Engineer India",
      "Next.js developer",
      "React developer",
      "Blockchain developer",
      "Crypto wallet developer",
      "AI agents developer",
      "TypeScript",
      "Hire full-stack developer",
    ],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: `${profile.name} — Portfolio`,
      title: seo.title,
      description: seo.description,
      locale: "en_IN",
    },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    category: "technology",
  };
}

export const viewport: Viewport = {
  themeColor: "#04040a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${geist.variable} ${geistMono.variable} ${instrument.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
