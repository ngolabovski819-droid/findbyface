// What a sponsored creator's card LINKS TO and SHOWS — separate from placements.ts
// (which controls WHERE they appear). Applies wherever that creator's card renders
// anywhere on the site (organic search, home, category pages), not just their pinned
// slot, since any exposure should credit the campaign. Keys are usernames; lookup is
// case-insensitive via getSponsorOverride().
//
// - linkOverride: custom tracking/referral URL. When set (or clickTable is set), the
//   creator's card routes through /go/<username> instead of linking straight to OnlyFans.
// - imageOverride: custom card image. Applied in-memory only, never written back to
//   onlyfans_profiles — survives future scraper syncs and is trivial to remove.
// - clickTable: Supabase table name to log clicks into (see scripts/migrations/007_*).
//   Omit to skip click logging even if linkOverride is set.
export interface SponsorOverride {
  linkOverride?: string;
  imageOverride?: string;
  clickTable?: string;
  tags?: string[];
  additionalTagCount?: number;
  galleryImages?: string[];
}

export const sponsors: Record<string, SponsorOverride> = {
  emilylopz: {
    linkOverride: 'https://onlyfans.com/emilylopz/c545',
    clickTable: 'sponsor_clicks_emilylopz_fbf',
    tags: ['GFE', 'Feet fetish', 'Squirting'],
    additionalTagCount: 9,
    galleryImages: Array.from(
      { length: 24 },
      (_, index) => `/uploads/sponsors/emilylopz/emily-${String(index + 1).padStart(2, '0')}.jpg`,
    ),
  },
  rocketreynaxo: {
    linkOverride: 'https://onlyfans.com/rocketreynaxo/trial/12v36e0ushqqqe1bdaqa4gramuus1m2d',
    imageOverride: '/uploads/sponsors/rocketreynaxo/rocket-01.jpg',
    clickTable: 'sponsor_clicks_rocketreynaxo_fbf',
    tags: ['asian milf', 'busty', 'curvy'],
    // 01-03 added 2026-10-07 in front of the original set (client's 1, 2, 3); the
    // original 01-10 were renumbered to 04-13, so this array is still display order.
    galleryImages: Array.from(
      { length: 13 },
      (_, index) => `/uploads/sponsors/rocketreynaxo/rocket-${String(index + 1).padStart(2, '0')}.jpg`,
    ),
  },
  hannazuki: {
    linkOverride: 'https://onlyfans.com/hannazuki/trial/kqv4mhnqp9ifhpwin0vtfxnsscmlv9jy',
    imageOverride: '/uploads/sponsors/hannazuki/hanna-01.jpg',
    clickTable: 'sponsor_clicks_hannazuki_fbf',
    tags: ['asian', 'cosplay', 'egirl', 'GFE'],
    // 01-04 added 2026-10-07 in front of the original set (client's 1.1, 2.2, 2.3, 2.4);
    // the original 01-07 were renumbered to 05-11, so this array is still display order.
    galleryImages: Array.from(
      { length: 11 },
      (_, index) => `/uploads/sponsors/hannazuki/hanna-${String(index + 1).padStart(2, '0')}.jpg`,
    ),
  },
  // Added 2026-09-19: face-search slot 5, #7 on onlyfans-search and every category (see
  // placements.ts). Same tracking link, tags and 50 processed
  // images as her fanspedia.net campaign — the files are byte-identical copies of fanspedia's
  // public/uploads/sponsors/sophiescrts/, already in the client's order.
  sophiescrts: {
    linkOverride: 'https://onlyfans.com/sophiescrts/c7',
    imageOverride: '/uploads/sponsors/sophiescrts/sophie-01.jpg',
    clickTable: 'sponsor_clicks_sophiescrts_fbf', // scripts/migrations/029_*.sql
    tags: ['natural big tits', 'brunette'],
    additionalTagCount: 9,
    galleryImages: Array.from(
      { length: 50 },
      (_, index) => `/uploads/sponsors/sophiescrts/sophie-${String(index + 1).padStart(2, '0')}.jpg`,
    ),
  },
  // sarahwylde, vietnami and aussiesunlocked added 2026-10-10: #3, #6 and #7 on face-search,
  // onlyfans-search and every category (see placements.ts). Each sent three photos, written to
  // disk in the client's 1, 2, 3 order, so the 01..03 arrays are display order.
  sarahwylde: {
    linkOverride: 'https://onlyfans.com/sarahwylde/c35',
    imageOverride: '/uploads/sponsors/sarahwylde/sarah-01.jpg',
    clickTable: 'sponsor_clicks_sarahwylde_fbf', // scripts/migrations/030_*.sql
    tags: ['fetish friendly', 'blonde'],
    additionalTagCount: 9,
    galleryImages: Array.from(
      { length: 3 },
      (_, index) => `/uploads/sponsors/sarahwylde/sarah-${String(index + 1).padStart(2, '0')}.jpg`,
    ),
  },
  vietnami: {
    linkOverride: 'https://onlyfans.com/vietnami/c157',
    imageOverride: '/uploads/sponsors/vietnami/nami-01.jpg',
    clickTable: 'sponsor_clicks_vietnami_fbf', // scripts/migrations/030_*.sql
    tags: ['petite', 'kinky'],
    galleryImages: Array.from(
      { length: 3 },
      (_, index) => `/uploads/sponsors/vietnami/nami-${String(index + 1).padStart(2, '0')}.jpg`,
    ),
  },
  aussiesunlocked: {
    linkOverride: 'https://onlyfans.com/aussiesunlocked/c304',
    imageOverride: '/uploads/sponsors/aussiesunlocked/aussies-01.jpg',
    clickTable: 'sponsor_clicks_aussiesunlocked_fbf', // scripts/migrations/030_*.sql
    tags: ['horny duo', 'JOI'],
    additionalTagCount: 8,
    galleryImages: Array.from(
      { length: 3 },
      (_, index) => `/uploads/sponsors/aussiesunlocked/aussies-${String(index + 1).padStart(2, '0')}.jpg`,
    ),
  },
};

export function getSponsorOverride(username: string): SponsorOverride | undefined {
  const key = username.toLowerCase();
  for (const [k, v] of Object.entries(sponsors)) {
    if (k.toLowerCase() === key) return v;
  }
  return undefined;
}

/**
 * Vanity slugs for the `/go/<slug>` redirect ONLY. Lets a sponsor share
 * `findbyface.org/go/<anything>` — the OF username of a profile in the owner's promo
 * sheet, an IG/TikTok persona, a per-campaign name — instead of `/go/<of-username>`.
 * The route resolves the alias to the target's `linkOverride` + `clickTable` and logs
 * the click with `placement: 'vanity:<alias>'`, so each shared link reports separately.
 *
 * Alias → real OF username, both matched case-insensitively. Adding one is a single
 * line + deploy: no DNS, no Vercel config, no migration (it reuses the target's table).
 * Cards, profile pages and click-token minting never see aliases — they key on the
 * real username via getSponsorOverride().
 *
 * Mirrors GO_ALIASES in the fanspedia repo; the two sites' alias lists are independent,
 * since each promo-sheet row is sold per-site.
 */
export const GO_ALIASES: Record<string, string> = {
  // emilylopz
  bigtittytifff: 'emilylopz',
};

const NORMALIZED_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(GO_ALIASES).map(([alias, username]) => [alias.trim().toLowerCase(), username.trim().toLowerCase()]),
);

// Build-time guard (runs on module load, so a bad config fails the build loudly): an alias
// that shadows a real sponsor username would silently hijack that sponsor's /go/ link, and
// an alias pointing at a non-sponsor would redirect but never log.
for (const [alias, username] of Object.entries(NORMALIZED_ALIASES)) {
  if (getSponsorOverride(alias)) {
    throw new Error(`GO_ALIASES: "${alias}" collides with a sponsors username`);
  }
  if (!getSponsorOverride(username)) {
    throw new Error(`GO_ALIASES: "${alias}" points at "${username}", which has no sponsors entry`);
  }
}

/**
 * Resolve a `/go/<slug>` path segment to the real sponsor username. Non-aliases resolve
 * to themselves unchanged, so existing `/go/<username>` links behave exactly as before.
 */
export function resolveGoAlias(slug: string): { username: string; isAlias: boolean } {
  const target = NORMALIZED_ALIASES[slug.trim().toLowerCase()];
  return target ? { username: target, isAlias: true } : { username: slug, isAlias: false };
}
