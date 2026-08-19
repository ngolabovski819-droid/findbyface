// Composes a short, factual one-paragraph blurb for a "Best Creators" list
// entry. Every clause is built ONLY from real fields returned by
// fetchTopCreatorsForCategory (rank, favoritedCount, isVerified,
// subscribePrice, about) — nothing here is invented biographical or
// reputational fact about a real person. If `about` (their own bio text) is
// present, a short excerpt of their own words is quoted rather than
// paraphrased into a claim.
import type { TopCreatorRow } from './creatorFetch';

const MAX_ABOUT_EXCERPT = 160;

// The `about` column stores whatever HTML the creator's OnlyFans bio editor
// produced (often <p>/<br>/<a> tags and encoded entities) — this must never
// reach the page as literal text interpolation, since Astro escapes it
// (users would see raw "&lt;p&gt;" on the page rather than real markup).
function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Some bios are just a spammed handle/keyword repeated over and over — quoting
// that verbatim reads as broken, not "in her own words". Two cheap signals:
// a low unique-word ratio (catches "word word word word ..."), and a repeated
// substring regex (catches "PhraseXPhraseXPhraseX" with no spaces between
// repeats, which word-splitting alone misses).
function isLowQualityText(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 6) {
    const unique = new Set(words);
    if (unique.size / words.length < 0.5) return true;
  }
  return /(.{8,}?)\1{2,}/.test(text);
}

function excerptAbout(about: string | null | undefined): string | undefined {
  if (!about) return undefined;
  const cleaned = stripHtml(about);
  if (cleaned.length < 12 || isLowQualityText(cleaned)) return undefined;

  const excerpt = cleaned.length <= MAX_ABOUT_EXCERPT
    ? cleaned
    : (() => {
        const cut = cleaned.slice(0, MAX_ABOUT_EXCERPT);
        const lastSpace = cut.lastIndexOf(' ');
        return `${cut.slice(0, lastSpace > 40 ? lastSpace : MAX_ABOUT_EXCERPT)}...`;
      })();

  // The full bio can pass the quality check while the *truncated* excerpt
  // still lands entirely inside a spammed/repeated segment — check again on
  // what's actually about to be quoted, not just the source text.
  if (isLowQualityText(excerpt)) return undefined;
  return excerpt;
}

export function describeCreator(
  creator: TopCreatorRow,
  rank: number,
  categoryLabel: string,
  locale: 'en' | 'es' = 'en',
): string {
  const about = excerptAbout(creator.about);
  const priceIsFree = !creator.subscribePrice || Number.isNaN(Number(creator.subscribePrice));

  if (locale === 'es') {
    const rankClause = rank === 1
      ? `Lidera la categoría ${categoryLabel} en findbyface`
      : `#${rank} en la categoría ${categoryLabel} en findbyface`;
    const statClause = creator.favoritedCount
      ? ` con ${creator.favoritedCount.toLocaleString('es')} favoritos`
      : ' según interacción real';
    const verifiedClause = creator.isVerified ? ' Cuenta verificada en OnlyFans.' : '';
    const priceClause = priceIsFree ? ' Actualmente gratis para suscribirse.' : ` Suscripción desde $${Number(creator.subscribePrice).toFixed(2)}.`;
    const aboutClause = about ? ` En sus propias palabras: "${about}"` : '';
    return `${rankClause}${statClause}.${verifiedClause}${priceClause}${aboutClause}`.trim();
  }

  const rankClause = rank === 1
    ? `Leads the ${categoryLabel} category on findbyface`
    : `#${rank} in the ${categoryLabel} category on findbyface`;
  const statClause = creator.favoritedCount
    ? ` with ${creator.favoritedCount.toLocaleString('en')} favorites`
    : ' based on real engagement';
  const verifiedClause = creator.isVerified ? ' Verified account on OnlyFans.' : '';
  const priceClause = priceIsFree ? ' Currently free to subscribe.' : ` Subscription starts at $${Number(creator.subscribePrice).toFixed(2)}.`;
  const aboutClause = about ? ` In her own words: "${about}"` : '';
  return `${rankClause}${statClause}.${verifiedClause}${priceClause}${aboutClause}`.trim();
}
