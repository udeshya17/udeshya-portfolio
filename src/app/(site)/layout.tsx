import SiteChrome from "@/components/SiteChrome";
import { getContent } from "@/lib/content/get";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { profile } = await getContent();
  return <SiteChrome profile={profile}>{children}</SiteChrome>;
}
