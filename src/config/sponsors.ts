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
    galleryImages: Array.from(
      { length: 10 },
      (_, index) => `/uploads/sponsors/rocketreynaxo/rocket-${String(index + 1).padStart(2, '0')}.jpg`,
    ),
  },
  cosplaytsumiko: {
    linkOverride: 'https://onlyfans.com/cosplaytsumiko/c58',
    imageOverride: '/uploads/sponsors/cosplaytsumiko/tsumiko-01.jpg',
    clickTable: 'sponsor_clicks_cosplaytsumiko_fbf',
    tags: ['cosplay', 'big tits', 'asian'],
    additionalTagCount: 9,
    // Client asked for images 1-5 in order, then the rest mixed — the files are already
    // written to disk in exactly that sequence (see the onboarding note in git history),
    // so a plain 01..29 run IS the requested order.
    galleryImages: Array.from(
      { length: 29 },
      (_, index) => `/uploads/sponsors/cosplaytsumiko/tsumiko-${String(index + 1).padStart(2, '0')}.jpg`,
    ),
  },
  rinayanami: {
    linkOverride: 'https://onlyfans.com/rinayanami/c31',
    imageOverride: '/uploads/sponsors/rinayanami/rina-01.jpg',
    clickTable: 'sponsor_clicks_rinayanami_fbf',
    tags: ['petite', 'asian', 'nerdy', 'GFE'],
    additionalTagCount: 5,
    // Client's set was numbered 1, 3-9, 13-16 (their numbering had gaps, and 15 was a
    // byte-identical copy of 9, so it was dropped). Written to disk in that numeric order
    // as a plain 01..11 run, so this array IS the client's "starting from 1" order.
    galleryImages: Array.from(
      { length: 11 },
      (_, index) => `/uploads/sponsors/rinayanami/rina-${String(index + 1).padStart(2, '0')}.jpg`,
    ),
  },
  hannazuki: {
    linkOverride: 'https://onlyfans.com/hannazuki/trial/kqv4mhnqp9ifhpwin0vtfxnsscmlv9jy',
    imageOverride: '/uploads/sponsors/hannazuki/hanna-01.jpg',
    clickTable: 'sponsor_clicks_hannazuki_fbf',
    tags: ['asian', 'cosplay', 'egirl', 'GFE'],
    galleryImages: Array.from(
      { length: 7 },
      (_, index) => `/uploads/sponsors/hannazuki/hanna-${String(index + 1).padStart(2, '0')}.jpg`,
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
