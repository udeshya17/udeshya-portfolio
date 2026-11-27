import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Syne } from "next/font/google";
import { getContent } from "@/lib/content/get";
import "./globals.css";

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
  let metadataBase: URL | undefined;
  try {
    metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL || seo.siteUrl);
  } catch {
    metadataBase = undefined;
  }
  return {
    metadataBase,
    title: { default: seo.title, template: `%s · ${profile.name}` },
    description: seo.description,
    applicationName: profile.name,
    authors: [{ name: profile.name }],
    keywords: [
      profile.name,
      "Full-Stack Developer",
      "Next.js",
      "React",
      "Blockchain",
      "AI Agents",
      "TypeScript",
      "Portfolio",
    ],
    openGraph: {
      type: "website",
      title: seo.title,
      description: seo.description,
      siteName: profile.name,
    },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description },
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
