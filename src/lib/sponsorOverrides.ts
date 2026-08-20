// Applies sponsor link/image overrides (src/config/sponsors.ts) to a list of creators,
// wherever they came from. Call this at the end of every creator-mapping site so an
// overridden creator's tracked link/custom image follows them everywhere their card
// renders — not just their pinned slot.
//
// Deliberately does NOT mint a click-verification token here even though this looks like the
// natural place for it — the biggest callers can't carry per-visit state at all: the category
// pages AND /onlyfans-search's first page are prerendered at build time (one HTML file served
// to everyone until the next deploy) and index.astro is CDN-cached (`s-maxage=300,
// stale-while-revalidate=86400`), so anything baked in here would be shared verbatim by every
// visitor, which defeats the entire point of a per-visit token. See src/lib/clickToken.ts and
// src/pages/api/click-token.ts for where minting actually happens instead (a client-side,
// always-uncached fetch after the page has loaded).
import { getSponsorOverride } from '../config/sponsors';

interface OverridableCreator {
  username: string;
  avatar?: string;
  header?: string;
}

export function applySponsorOverrides<T extends OverridableCreator>(
  creators: T[],
): (T & { profileUrl: string })[] {
  return creators.map(c => {
    const override = getSponsorOverride(c.username);
    const defaultUrl = `https://onlyfans.com/${encodeURIComponent(c.username)}`;

    if (!override) {
      return { ...c, profileUrl: defaultUrl };
    }

    return {
      ...c,
      sponsored: true,
      avatar: override.imageOverride ?? c.avatar,
      // A custom campaign gallery is authoritative. Do not insert the scraped
      // profile header between its first and second supplied images.
      header: override.imageOverride ? undefined : c.header,
      tags: override.tags,
      additionalTagCount: override.additionalTagCount,
      galleryImages: override.galleryImages,
      // Only route through the tracked redirect when there's something to track —
      // a pure image swap with no link/click config keeps the default outbound link.
      profileUrl: override.linkOverride || override.clickTable ? `/go/${encodeURIComponent(c.username)}` : defaultUrl,
    };
  });
}
