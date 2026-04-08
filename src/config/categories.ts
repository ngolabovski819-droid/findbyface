// SINGLE SOURCE OF TRUTH — never hardcode categories in pages

export interface Category {
  label: string;
  slug: string;
  terms: string[];
  emoji?: string;
}

export const categories: Category[] = [
  { label: 'Top',          slug: 'top',          terms: ['top', 'best', 'popular'],                emoji: '🔥' },
  { label: 'Blonde',       slug: 'blonde',       terms: ['blonde', 'blond'],                       emoji: '👱' },
  { label: 'MILF',         slug: 'milf',         terms: ['milf', 'mom', 'cougar'] },
  { label: 'Trans',        slug: 'trans',        terms: ['trans', 'transgender'] },
  { label: 'Feet',         slug: 'feet',         terms: ['feet', 'foot', 'toes'] },
  { label: 'BBW',          slug: 'bbw',          terms: ['bbw', 'plus size', 'curvy'] },
  { label: 'Latina',       slug: 'latina',       terms: ['latina', 'latinas', 'hispanic'] },
  { label: 'Asian',        slug: 'asian',        terms: ['asian', 'japanese', 'korean', 'chinese'] },
  { label: 'Ebony',        slug: 'ebony',        terms: ['ebony', 'black'] },
  { label: 'Redhead',      slug: 'redhead',      terms: ['redhead', 'ginger', 'red hair'] },
  { label: 'Petite',       slug: 'petite',       terms: ['petite', 'small', 'tiny'] },
  { label: 'Free',         slug: 'free',         terms: ['free'],                                  emoji: '🆓' },
  { label: 'Models',       slug: 'models',       terms: ['model', 'models', 'modeling'] },
  { label: 'White Girls',  slug: 'white-girls',  terms: ['white', 'white girl', 'caucasian'] },
  { label: 'Blowjob',      slug: 'blowjob',      terms: ['blowjob', 'bj', 'oral'] },
  { label: 'Footjob',      slug: 'footjob',      terms: ['footjob', 'foot job', 'feet'] },
  { label: 'Indian',       slug: 'indian',       terms: ['indian', 'india', 'desi'] },
  { label: 'Korean',       slug: 'korean',       terms: ['korean', 'korea', 'kpop'] },
  { label: 'Japanese',     slug: 'japanese',     terms: ['japanese', 'japan', 'asian japanese'] },
  { label: 'Greek',        slug: 'greek',        terms: ['greek', 'greece', 'hellenic'] },
  { label: 'Serbian',      slug: 'serbian',      terms: ['serbian', 'serbia', 'balkan'] },
  { label: 'Bondage',      slug: 'bondage',      terms: ['bondage', 'bdsm', 'tied'] },
  { label: 'BBC',          slug: 'bbc',          terms: ['bbc', 'big black cock', 'interracial'] },
  { label: 'Anal',         slug: 'anal',         terms: ['anal', 'booty', 'anal sex'] },
  { label: 'Small Tits',   slug: 'small-tits',   terms: ['small tits', 'small boobs', 'flat chest'] },
  { label: 'Big Tits',     slug: 'big-tits',     terms: ['big tits', 'big boobs', 'busty', 'large breasts'] },
  { label: 'Mature',       slug: 'mature',       terms: ['mature', 'older woman', 'cougar'] },
  { label: 'Hentai',       slug: 'hentai',       terms: ['hentai', 'anime', 'cosplay anime'] },
  { label: 'Old Young',    slug: 'old-young',    terms: ['old young', 'age gap', 'older'] },
  { label: 'Threesome',    slug: 'threesome',    terms: ['threesome', 'ffm', 'mmf', 'group'] },
  { label: 'Bukkake',      slug: 'bukkake',      terms: ['bukkake', 'facial', 'cumshot'] },
  { label: 'Celebrity',    slug: 'celebrity',    terms: ['celebrity', 'famous', 'star'] },
  { label: 'Strap On',     slug: 'strap-on',     terms: ['strap on', 'strapon', 'pegging'] },
  { label: 'Italian',      slug: 'italian',      terms: ['italian', 'italy', 'italiana'] },
  { label: 'Dutch',        slug: 'dutch',        terms: ['dutch', 'netherlands', 'holland'] },
  { label: 'Rough Sex',    slug: 'rough-sex',    terms: ['rough sex', 'rough', 'hardcore'] },
  { label: 'Solo Male',    slug: 'solo-male',    terms: ['solo male', 'male', 'guy', 'man'] },
  { label: 'Pussy Licking', slug: 'pussy-licking', terms: ['pussy licking', 'cunnilingus', 'eating out'] },
  // Add more as needed — never create a new .astro file per category
];

export function slugToCategory(slug: string): Category | undefined {
  return categories.find(c => c.slug === slug);
}
