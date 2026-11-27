import type { Metadata } from "next";
import ContactView from "@/components/pages/ContactView";
import { getContent } from "@/lib/content/get";

export async function generateMetadata(): Promise<Metadata> {
  const { contact } = await getContent();
  return { title: "Contact", description: contact.intro };
}

export default async function ContactPage() {
  const { profile, contact, faqs } = await getContent();
  return <ContactView profile={profile} config={contact} faqs={faqs} />;
}
