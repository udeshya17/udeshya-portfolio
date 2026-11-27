# Udeshya Sharma: Multiverse Portfolio

A scroll-driven 3D portfolio. One WebGL particle system (about 18,000 particles) sits behind the page and **morphs into a different universe for every section** as you scroll:

| # | Section | Universe | Shape |
|---|---------|----------|-------|
| 01 | Hero | Singularity | Black-hole galaxy with accretion disk + orbit rings |
| 02 | About | Origin | Ringed planet with a moon |
| 03 | Domains | The Multiverse | Seven bubble universes joined by bridges |
| 04 | Skills | Constellation | Neural network sphere |
| 05 | Experience | Evolution | DNA double helix |
| 06 | Projects | Wormhole | Hourglass wormhole (pinned horizontal gallery) |
| 07 | Interlude | Terra | Procedurally grown tree |
| 08 | Stats | Signal | Animated ocean waves (live LeetCode + GitHub analytics) |
| 09 | Contact | Hello | "LET'S TALK" written in particles |

Realistic set pieces live inside the particles: a black hole with a shader-driven accretion disk, a lit gas-giant with atmosphere and rings, iridescent glass bubble universes, a crystal core and fireflies, all with bloom. The UI accent colour shifts with each universe.

Other features:
- Animated loading screen with a big-bang intro.
- Navbar with a universe mega-menu and page links; it hides on scroll down. Phones get a bottom dock.
- Full-screen menu with social icons and a live clock.
- An "entering universe" cue, parallax numerals, and a chromatic warp at high scroll speed.
- Magnetic buttons, a custom cursor, and smooth scrolling (Lenis + GSAP ScrollTrigger).

## Pages

| Route | What it is |
|---|---|
| `/` | The nine-universe journey (plus Services, Process, Testimonials) |
| `/projects` | Filterable archive; hover a frame to scroll the live site |
| `/projects/[slug]` | Case study with a pinned browser frame where the real website scrolls as you scroll |
| `/contact` | Contact form (saved to the admin inbox, optional email via Resend), socials, FAQ |
| `/admin` | Content management (below) |

**Live website previews:** any project with a live URL gets a full-page screenshot, captured once via the Microlink API, compressed with sharp, and stored. You can also upload your own, or refresh one from admin.

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · Three.js / React Three Fiber (custom GLSL shaders) · GSAP (ScrollTrigger, SplitText) · Lenis · Motion · MongoDB (optional)

## Run locally

```bash
npm install
cp .env.example .env.local   # then set ADMIN_PASSWORD and SESSION_SECRET
npm run dev                  # http://localhost:3000
```

## Admin panel (`/admin`)

Log in with `ADMIN_PASSWORD`. From there you can edit:

- **Inbox:** messages from the contact form
- Profile, hero roles, tagline, "now building" note, availability, social links (icons auto-detected for 30+ platforms)
- Projects as full case studies (overview, challenge, solution, features, metrics, gallery, screenshots), services, process, testimonials, FAQ, contact-page settings
- Highlight counters, domains, skills, experience, projects (with image upload), education
- LeetCode / GitHub usernames for the live stats, plus a "refresh now" button
- **Résumé:** drag in a new PDF; every download button serves it immediately
- SEO title, description, and site URL

Saving updates the live site instantly. "Reset to defaults" restores the content seeded from the résumé.

## Storage

| Setting | Where data lives | Use for |
|---|---|---|
| `MONGODB_URI` unset | `./data/` (gitignored) | VPS, Docker, local |
| `MONGODB_URI` set | MongoDB collection `site` | Vercel and other serverless hosts (read-only filesystem) |

The bundled résumé lives at `assets/resume.pdf` and is served until you upload a new one.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | yes (for `/admin`) | Admin login |
| `SESSION_SECRET` | recommended | Signs the admin session cookie (`openssl rand -hex 32`) |
| `MONGODB_URI`, `MONGODB_DB` | on serverless | Persistent storage |
| `GITHUB_TOKEN` | optional | Higher GitHub rate limits + official contribution calendar |
| `RESEND_API_KEY`, `CONTACT_NOTIFY_EMAIL` | optional | Email me when someone submits the contact form |
| `MICROLINK_API_KEY` | optional | Higher limits for website-preview capture |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical URL for social previews |

## Deploy

Free on **Vercel + MongoDB Atlas**. Step-by-step guide: **[DEPLOY.md](./DEPLOY.md)**.

## Where things live

```
src/components/universes.ts       # per-section 3D config: shape, colors, position
src/components/three/shapes.ts    # procedural point-cloud generators
src/components/three/Scene.tsx    # WebGL scene + morphing shader + post-processing
src/components/three/SetPieces.tsx # black hole, planet, glass bubbles, crystal, fireflies
src/components/pages/*            # /projects, /projects/[slug], /contact
src/components/sections/*         # page sections
src/lib/content/defaults.ts       # seed content (from the résumé)
src/app/admin/*                   # admin UI + server actions
```

To add a universe, add an entry to `UNIVERSES`, add a shape to `shapes.ts`, and render a `<section id="…" data-universe>` in the same order.
