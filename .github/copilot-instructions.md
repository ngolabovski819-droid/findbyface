# findbyface — Copilot Instructions

## Big Picture
- AI lookalike finder: users upload a photo → get matching OnlyFans creators by visual similarity
- Domain: findbyface.org
- Framework: Astro SSR on Vercel (`@astrojs/vercel` serverless adapter)
- Database: Supabase PostgreSQL — same DB as fanspedia, table: `onlyfans_profiles`
- Language: English only — no i18n, no /es/ mirror, no Spanish pages ever
- Face matching: face-api.js (browser-side, 128-float descriptor) + Supabase pgvector — LIVE
- Real face search: `match_faces` pgvector RPC ranks all stored embeddings by cosine similarity (real match %). Popular-creators fallback only triggers when no face is detected in the upload.

## Tech Stack
- Frontend: Astro `.astro` components + vanilla JS islands where needed
- Styling: Custom CSS only — NO Bootstrap, NO Tailwind
- API routes: `src/pages/api/*.ts` (Astro endpoints)
- Database: Supabase via raw `fetch()` REST only — NEVER import `@supabase/supabase-js`
- Hosting: Vercel via `@astrojs/vercel` adapter
- Fonts: Syne (headings, weight 700/800) + Inter (body) — both via Google Fonts
- Images: Proxied via `images.weserv.nl` as WebP

## Logo
- Text: "findbyface" — all lowercase, no spaces
- Style: purple-to-pink gradient text (`#7c3aed` → `#ec4899`)
- Font: Syne Bold (800)
- Optional: small triangle/prism icon to the left in same gradient
- CSS:
  ```css
  .logo {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 1.5rem;
    background: linear-gradient(135deg, #7c3aed, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  ```

## Design System
| Token | Value |
|---|---|
| `--bg` | `#0a0a0f` — page background |
| `--surface` | `#12121a` — cards, panels |
| `--surface-raised` | `#1a1a2e` — elevated elements, modals |
| `--accent` | `#7c3aed` — primary purple |
| `--accent-light` | `#a855f7` — hover states |
| `--accent-pink` | `#ec4899` — gradient end, accents |
| `--accent-glow` | `rgba(124,58,237,0.25)` — box shadows, glows |
| `--text` | `#f0f0f5` — primary text |
| `--text-muted` | `#8888aa` — secondary text |
| `--border` | `rgba(124,58,237,0.2)` — borders |
| `--success` | `#22c55e` — match %, free badge |
| `--radius` | `12px` |
| `--radius-lg` | `20px` |

### Global CSS block (paste into Base.astro `<style is:global>`):
```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap');

:root {
  --bg: #0a0a0f; --surface: #12121a; --surface-raised: #1a1a2e;
  --accent: #7c3aed; --accent-light: #a855f7; --accent-pink: #ec4899;
  --accent-glow: rgba(124,58,237,0.25);
  --text: #f0f0f5; --text-muted: #8888aa; --border: rgba(124,58,237,0.2);
  --success: #22c55e; --radius: 12px; --radius-lg: 20px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg); color: var(--text);
  font-family: 'Inter', sans-serif; line-height: 1.6;
  min-height: 100vh;
}

h1, h2, h3, h4 { font-family: 'Syne', sans-serif; font-weight: 800; }
a { color: inherit; text-decoration: none; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 3px; }
```

## File Structure
```
/
├── src/
│   ├── layouts/
│   │   └── Base.astro            ← shared <head>, nav, footer, global CSS
│   ├── pages/
│   │   ├── index.astro           ← homepage: upload hero + stats + chips + cards
│   │   ├── onlyfans-search.astro ← dedicated search page with filters
│   │   ├── categories/
│   │   │   └── [slug].astro      ← SSR dynamic category page
│   │   ├── blog/
│   │   │   ├── index.astro       ← blog listing (Astro Content Collections)
│   │   │   └── [slug].astro      ← blog post page
│   │   └── api/
│   │       ├── search.ts         ← Supabase creator search proxy
│   │       ├── face-search.ts    ← face similarity search (MVP: mock)
│   │       └── health.ts         ← health check endpoint
│   ├── components/
│   │   ├── Nav.astro             ← top navigation bar
│   │   ├── UploadBox.astro       ← drag+drop upload hero (client:load)
│   │   ├── CreatorCard.astro     ← reusable creator card
│   │   ├── CategoryChips.astro   ← horizontal scrollable chip row
│   │   ├── StatsBar.astro        ← "2.4M+ creators · 98% accuracy · <2s · free"
│   │   └── SearchBar.astro       ← "or search by name" text input
│   └── config/
│       └── categories.ts         ← SINGLE SOURCE OF TRUTH for all categories
├── content/
│   └── blog/                     ← *.md files with YAML frontmatter
├── public/
│   ├── no-image.png
│   ├── robots.txt
│   └── models/                   ← face-api.js model weights (lazy-loaded)
├── astro.config.mjs
├── package.json
├── vercel.json
└── .env
```

## Environment Variables (.env)
```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=your_service_role_key_here
```
Access in Astro API routes: `import.meta.env.SUPABASE_URL`

## astro.config.mjs
```js
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: 'https://findbyface.org',
});
```

## package.json scripts
```json
{
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "start": "astro dev"
  }
}
```

## vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "astro"
}
```
No manual rewrites needed — Astro file-based routing handles everything.

---

## src/config/categories.ts
```ts
// SINGLE SOURCE OF TRUTH — never hardcode categories in pages

export interface Category {
  label: string;
  slug: string;
  terms: string[];  // Supabase ilike search terms
  emoji?: string;
}

export const categories: Category[] = [
  { label: 'Top',     slug: 'top',     terms: ['top','best','popular'],     emoji: '🔥' },
  { label: 'Blonde',  slug: 'blonde',  terms: ['blonde','blond'],           emoji: '👱' },
  { label: 'MILF',    slug: 'milf',    terms: ['milf','mom','cougar'] },
  { label: 'Trans',   slug: 'trans',   terms: ['trans','transgender'] },
  { label: 'Feet',    slug: 'feet',    terms: ['feet','foot','toes'] },
  { label: 'BBW',     slug: 'bbw',     terms: ['bbw','plus size','curvy'] },
  { label: 'Latina',  slug: 'latina',  terms: ['latina','latinas','hispanic'] },
  { label: 'Asian',   slug: 'asian',   terms: ['asian','japanese','korean','chinese'] },
  { label: 'Ebony',   slug: 'ebony',   terms: ['ebony','black'] },
  { label: 'Free',    slug: 'free',    terms: ['free'],                     emoji: '🆓' },
  // Add more as needed — never create a new .astro file per category
];

export function slugToCategory(slug: string): Category | undefined {
  return categories.find(c => c.slug === slug);
}
```

---

## API Routes Pattern (src/pages/api/*.ts)
```ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  // ... build params, fetch from Supabase

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

## api/search.ts — Full Logic
- 60s in-memory Map cache keyed by full URL string
- Params: `q`, `verified`, `bundles`, `price`, `page`, `page_size`, `sort`
- Multi-term: split `q` by `|` or `,` → OR across `username,name,about` ONLY (never `location`)
- Supabase OR: `params.set('or', '(username.ilike.*term*,name.ilike.*term*,about.ilike.*term*)')`
- Default order: `favoritedcount.desc,subscribeprice.asc`
- `sort=newest`: `first_seen_at.desc.nullslast,favoritedcount.desc`
- Supabase header `Prefer: count=exact` → read `Content-Range` for total
- Return shape: `{ creators: [...], total: number, hasMore: boolean }`
- Map DB cols to camelCase in response: `isverified` → `isVerified`, `subscribeprice` → `subscribePrice`

## api/face-search.ts — Face Search (LIVE pgvector)
Real cosine-similarity search. Three tiers, in order:
1. **Primary — `match_faces` RPC (pgvector):** sends `descriptor` as a `vector(128)` to the Postgres RPC, which ranks ALL `face_embedding`-indexed creators by cosine similarity and returns real `matchPct`. `mode: 'vector'`. This is the normal user path.
2. **Fallback — JS cosine:** only if the RPC call fails. Fetches up to 1000 creators with embeddings and computes `cosineSimilarity()` server-side. `mode: 'cosine'`.
3. **Final fallback — popular creators:** only when the upload has NO detectable face (`descriptor` empty/all-zero). Returns top creators by `favoritedcount` with `matchPct: null`. `mode: 'fallback'`.

```sql
-- match_faces RPC (scripts/setup_pgvector.sql)
CREATE OR REPLACE FUNCTION match_faces(query_embedding vector(128), match_count int DEFAULT 12)
RETURNS TABLE (id bigint, username text, name text, avatar text,
               isverified boolean, subscribeprice numeric, favoritedcount integer, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT id, username, name, avatar, isverified, subscribeprice, favoritedcount,
         1 - (face_embedding <=> query_embedding) AS similarity
  FROM onlyfans_profiles
  WHERE face_embedding IS NOT NULL
  ORDER BY face_embedding <=> query_embedding
  LIMIT match_count;
$$;
```

Embeddings are generated by `scripts/generate-embeddings.mjs` (face-api.js + TF.js, stores `face_embedding` as a pgvector). Grow the pool by running it; quality of matches scales with coverage.

---

## src/layouts/Base.astro — Structure
```astro
---
interface Props {
  title: string;
  description?: string;
  canonical?: string;
}
const { title, description, canonical } = Astro.props;
const canonicalUrl = canonical ?? new URL(Astro.url.pathname, 'https://findbyface.org').href;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- GA4 --><!-- placeholder — add GA4 tag here when ID is ready -->
  <title>{title}</title>
  <meta name="description" content={description ?? 'Find lookalike OnlyFans creators instantly.'} />
  <link rel="canonical" href={canonicalUrl} />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <!-- fonts preconnect -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
</head>
<body>
  <Nav />
  <main>
    <slot />
  </main>
  <footer><!-- footer content --></footer>
</body>
</html>
```

---

## Nav Component
- Left: logo — `<a href="/">findbyface</a>` styled with gradient CSS above
- Center: `Home` (active-underlined) | `OnlyFans Search`
- Right: `Sign in` button — purple outline pill (UI placeholder, no auth yet)
- Mobile: hamburger → slide-down menu
- Background: `rgba(10,10,15,0.85)` with `backdrop-filter: blur(12px)` — sticky top

---

## UploadBox Component — Behaviour
- Dashed border box (`border: 2px dashed var(--border)`), centered cloud-upload SVG icon
- Text: "Drop a photo here" (h3) + "Upload any image — we'll find creators who look just like them" (p)
- Button: "Choose photo" — purple filled pill
- Below box: divider "— or search by name —" + text input → navigates to `/onlyfans-search?q=`
- Accepts: `image/jpeg, image/png, image/webp`
- Also listens for Ctrl+V clipboard paste
- On file select flow:
  1. Show thumbnail preview inside the box
  2. Show loading spinner: "Analyzing face..."
  3. Lazy-load face-api.js models from `/models/`
  4. Detect face → extract descriptor
  5. POST to `/api/face-search` with `{ descriptor: float[] }`
  6. Render result cards below
  7. If no face detected: show inline error "No face detected — try a clearer photo"

---

## CreatorCard Component
```astro
---
interface Props {
  creator: {
    username: string; name: string; avatar: string;
    subscribeprice: number; isverified: boolean; matchPct?: number;
  };
  index: number;
}
---
```
- Image: proxied via `images.weserv.nl` at 320×427 (3:4 ratio)
- LCP: first card (`index === 0`) gets `loading="eager" fetchpriority="high"`
- Others: `loading="lazy"`
- Match badge: top-right purple pill if `matchPct` present
- Price: green `FREE` or `$X.XX`
- "View Profile" → `https://onlyfans.com/{username}` `target="_blank" rel="noopener"`

## Card CSS (CLS-safe)
```css
.creator-card { background: var(--surface); border-radius: var(--radius-lg); overflow: hidden;
  border: 1px solid var(--border); transition: transform 0.2s, box-shadow 0.2s; }
.creator-card:hover { transform: translateY(-4px); box-shadow: 0 8px 32px var(--accent-glow); }
.card-img-wrap { aspect-ratio: 3/4; overflow: hidden; position: relative; background: var(--surface-raised); }
.card-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
.match-badge { position: absolute; top: 8px; right: 8px;
  background: rgba(124,58,237,0.9); color: #fff;
  font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 20px; }
.card-body { padding: 12px 14px; }
.username { color: var(--text-muted); font-size: 13px; }
.price { color: var(--success); font-weight: 700; font-size: 15px; margin: 4px 0 10px; }
.view-btn { display: block; text-align: center; background: var(--accent);
  color: #fff; border-radius: 8px; padding: 8px; font-size: 13px; font-weight: 600;
  transition: background 0.2s; }
.view-btn:hover { background: var(--accent-light); }
```

---

## StatsBar Component
Four stat blocks in a row:
- `2.4M+` CREATORS INDEXED
- `98%` MATCH ACCURACY
- `<2s` SEARCH TIME
- `free` TO START

Numbers in large Syne font with purple/pink gradient. Labels in small uppercase muted text.

---

## /onlyfans-search page
- Header: "OnlyFans Search Engine" + subtitle
- Filter sidebar (desktop) / collapsible panel (mobile):
  - Text search input (debounced 300ms)
  - Verified toggle switch
  - Price range: Free / Under $5 / Under $10 / Any
  - Sort: Popular (default) / Newest
  - Bundles toggle
- Results grid: 4 col desktop, 2 col mobile — same CreatorCard
- Load More button — same `currentPage / isLoading / hasMore` pattern
- URL params sync all filter state (shareable links)

---

## /categories/[slug].astro — SSR Pattern
```astro
---
import Base from '../../layouts/Base.astro';
import { slugToCategory } from '../../config/categories';
import CreatorCard from '../../components/CreatorCard.astro';

const { slug } = Astro.params;
const category = slugToCategory(slug!);
if (!category) return Astro.redirect('/');

// Fetch from Supabase server-side
const creators = await fetchCreatorsByTerms(category.terms, 50);
---
<Base title={`Best ${category.label} OnlyFans Creators | findbyface`}>
  <!-- JSON-LD ItemList + BreadcrumbList -->
  <!-- pre-rendered cards grid -->
  <!-- define:vars={{ __CATEGORY_SSR: { slug, count: creators.length, hasMore: creators.length === 50 } }} -->
</Base>
```

---

## Blog (Astro Content Collections)
- Define collection in `src/content/config.ts`
- Frontmatter shape: `title`, `date`, `slug`, `description`, `image` (optional)
- `/blog/index.astro` — card grid of all posts, sorted by date desc
- `/blog/[slug].astro` — full post with `<article>` prose styling

---

## Image Proxy Helper (put in src/utils/image.ts)
```ts
export function proxyImg(url: string, w: number, h: number): string {
  if (!url || url.startsWith('/')) return url;
  const noScheme = url.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(noScheme)}&w=${w}&h=${h}&fit=cover&output=webp`;
}

export function buildSrcset(url: string): { src: string; srcset: string; sizes: string } {
  const widths = [144, 240, 320, 480, 720];
  const srcset = widths.map(w => `${proxyImg(url, w, Math.round(w*4/3))} ${w}w`).join(', ');
  const src = proxyImg(url, 320, 427);
  const sizes = '(max-width:480px) 144px, (max-width:768px) 240px, (max-width:1200px) 320px, 360px';
  return { src, srcset, sizes };
}
```

---

## face-api.js Integration Notes
- Model files go in `/public/models/` — download from:
  `https://github.com/vladmandic/face-api/tree/master/model`
  Required: `ssd_mobilenetv1_model-*`, `face_recognition_model-*`
- Load ONLY when user triggers upload — never on page load
- Browser-side code (in UploadBox client script):
  ```js
  const faceapi = await import('/node_modules/face-api.js/dist/face-api.js');
  await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
  const detection = await faceapi.detectSingleFace(imgEl).withFaceDescriptor();
  const descriptor = Array.from(detection.descriptor); // float[128]
  ```

---

## SEO Rules
- Every page: `<title>`, `<meta name="description">`, `<link rel="canonical">`
- Title pattern: "Find [Category] OnlyFans Lookalikes | findbyface"
- JSON-LD on category pages: BreadcrumbList + ItemList
- robots.txt: allow all, disallow `/api/`
- Trailing slash on all canonical URLs

---

## Sponsored Placements

Paid-placement infrastructure for `/promote` clients: pin a creator into an exact spot,
override their outbound link/image, and track clicks. Two config files drive everything —
fulfilling an order should be a config edit, not a code change.

### Config files
- `src/config/placements.ts` — **WHERE** a creator appears. `placements: Record<scope,
  { pinned: {username, position}[], excluded: string[] }>`. Scopes are `'home'`,
  `'category:<slug>'`, and `'face-search'` — there is no `country` concept in this
  codebase, don't invent one. For `home`/`category:<slug>`, `position` is 1-based and
  **global** across the full paginated list (position 21 = page 2, item 1 at page_size
  20). Use `pinAcrossCategories(username, position, slugs?)` to pin the same creator
  across every category (or an explicit subset) instead of hand-listing 38 entries.
  `face-search` is different — see below.
- `src/config/sponsors.ts` — what a creator's card **links to / shows**, independent of
  whether they're pinned anywhere. `sponsors: Record<username, { linkOverride?,
  imageOverride?, clickTable? }>`, case-insensitive lookup via `getSponsorOverride()`.
  `imageOverride` is applied in-memory only — never written to `onlyfans_profiles`, so it
  survives future scraper syncs. Overrides apply **everywhere** that creator's card can
  render (home, category pages, search, dashboard's cached "Latest Searches"), not just a
  pinned slot, since any organic exposure should still credit the campaign.

### How it fits together
- `src/lib/creatorFetch.ts` — `resolvePlacements(scope, {page, pageSize, termsOr, order})`
  is the fetch orchestrator: excludes pinned+excluded usernames from the organic query
  (keeps pagination offsets aligned), fetches pinned records separately by exact username,
  and interleaves them into their exact global position. Only activates when a `scope` is
  passed — `/api/search.ts` only sets it for the `home`/`category` load-more calls, never
  for free-text search, so pinning can never accidentally leak into user search results.
  **Resilience**: if a category's filtered organic query comes back empty or fails, it
  retries once with no filters (general "popular" list) and caps the returned `total` to
  what's actually on the page — never show a bogus unfiltered count under a category
  heading, and never let a query failure render as just a lone sponsored card.
- `src/lib/sponsorOverrides.ts` — `applySponsorOverrides(creators)` stamps a `profileUrl`
  (and swaps `avatar` if overridden) onto every creator object. Called at the end of every
  creator-mapping site: `api/search.ts`, `api/face-search.ts`, and the SSR fetches in
  `index.astro`/`categories/[slug].astro`. (`api/visual-search.ts` / `ai-discover.astro`
  are intentionally skipped — that page is draft, not production.)
- `src/pages/go/[username].ts` — the click-tracking redirect. Looks up the sponsor
  override, logs a click (only if `clickTable` is set and the UA isn't a bot) into
  whatever Supabase table `clickTable` names, then 302s to `linkOverride` (or the default
  OnlyFans URL if none). `placement` is derived server-side from `Referer`: known internal
  paths map to short labels (`home`, `category:<slug>`, `search`, `dashboard`,
  `internal:<path>`), other hosts become `external:<hostname>`, and a missing referrer is
  `null` — legitimate (pasted links, in-app browsers strip it), not an error.

### The `face-search` scope (AI upload results) is a different shape
`UploadBox.astro` → `api/face-search.ts` results are a single ranked list generated fresh
per uploaded photo, not a paginated offset query — there's no stable "global position" to
slot into. `applyFaceSearchPlacements()` in `creatorFetch.ts` **inserts** the pinned
creator at the configured 1-based position instead, bumping the total match count (it does
not replace or reorder organic matches). It intentionally omits `matchPct` on the inserted
row — it isn't a real similarity score, and the `sponsored: true` → "Ad · Sponsored" badge
is what discloses that. Called from all three `api/face-search.ts` branches (`vector` /
`cosine` / `fallback`) via `finalizeResults()`, before `applySponsorOverrides`.

**Sign-in gating interacts with this.** `UploadBox.astro` blurs every odd 0-based result
index (1, 3, 5…) behind a "sign in to unlock" paywall until the visitor signs in
(`isSignedIn()` checks `fbf_user` in `localStorage`) — real auth via Supabase Auth
(`api/auth/session.ts`), not a placeholder. A sponsored card must never render blurred —
that's an undisclosed ad, and unclickable to boot. Two things enforce this:
1. `renderCard()` in `UploadBox.astro` never blurs a card where `c.sponsored` is true,
   regardless of index (`locked = !signedIn && index % 2 === 1 && !isSponsored`) — this is
   the actual guarantee and holds for any configured position.
2. Even so, prefer **odd** 1-based positions (1, 3, 5…) when configuring a pin here — those
   land on the 0-based indexes (0, 2, 4…) that were already unblurred by design, keeping
   the sponsored slot's visual position stable and intentional rather than relying solely
   on the `!isSponsored` override.

### The `search-dropdown` scope (recent-searches ad row)
`api/search-ad.ts` serves the single pinned row shown above recent searches in every
search-history dropdown (see "Recent Searches Dropdown" below). It reads
`getPlacement('search-dropdown').pinned[0]` — only the first entry is ever used, there's
one ad slot, not a ranked list — fetches that creator's live row, and runs it through
`applySponsorOverrides` like everywhere else. The one twist: its `profileUrl` gets
`?slot=search-dropdown` appended (only when it's a `/go/` link) before being sent to the
client, so `/go/[username].ts` records these clicks under a distinct `placement` value
instead of whatever the hosting page's Referer would otherwise produce — see the `slot`
param note in that file. This is how the same creator's dropdown-ad performance stays
measurable separately from their other placements even when both appear on, say, the
homepage.

### Two gotchas that will silently break attribution
1. **Never `rel="noreferrer"` on a `/go/` link.** It stops the browser from sending a
   Referer to our own route, zeroing out placement data even for internal traffic. Use
   `rel="noopener nofollow sponsored"` instead — every render site already does this
   (`profileUrl.startsWith('/go/')` branches to the sponsored `rel`).
2. **Never enable client-side prefetching on a `/go/` link** (e.g. Astro's
   `data-astro-prefetch`, or the `@astrojs/prefetch` integration if it's ever added). A
   same-origin prefetch fires the redirect — and the click log — before any real click
   happens, logging impressions as clicks. This project has no prefetch integration
   installed today; if one is ever added, exclude `/go/` links explicitly and re-verify
   with Playwright (curl can't see this — it's a browser-only behavior).

### Render sites that must stay in sync
Card markup is duplicated in 7 places, not centralized — if you change how a card renders
(the sponsored badge, the `rel` logic, etc.), update all of them: `CreatorCard.astro`,
`index.astro` (load-more), `categories/[slug].astro` (load-more), `onlyfans-search.astro`,
`dashboard.astro` (cached "Latest Searches" mini-cards), `UploadBox.astro` (AI face-search
results — also owns the sign-in blur logic above). `ai-discover.astro` is explicitly
excluded — it's a draft page, leave it alone.

### Click-tracking tables
One Supabase table per paying client (`sponsor_clicks_<username>_fbf`) — isolated counts,
easy reporting, easy archive at campaign end. The `_fbf` suffix matters: this Supabase
project is shared with other sites (e.g. fanspedia), so it keeps a findbyface campaign's
table from colliding with another site's table for the same creator. The Supabase REST
API has no DDL, so new tables are SQL migrations the user runs manually, following
`scripts/migrations/002-006_*.sql`. Copy `scripts/migrations/007_sponsor_clicks_template.sql`
to `0NN_sponsor_clicks_<username>_fbf.sql`, fill in the username, have the user run it,
then set `clickTable: 'sponsor_clicks_<username>_fbf'` on that creator's `sponsors.ts`
entry.

### Per-order runbook
Given a creator identifier, purchased placements (home position / categories), a tracking
link, and optionally a custom image:
1. If the creator isn't in `onlyfans_profiles` yet, do a one-time fetch **from a completely
   isolated working directory** — never touch the running scraper/import process or its
   state files.
2. Add pin(s) to `placements.ts` (use `pinAcrossCategories` for multi-category buys).
3. Add the `sponsors.ts` entry (`linkOverride`/`imageOverride`/`clickTable` as needed). If
   `clickTable` is needed, write and hand off the migration first.
4. Verify locally in a real browser (position, badge, override, and — if tracked — the
   Playwright prefetch/click check above) before reporting back or pushing.

## Recent Searches Dropdown
Every live search bar on the site (the homepage hero mini-form in `UploadBox.astro`, and
the main input on `/onlyfans-search`) shares one dropdown implementation instead of each
maintaining its own copy:
- `src/lib/searchHistory.ts` — `localStorage` persistence under the `fbf_search_queries`
  key (unrelated to `fbf_history`, which is the *face-search result* history dashboard.astro
  reads for "Latest Searches" — don't conflate the two). Keeps the last 8 terms, newest
  first, case-insensitive dedupe (`"Blonde"` then `"blonde"` collapses to one entry).
- `src/lib/searchDropdown.ts` — `initSearchDropdown(refs)` wires open-on-focus-when-empty,
  outside-click/Escape-to-close, per-row remove, clear-all, and fetches/renders the pinned
  ad row (see `search-dropdown` scope above) once per page via `/api/search-ad`. The host
  page supplies its own DOM refs and an `onSelect(q)` callback — `onlyfans-search.astro` re-runs
  the in-place search, `UploadBox.astro`'s mini-form navigates to `/onlyfans-search/?q=...`
  since it has no results grid of its own.
- The recent-searches list itself is capped to ~3 visible rows (`max-height` + `overflow-y:
  auto` on `.dd-history`, keyed off the existing 44px row height) — the rest scroll. The ad
  row sits outside that scrollable area, always visible, never counted against the cap.
- No search bar exists in the nav today (`SearchBar.astro` is dead/unused code, not
  rendered anywhere) — don't assume one when reasoning about "every search bar."
- Dropdown markup (`.dd-row`, `.dd-ad-row`, etc.) is injected via `innerHTML`, so — same
  footgun as everywhere else on this site — its styles must live in an `is:global` block
  keyed off a container id (`#historyList`, `#homeHistoryList`, `#ddAdSlot`,
  `#homeDdAdSlot`), never Astro's default scoped `<style>`.

## Whole-card Click-Through
Every `.creator-card` (and the face-search `UploadBox.astro` variant) carries a
`data-href` attribute holding the same URL as its "View Profile" link.
`src/lib/cardClickThrough.ts` — `initCardClickThrough()` — delegates one `click` listener
on `document` per page: a click that didn't land on a nested `<a>`/`<button>` (so the
view-btn, and any future wishlist/favorite icon button, still behave natively) opens
`data-href` in a new tab via `window.open(href, '_blank', 'noopener')`. Locked face-search
cards (blurred, not signed in) open the sign-in modal instead of navigating — there's
nothing to view yet.
The function is idempotent (guarded by a module-level flag) because a page and a
component it renders can both call it — e.g. `index.astro` and the `UploadBox.astro` it
includes both do, and without the guard the click handler would double-fire and open two
tabs per click. Call it once per page/component that renders cards; don't worry about
calling it redundantly.
`dashboard.astro`'s "Latest Searches" mini-cards are already a single `<a>` wrapping the
whole card — no `data-href` needed there. `ai-discover.astro` is excluded, as always.

## Guardrails for AI
- NEVER use Bootstrap or Tailwind — custom CSS with the design tokens above only
- NEVER add Spanish/i18n — English only forever on this project
- NEVER create a separate .astro file per category — `[slug].astro` handles all
- NEVER import `@supabase/supabase-js` — raw fetch() only
- ALL Supabase column references must be lowercase
- GA4: leave `<!-- GA4 -->` comment placeholder in Base.astro — do NOT add the script tag yet
- "Sign in" button is UI placeholder — do NOT wire up any auth logic
- face-api.js models must ONLY load on user upload action — never on initial page load
- Do not run `git push` unless user explicitly says to push or deploy
