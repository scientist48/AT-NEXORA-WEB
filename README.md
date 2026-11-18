# AT NEXORA Technologies — website

Official website of **AT NEXORA Technologies**: digital engineering, data intelligence and AI & automation.

Static Astro site with React islands for the two WebGL experiences, Cloudflare Pages Functions for the contact form and a private inquiry dashboard, and Cloudflare D1 as the database. No runtime dependencies beyond Cloudflare.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Astro 7 (static output, clean trailing-slash URLs) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4, design tokens in `src/styles/global.css` |
| Islands | React 19: the two 3D experiences and the admin dashboard |
| 3D | Three.js, React Three Fiber, Drei (lazy-loaded, homepage and `/services/` only) |
| Backend | Cloudflare Pages Functions (`functions/`), Web APIs only, no Node built-ins |
| Database | Cloudflare D1 `at-nexora-inquiries`, binding `DB` |
| Hosting | Cloudflare Pages |

## Commands

```bash
npm install
npm run dev               # Astro dev server, http://localhost:4321 (static pages only, no Functions)
npm run build             # production build to dist/
npm run preview:cf        # applies local D1 migrations, then serves dist/ + Functions + local D1 on :8788
npm run check             # astro check + type-check functions/ and server/
npm run lint              # ESLint
npm run test:routes       # routes, links, metadata and overflow at 10 widths (needs a running server)
npm run test:api          # contact + admin API integration tests (local D1 only, see below)
npm run admin:hash        # generate ADMIN_PASSWORD_HASH (prompts, input hidden)
npm run db:migrate:local  # apply migrations to the local D1
npm run db:migrate:remote # apply migrations to the production D1
```

`test:routes`, `assets:posters` and `assets:og` use Playwright with Chromium. If Playwright is not installed globally, run `npm i -D playwright && npx playwright install chromium`.

## Project structure

```
functions/
  api/contact.ts                 POST /api/contact → validates and inserts into D1
  api/admin/_middleware.ts       Session + CSRF guard for every /api/admin/* route
  api/admin/login.ts logout.ts session.ts
  api/admin/inquiries/index.ts   GET list (search, filters, sort, pagination, stats)
  api/admin/inquiries/[id].ts    GET / PATCH (status, notes) / DELETE
  admin/_middleware.ts           Server-side redirect: /admin/* requires a session
server/                          Shared server code: crypto, sessions, rate limiting, HTTP helpers
migrations/0001_initial.sql      D1 schema (inquiries, admin_sessions, rate_limits)
public/                          _headers, posters, OG image, icons
scripts/                         Route checker, API tests, password hasher, poster/OG generators
src/
  content/                       All site copy and data (edit here)
  components/                    layout/, sections/, ui/, mockups/, three/, admin/AdminApp.tsx
  layouts/                       BaseLayout (SEO, JSON-LD), LegalLayout, AdminLayout
  pages/                         Routes, including admin/index.astro and admin/login.astro
  styles/global.css              Design tokens and base styles
```

## Routes

Public: `/`, `/about/`, `/services/`, `/services/digital-engineering/`, `/services/data-intelligence/`, `/services/ai-automation/`, `/portfolio/`, `/portfolio/[slug]/` (6 projects), `/process/`, `/contact/`, `/faq/`, `/privacy-policy/`, `/terms/`, custom `404`, `/robots.txt`, `/sitemap-index.xml`.

Private (noindex, excluded from the sitemap, disallowed in robots.txt): `/admin/`, `/admin/login/`.

API: `POST /api/contact`, `/api/admin/*`.

## Contact form → D1

Enquiries are stored in Cloudflare D1; **no email is sent**. The database is the source of truth, and the admin dashboard is where they are read.

`POST /api/contact` reports success (`201` + reference ID such as `NX-7K3P9Q2M`) **only after D1 confirms the insert**. Otherwise:

| Status | Meaning |
| --- | --- |
| 400 / 415 | Unreadable body / unsupported content type |
| 403 | Request from another origin |
| 405 | Not a POST |
| 409 | Duplicate: same email and message within 24 h (returns the original reference) |
| 413 | Body over 16 KB |
| 422 | Validation failed, with per-field messages |
| 429 | More than 5 submissions per IP in 10 minutes (`Retry-After` header) |
| 500 | D1 write failed: the visitor sees an error and an email/WhatsApp fallback, never a success |
| 503 | `DB` binding missing |

Spam protection: honeypot field and minimum fill time (silently dropped), link-spam and `<script>` heuristics, duplicate detection, and per-IP rate limiting stored in D1. Raw IP addresses are never stored; rate-limit keys use a SHA-256 hash.

## Database

Schema: `migrations/0001_initial.sql`.

| Table | Purpose |
| --- | --- |
| `inquiries` | `id`, `name`, `email`, `company`, `service`, `budget`, `message`, `consent`, `status` (`new`, `contacted`, `in_progress`, `completed`, `archived`), `notes`, `fingerprint` (duplicate detection), `created_at`, `updated_at`. Indexed on date, status + date, service + date, email, fingerprint. |
| `admin_sessions` | SHA-256 of the session token, username, CSRF token, created / absolute-expiry / last-seen times |
| `rate_limits` | Fixed-window counters for the contact form and login |

Every statement uses `IF NOT EXISTS`, and Wrangler records applied migrations in `d1_migrations`, so re-running is safe. Add schema changes as new files (`0002_….sql`); never edit an applied migration. All queries are parameterised.

## Admin dashboard

`/admin/` shows status counts, the most recent enquiries, and the full list with search (name, email, company, message, reference), filters (status, service, date range), newest/oldest sort and pagination. Each enquiry opens in a detail panel showing every submitted field. From there you can change its status, add or edit private notes, or delete it after confirming. Every change is written to D1.

### Security

- **Credentials** come from two server-side secrets: `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`. There is no default password, and the plaintext password is never stored anywhere.
- **Password hashing:** PBKDF2-HMAC-SHA256 with 100,000 iterations (the Workers maximum) and a 16-byte random salt. Comparisons run in constant time, and a wrong username takes as long to reject as a wrong password.
- **Sessions:**
  - The session token is 256 bits of randomness; only its SHA-256 is stored in D1.
  - The cookie is `__Host-nx_admin`, set with `HttpOnly; Secure; SameSite=Strict; Path=/`.
  - Sessions expire after 1 hour idle or 8 hours in total, and sign-out deletes the session row.
- **CSRF:** every state-changing admin request needs the session's CSRF token in `X-CSRF-Token` and a same-origin `Origin` header. The `SameSite=Strict` cookie adds a further layer.
- **Login rate limiting:** after 5 failures per IP, or 10 per username, within 15 minutes, sign-in is blocked with `429`, even for the correct password.
- **Protection:**
  - `functions/admin/_middleware.ts` redirects unauthenticated page requests to `/admin/login/`.
  - `functions/api/admin/_middleware.ts` returns `401` for every API call without a valid session.
  - Admin responses are `no-store` and `noindex`.
  - Server errors return a generic message, never stack traces or SQL.

### Cloudflare plan and sign-in CPU time

Verifying a password with PBKDF2 at 100,000 iterations takes about 19 ms of CPU (measured on Node's Web Crypto). That iteration count is the maximum the Workers runtime allows, and it is deliberately not reduced. Cloudflare's **Free plan limits Pages Functions to 10 ms of CPU per request**. If sign-in at `/admin/` fails with Cloudflare error **1102** ("Worker exceeded resource limits"), move the account to **Workers Paid**, which allows far more CPU per request, rather than weakening the hash. The contact form and every other admin request use only a few SHA-256 operations and are unaffected.

### Admin setup (first time, and to change the password)

1. Generate the hash locally. The password is typed into a hidden prompt and is not saved:
   ```bash
   npm run admin:hash
   ```
   Copy the single line it prints (`pbkdf2_sha256$100000$…`).
2. Store both secrets in Cloudflare (Production; repeat with `--env preview` if you want admin access on preview deployments):
   ```bash
   npx wrangler pages secret put ADMIN_USERNAME --project-name <your-pages-project>
   npx wrangler pages secret put ADMIN_PASSWORD_HASH --project-name <your-pages-project>
   ```
   Or in the dashboard: **Workers & Pages → your project → Settings → Variables and Secrets → Add → Type: Secret**.
3. Redeploy. Secrets take effect on the next deployment.

To change the password, generate a new hash and replace `ADMIN_PASSWORD_HASH`. Existing sessions stay valid until they expire; to sign everyone out immediately, also run:
```bash
npx wrangler d1 execute at-nexora-inquiries --remote --command "DELETE FROM admin_sessions"
```

## Deploying to Cloudflare Pages

`wrangler.toml` binds the existing D1 database (`at-nexora-inquiries`, ID `9bb98501-4482-4301-be19-511de4e6085a`) as `DB` for production and preview. **Do not create another database.**

1. **Pages project name.** Make sure `name` in `wrangler.toml` matches your Cloudflare Pages project (Workers & Pages → project name). It is only used by `wrangler pages deploy`; Git-connected builds deploy to the connected project.
2. **Build settings:** framework preset Astro, build command `npm run build`, output directory `dist`, production branch `main`, Node 20 or later.
3. **Apply the schema to production D1** (one time, and after adding any future migration):
   ```bash
   npx wrangler login        # or: export CLOUDFLARE_API_TOKEN=<token with Pages Edit, D1 Edit, Account Settings Read>
   npx wrangler d1 migrations apply at-nexora-inquiries --remote
   ```
4. **Add secrets:** `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` (see Admin setup).
5. **`SITE_URL` (optional):** if unset, the build uses `CF_PAGES_URL` with the per-deployment hash removed, i.e. `https://at-nexora-technologies.pages.dev`. Set `SITE_URL` as a build variable once a custom domain is connected.
6. **Deploy:** push to `main` (Git integration), or `npm run build && npx wrangler pages deploy dist --project-name <your-pages-project>`.
7. **Verify on the live site:**
   - Submit the contact form and note the reference.
   - Sign in at `/admin/`; the enquiry appears.
   - Change its status and add a note.
   - Sign out.

### Environment variables

| Name | Type | Purpose |
| --- | --- | --- |
| `DB` | D1 binding (in `wrangler.toml`) | Enquiries, sessions, rate limits |
| `ADMIN_USERNAME` | Secret | Admin sign-in name |
| `ADMIN_PASSWORD_HASH` | Secret | Output of `npm run admin:hash` |
| `SITE_URL` | Build variable | Canonical public URL |
| `CONTACT_ALLOWED_ORIGINS` | Optional variable | Extra origins allowed to post the contact form |

For local development, put `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` in `.dev.vars` (git-ignored); see `.env.example`.

## Testing locally

```bash
npm run build
npm run preview:cf                           # terminal 1: local D1 + Functions on :8788
ADMIN_TEST_USERNAME=<user> ADMIN_TEST_PASSWORD=<password> npm run test:api   # terminal 2
npm run test:routes -- http://localhost:8788
```

`test:api` only runs against `localhost`. It **wipes the local D1 tables** and seeds test data, so never point it at production.

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
