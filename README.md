# AT NEXORA Technologies — website

Official website of **AT NEXORA Technologies**: digital engineering, data intelligence and AI & automation.

Static Astro site with React islands for the two WebGL experiences, a Cloudflare Pages Function for the contact form, and no runtime dependencies beyond Cloudflare Pages.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Astro 7 (static output, clean trailing-slash URLs) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4, design tokens in `src/styles/global.css` |
| Islands | React 19 — only the hero sculpture and ecosystem explorer |
| 3D | Three.js, React Three Fiber, Drei (lazy-loaded, homepage and `/services/` only) |
| Icons / fonts | Lucide; self-hosted Bricolage Grotesque, Geist, Geist Mono |
| Backend | Cloudflare Pages Function `functions/api/contact.ts` → Resend REST API |
| Hosting | Cloudflare Pages |

## Commands

```bash
npm install
npm run dev          # Astro dev server, http://localhost:4321 (no /api function)
npm run build        # production build to dist/
npm run preview      # serve dist/ statically
npm run preview:cf   # serve dist/ + Pages Functions with Wrangler, http://localhost:8788
npm run check        # astro check + type-check functions/
npm run lint         # ESLint
npm run test:routes  # route, link, metadata and overflow checks (needs a running preview)
```

`test:routes`, `assets:posters` and `assets:og` use Playwright with Chromium. If Playwright is not installed globally, run `npm i -D playwright && npx playwright install chromium`.

## Project structure

```
functions/api/contact.ts     Contact endpoint (Cloudflare Pages Function)
public/                      _headers, posters, OG image, icons
scripts/                     Route checker, 3D poster capture, OG image generator
src/
  content/                   ALL site copy and data (edit here)
    site.ts                  Company details, navigation, form options, principles
    services.ts              The three service divisions (drives the service pages)
    projects.ts              Portfolio entries (currently concept demonstrations)
    process.ts  faqs.ts  ecosystem.ts
  components/
    layout/                  Header (dropdown + mobile menu), Footer
    sections/                Homepage sections
    ui/                      PageHero, SectionHead, CtaBand, FaqList, ProjectCard, ContactForm, Logo
    mockups/Mockup.astro     Coded SVG interface studies used as project imagery
    three/                   HeroScene, EcosystemScene, islands, capability detection
  layouts/                   BaseLayout (SEO, JSON-LD), LegalLayout
  pages/                     Routes
  styles/global.css          Design tokens and base styles
```

## Routes

`/`, `/about/`, `/services/`, `/services/digital-engineering/`, `/services/data-intelligence/`, `/services/ai-automation/`, `/portfolio/`, `/portfolio/[slug]/` (6 projects), `/process/`, `/contact/`, `/faq/`, `/privacy-policy/`, `/terms/`, custom `404`, plus `/robots.txt`, `/sitemap-index.xml` and `POST /api/contact`.

## Deploying to Cloudflare Pages

1. Push this folder to a Git repository you control and create a Pages project from it
   (or deploy directly: `npm run build && npx wrangler pages deploy dist`).
2. Build settings: framework preset **Astro**, build command `npm run build`, output directory `dist`, Node 20+.
3. Add the variables below under **Settings → Variables and Secrets** (Production and Preview).
4. Redeploy. `functions/` is picked up automatically; `public/_headers` supplies security and cache headers.

### Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `SITE_URL` | Build | Public URL without trailing slash, e.g. `https://<project>.pages.dev`. Used for canonical URLs, Open Graph, sitemap and robots.txt. Falls back to Cloudflare's `CF_PAGES_URL`. **Set this once the real URL is known.** |
| `RESEND_API_KEY` | Runtime (secret) | Resend API key. |
| `CONTACT_FROM_EMAIL` | Runtime | Sender on a domain verified in Resend, e.g. `AT NEXORA Website <website@your-domain.com>`. |
| `CONTACT_ALLOWED_ORIGINS` | Runtime, optional | Extra origins allowed to POST to the endpoint. |
| `RATE_LIMIT_KV` | KV binding, optional | Makes rate limiting durable across isolates (see `wrangler.toml`). |

For local function testing put the runtime values in `.dev.vars` (git-ignored) and run `npm run preview:cf`.

### Contact form: what is needed before it delivers email

The form, validation, spam protection and Resend integration are complete, but **no Resend credentials were available during the build, so real email delivery has not been tested.** Until the two variables are set the endpoint returns `503 not_configured`, and the form tells the visitor honestly that the message was not sent and offers a pre-filled email and WhatsApp instead.

To enable delivery:

1. Create a Resend account and **verify a domain you own** (Resend cannot send from `gmail.com`).
2. Create an API key and set `RESEND_API_KEY`.
3. Set `CONTACT_FROM_EMAIL` to an address on the verified domain.
4. Submit the form on the deployed site and confirm the email reaches `atnexoratechnologies@gmail.com`.

Endpoint behaviour: POST only (405 otherwise), same-origin check, 16 KB body limit, server-side validation (422 with per-field errors), honeypot and minimum-fill-time traps, link-spam heuristic, 5 requests per 10 minutes per IP (429), and success is reported only when Resend accepts the message.

## 3D experiences

- **The Nexora Link** (hero): three frames joined as a Borromean link, one per division, around a shared core.
- **The Connected Stack** (homepage and `/services/`): an interactive isometric model of software, data and AI layers; select a layer in the list or click it in the scene.

Both are lazy-loaded, pause when off screen, use cheaper materials on phones, and fall back to a pre-rendered poster when WebGL is unavailable, the user prefers reduced motion, data saver is on or the device is low on memory. After changing a scene, regenerate posters with the preview server running:

```bash
npm run build && npm run preview &
npm run assets:posters && npm run assets:og && npm run build
```

## Content rules

- Portfolio entries are **concept demonstrations** and are labelled as such everywhere. Add real projects in `src/content/projects.ts` with `kind: 'client'` and only verified `outcomes`.
- No client names, testimonials, statistics, awards or social profiles are included. Add verified social links to `company.socials` in `src/content/site.ts`; the footer and structured data pick them up.
- Items to review before launch: budget ranges and technology lists (`site.ts`, `services.ts`), and the Privacy Policy and Terms, which are sensible drafts and should be checked by a legal adviser (the governing-law clause deliberately names no jurisdiction).
