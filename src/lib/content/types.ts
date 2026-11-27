export type Social = { label: string; url: string };

export type Profile = {
  name: string;
  firstName: string;
  title: string;
  roles: string[]; // cycled in the hero
  tagline: string;
  summary: string;
  manifesto: string; // word-by-word scroll reveal in "Origin"
  email: string;
  phone: string;
  location: string;
  timezone: string; // IANA tz for the live clock in the menu
  available: boolean;
  availabilityText: string;
  nowBuilding: string; // "Currently" card in the hero
  nowAt: string;
  socials: Social[];
};

export type Stat = { value: number; suffix: string; label: string };

export type Domain = { name: string; blurb: string; tags: string[] };

export type SkillGroup = { name: string; items: string[] };

export type Experience = {
  company: string;
  role: string;
  type: string; // Full-time / Freelance / Fellowship
  start: string;
  end: string;
  location: string;
  highlights: string[];
  stack: string[];
};

export type Metric = { value: string; label: string };

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  description: string; // short, for cards
  category: string;
  year: string;
  role: string;
  duration: string;
  client: string;
  stack: string[];
  url: string;
  repo: string;
  image: string; // optional cover URL
  preview: string; // full-page website screenshot (auto-captured from `url`, or uploaded)
  accent: string; // hex color used for generative cover
  featured: boolean;
  overview: string;
  challenge: string;
  solution: string;
  features: string[];
  results: Metric[];
  gallery: string[];
};

export type Service = { title: string; blurb: string; deliverables: string[] };

export type ProcessStep = { title: string; blurb: string; duration: string };

export type Testimonial = { quote: string; name: string; role: string; company: string; avatar: string };

export type Faq = { q: string; a: string };

export type Education = {
  degree: string;
  field: string;
  school: string;
  start: string;
  end: string;
  score: string;
};

export type StatsConfig = {
  githubUsername: string;
  leetcodeUsername: string;
  showGithub: boolean;
  showLeetcode: boolean;
};

export type ContactConfig = {
  heading: string;
  intro: string;
  responseTime: string;
  bookingUrl: string; // e.g. a Calendly / Cal.com link (optional)
  projectTypes: string[];
  budgets: string[];
};

export type ResumeMeta = {
  fileName: string;
  size: number;
  updatedAt: string; // ISO
};

export type SiteContent = {
  profile: Profile;
  stats: Stat[];
  domains: Domain[];
  services: Service[];
  skills: SkillGroup[];
  experience: Experience[];
  projects: Project[];
  process: ProcessStep[];
  testimonials: Testimonial[];
  faqs: Faq[];
  education: Education[];
  statsConfig: StatsConfig;
  contact: ContactConfig;
  resume: ResumeMeta;
  seo: { title: string; description: string; siteUrl: string };
};

export type Message = {
  id: string;
  name: string;
  email: string;
  company: string;
  projectType: string;
  budget: string;
  message: string;
  createdAt: string;
  read: boolean;
};
