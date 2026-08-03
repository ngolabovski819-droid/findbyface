// Single source of truth for dynamic SEO titles + meta descriptions.
// Slug-hash deterministic rotation: same slug always renders the same copy
// (stable for SEO), neighbouring slugs get different patterns (uniqueness).

const Y = new Date().getFullYear();

// ---------- helpers ----------

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pickByHash<A extends unknown[]>(
  slug: string,
  patterns: ((...args: A) => string)[],
  args: A,
  maxLen: number,
  minLen = 0,
): string {
  const start = hashSlug(slug);
  for (let i = 0; i < patterns.length; i++) {
    const out = patterns[(start + i) % patterns.length](...args);
    if (out.length <= maxLen && out.length >= minLen) return out;
  }
  // last resort: return shortest
  let best = patterns[0](...args);
  for (const p of patterns) {
    const v = p(...args);
    if (v.length < best.length) best = v;
  }
  return best.slice(0, maxLen);
}

// Bucket the count to a clean round number for use in copy.
// Returns { display: string, hasPlus: boolean } — display is what we drop into
// patterns; hasPlus signals whether to render "N+" form.
export function bucketCount(total: number): { display: string; hasPlus: boolean } {
  if (!total || total < 1) return { display: 'Top', hasPlus: false };
  if (total >= 1000) return { display: '1000', hasPlus: true };
  if (total >= 500)  return { display: '500',  hasPlus: true };
  if (total >= 300)  return { display: '300',  hasPlus: true };
  if (total >= 200)  return { display: '200',  hasPlus: true };
  if (total >= 150)  return { display: '150',  hasPlus: true };
  if (total >= 100)  return { display: '100',  hasPlus: true };
  if (total >= 50)   return { display: '50',   hasPlus: true };
  if (total >= 20)   return { display: '20',   hasPlus: true };
  return { display: String(total), hasPlus: false };
}

// Niche-noun map — adds flavour to patterns that include {nicheNoun}.
const NICHE_NOUN: Record<string, string> = {
  feet: 'fetish lovers',
  footjob: 'fetish lovers',
  bondage: 'kink lovers',
  'rough-sex': 'kink lovers',
  anal: 'kink lovers',
  bukkake: 'kink lovers',
  bbc: 'kink lovers',
  'strap-on': 'kink lovers',
  bbw: 'curve lovers',
  mature: 'cougar fans',
  milf: 'cougar fans',
  'old-young': 'age-gap fans',
  latina: 'Latina enthusiasts',
  asian: 'Asian enthusiasts',
  ebony: 'Ebony enthusiasts',
  indian: 'Desi enthusiasts',
  korean: 'Korean enthusiasts',
  japanese: 'Japanese enthusiasts',
  italian: 'Italian enthusiasts',
  dutch: 'Dutch enthusiasts',
  greek: 'Greek enthusiasts',
  serbian: 'Serbian enthusiasts',
  petite: 'petite fans',
  'small-tits': 'petite fans',
  'big-tits': 'busty fans',
  redhead: 'redhead fans',
  blonde: 'blonde lovers',
  'white-girls': 'fans',
  free: 'budget hunters',
  top: 'mainstream fans',
  models: 'mainstream fans',
  celebrity: 'mainstream fans',
  trans: 'trans community',
  hentai: 'anime fans',
  blowjob: 'oral fans',
  'pussy-licking': 'oral fans',
  'solo-male': 'solo fans',
  threesome: 'group fans',
};

function nicheFor(slug: string): string {
  return NICHE_NOUN[slug] || 'OnlyFans fans';
}

// ---------- CATEGORY TITLES ----------
// All take (label, n, plus) where n already string ("200" or "37" or "Top"),
// plus signals whether to append "+".

const CAT_TITLES: ((label: string, n: string, plus: boolean) => string)[] = [
  (l, n, p) => `Best ${n}${p ? '+' : ''} OnlyFans ${l} Creators You Must Check (${Y})`,
  (l, n, p) => `Top ${n}${p ? '+' : ''} ${l} OnlyFans Accounts Worth Subscribing ${Y}`,
  (l, n, p) => `${n}${p ? '+' : ''} Best ${l} OnlyFans Creators Ranked for ${Y}`,
  (l, n, p) => `${l} OnlyFans · ${n}${p ? '+' : ''} Top Creators (Updated ${Y})`,
  (l, n, p) => `Best ${l} OnlyFans Girls — ${n}${p ? '+' : ''} Verified Picks ${Y}`,
  (l, n, p) => `${n}${p ? '+' : ''} Hottest ${l} OnlyFans Creators of ${Y}`,
  (l, n, p) => `The ${n}${p ? '+' : ''} Best ${l} OnlyFans Accounts to Follow ${Y}`,
  (l, n, p) => `${n}${p ? '+' : ''} ${l} OnlyFans · Free + Verified Picks ${Y}`,
  (l, n, p) => `Top ${n}${p ? '+' : ''} OnlyFans ${l} Models Ranked (${Y})`,
  (l, n, p) => `Best ${l} OnlyFans · ${n}${p ? '+' : ''} Picks Ranked by Fans ${Y}`,
];

// ---------- CATEGORY DESCRIPTIONS ----------
// (label, n, plus, niche) — patterns may use the niche noun for flavour.

const CAT_DESCS: ((label: string, n: string, plus: boolean, niche: string) => string)[] = [
  (l, n, p) => `Discover the ${n}${p ? '+' : ''} best ${l} OnlyFans creators of ${Y}, ranked by real fan engagement. Free and verified accounts, bundle deals, and instant face-match search.`,
  (l, n, p, ni) => `Browse ${n}${p ? '+' : ''} top ${l} OnlyFans accounts curated for ${ni}. See pricing, verification badges, and bundle offers — no signup, daily refreshed.`,
  (l, n, p) => `The definitive ${Y} list of ${n}${p ? '+' : ''} ${l} OnlyFans creators worth your subscription. Filter free, verified, and discount bundles in one click.`,
  (l, n, p) => `Looking for the best ${l} OnlyFans? Our ${n}${p ? '+' : ''}-creator directory ranks every profile by popularity, with free, verified, and bundle filters built in.`,
  (l, n, p) => `${n}${p ? '+' : ''} hand-picked ${l} OnlyFans creators for ${Y} — sorted by fan engagement, with verified status, bundle offers, and AI face match search.`,
  (l, n, p) => `Browse ${n}${p ? '+' : ''} ${l} OnlyFans accounts ranked for ${Y}. Compare pricing, popularity, and verification at a glance — free face search included.`,
  (l, n, p) => `From new accounts to top earners, here are the ${n}${p ? '+' : ''} best ${l} OnlyFans creators of ${Y} — every one filterable by price, free status, and verification.`,
  (l, n, p) => `${n}${p ? '+' : ''} ${l} OnlyFans creators worth following in ${Y}. AI face match included, plus free filters, verification badges, and live bundle pricing.`,
];

// ---------- public API ----------

export interface CategorySeo {
  title: string;
  description: string;
  // Extras useful for FAQ JSON-LD on category pages
  niche: string;
  countDisplay: string; // e.g. "200" or "Top" or "37"
  hasPlus: boolean;
}

export function categorySeo(slug: string, label: string, total: number): CategorySeo {
  const { display, hasPlus } = bucketCount(total);
  const niche = nicheFor(slug);

  const title = pickByHash(slug, CAT_TITLES, [label, display, hasPlus], 60, 30);
  const description = pickByHash(slug, CAT_DESCS, [label, display, hasPlus, niche], 165, 120);

  return { title, description, niche, countDisplay: display, hasPlus };
}

// ---------- static page meta (hand-tuned) ----------

export const HOME_SEO = {
  title: `Adult Face Finder · Search Creators & Videos by Photo`,
  description:
    'Upload a photo to search OnlyFans creator profiles and indexed adult video appearances with AI face matching. Free to start; no sign-up required.',
};

export const SEARCH_SEO = {
  title: `OnlyFans Search Engine · Filter 2.4M+ Profiles (${Y})`,
  description: `Search 2.4M+ OnlyFans creators with filters for verified, free, and bundle offers. Find your next subscription in seconds — no signup, daily refreshed in ${Y}.`,
};

export const AI_DISCOVER_SEO = {
  title: `Build Your Ideal Type · AI Visual Preference Discovery (${Y})`,
  description:
    'Dial in your ideal face — eye color, jaw width, lip fullness, and more — and instantly see the OnlyFans creators who match. No photo upload required.',
};

export const BLOG_SEO = {
  title: `OnlyFans Insights · Guides, Lists & Reviews | findbyface`,
  description:
    'Honest OnlyFans guides, ranked lists, and creator reviews. Tips on free accounts, bundle deals, verification, and AI face search — updated weekly.',
};
