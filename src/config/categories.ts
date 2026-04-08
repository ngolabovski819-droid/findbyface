// SINGLE SOURCE OF TRUTH — never hardcode categories in pages

export interface Category {
  label: string;
  slug: string;
  terms: string[];
  emoji?: string;
}

export const categories: Category[] = [
  { label: 'Top',      slug: 'top',      terms: ['top', 'best', 'popular'],              emoji: '🔥' },
  { label: 'Blonde',   slug: 'blonde',   terms: ['blonde', 'blond'],                     emoji: '👱' },
  { label: 'MILF',     slug: 'milf',     terms: ['milf', 'mom', 'cougar'] },
  { label: 'Trans',    slug: 'trans',    terms: ['trans', 'transgender'] },
  { label: 'Feet',     slug: 'feet',     terms: ['feet', 'foot', 'toes'] },
  { label: 'BBW',      slug: 'bbw',      terms: ['bbw', 'plus size', 'curvy'] },
  { label: 'Latina',   slug: 'latina',   terms: ['latina', 'latinas', 'hispanic'] },
  { label: 'Asian',    slug: 'asian',    terms: ['asian', 'japanese', 'korean', 'chinese'] },
  { label: 'Ebony',    slug: 'ebony',    terms: ['ebony', 'black'] },
  { label: 'Redhead',  slug: 'redhead',  terms: ['redhead', 'ginger', 'red hair'] },
  { label: 'Petite',   slug: 'petite',   terms: ['petite', 'small', 'tiny'] },
  { label: 'Free',     slug: 'free',     terms: ['free'],                                emoji: '🆓' },
  // Add more as needed — never create a new .astro file per category
];

export function slugToCategory(slug: string): Category | undefined {
  return categories.find(c => c.slug === slug);
}
