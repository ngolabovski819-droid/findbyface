# findbyface — Copilot Instructions

## Big Picture
- AI lookalike finder: users upload a photo → get matching OnlyFans creators by visual similarity
- Domain: findbyface.org
- Framework: Astro SSR on Vercel (`@astrojs/vercel` serverless adapter)
- Database: Supabase PostgreSQL — same DB as fanspedia, table: `onlyfans_profiles`
- Language: English only — no i18n, no /es/ mirror, no Spanish pages ever
- Face matching: face-api.js (browser-side, 128-float descriptor) + Supabase pgvector (Phase 2)
- MVP face search: returns top creators by `favoritedcount` with mocked match percentages (75–97%)

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

## api/face-search.ts — Face Search
```ts
// MVP: ignores descriptor, returns top 12 by favoritedcount with fake match %
// Phase 2: pgvector cosine similarity
//   SQL: SELECT *, 1 - (face_embedding <=> $descriptor::vector) AS score
//        FROM onlyfans_profiles ORDER BY score DESC LIMIT 12

export const POST: APIRoute = async ({ request }) => {
  const { descriptor } = await request.json(); // float[128] from face-api.js client
  // MVP: fetch top 12, assign random match 75-97%
  const creators = await fetchTopCreators(12);
  const results = creators.map(c => ({
    ...c,
    matchPct: Math.floor(Math.random() * 22) + 75
  }));
  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

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
