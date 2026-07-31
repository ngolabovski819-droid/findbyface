// Applies sponsor link/image overrides (src/config/sponsors.ts) to a list of creators,
// wherever they came from. Call this at the end of every creator-mapping site so an
// overridden creator's tracked link/custom image follows them everywhere their card
// renders — not just their pinned slot.
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
      tags: override.tags,
      additionalTagCount: override.additionalTagCount,
      galleryImages: override.galleryImages,
      // Only route through the tracked redirect when there's something to track —
      // a pure image swap with no link/click config keeps the default outbound link.
      profileUrl: override.linkOverride || override.clickTable ? `/go/${encodeURIComponent(c.username)}` : defaultUrl,
    };
  });
}
