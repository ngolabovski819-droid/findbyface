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
};

export function getSponsorOverride(username: string): SponsorOverride | undefined {
  const key = username.toLowerCase();
  for (const [k, v] of Object.entries(sponsors)) {
    if (k.toLowerCase() === key) return v;
  }
  return undefined;
}
