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
import { Gate, Realm } from "./world/Gate";

/**
 * The home page is a journey through five worlds (see world/realms.ts),
 * with a gate to step through between each. Chrome and the backdrop live in the (site) layout.
 */
export default function Portfolio({ content, stats }: { content: SiteContent; stats: ReactNode }) {
  const { profile } = content;
  const showStats = content.statsConfig.showGithub || content.statsConfig.showLeetcode;

  return (
    <main className="relative">
      <Realm index={0}>
        <Hero profile={profile} />
        <About profile={profile} stats={content.stats} education={content.education} current={content.experience[0]} />
      </Realm>

      <Gate to={1} />
      <Realm index={1}>
        <Multiverse domains={content.domains} />
        <Skills skills={content.skills} />
      </Realm>

      <Gate to={2} />
      <Realm index={2}>
        <Experience experience={content.experience} />
        <Process steps={content.process} />
      </Realm>

      <Gate to={3} />
      <Realm index={3}>
        <Projects projects={content.projects} />
        <Services services={content.services} />
      </Realm>

      <Gate to={4} />
      <Realm index={4}>
        <section id="stats" className="relative z-10 px-5 pt-40 pb-32 md:px-10 md:pt-56 md:pb-44">
          {showStats ? stats : null}
        </section>
        <Testimonials items={content.testimonials} />
        <Contact profile={profile} resume={content.resume} />
      </Realm>
    </main>
  );
}
