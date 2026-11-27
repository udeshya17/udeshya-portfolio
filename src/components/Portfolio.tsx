"use client";

import type { ReactNode } from "react";
import type { SiteContent } from "@/lib/content/types";
import About from "./sections/About";
import Contact from "./sections/Contact";
import Experience from "./sections/Experience";
import { Process, Services, Testimonials } from "./sections/Extras";
import Hero from "./sections/Hero";
import Multiverse from "./sections/Multiverse";
import Projects from "./sections/Projects";
import Skills from "./sections/Skills";
import Terra from "./sections/Terra";

/** The home page: nine universes, in order. Chrome (nav, scene, loader) lives in the (site) layout. */
export default function Portfolio({ content, stats }: { content: SiteContent; stats: ReactNode }) {
  const { profile } = content;
  const showStats = content.statsConfig.showGithub || content.statsConfig.showLeetcode;

  return (
    <main className="relative">
      <Hero profile={profile} stats={content.stats} skills={content.skills} />
      <About profile={profile} stats={content.stats} education={content.education} />
      <Multiverse domains={content.domains} />
      <Services services={content.services} />
      <Skills skills={content.skills} />
      <Experience experience={content.experience} />
      <Projects projects={content.projects} />
      <Process steps={content.process} />
      <Terra />
      <section id="stats" data-universe className="relative z-10 min-h-screen px-5 py-32 md:px-10 md:py-44">
        {showStats ? stats : null}
      </section>
      <Testimonials items={content.testimonials} />
      <Contact profile={profile} resume={content.resume} />
    </main>
  );
}
