// SINGLE SOURCE OF TRUTH — never hardcode categories in pages

export interface Category {
  label: string;      // English display label
  labelEs: string;    // Spanish display label
  slug: string;       // English URL slug — also the stable key for search scope + SEO hash
  slugEs?: string;    // Spanish URL slug; omitted = reuse the English slug
  terms: string[];    // ENGLISH ALWAYS — matched against creator-profile text, do not translate
  emoji?: string;
}

export const categories: Category[] = [
  { label: 'Top',          labelEs: 'Top',            slug: 'top',                                        terms: ['top', 'best', 'popular'],                emoji: '🔥' },
  { label: 'Blonde',       labelEs: 'Rubias',         slug: 'blonde',       slugEs: 'rubias',             terms: ['blonde', 'blond'],                       emoji: '👱' },
  { label: 'MILF',         labelEs: 'MILF',           slug: 'milf',                                       terms: ['milf', 'mom', 'cougar'] },
  { label: 'Trans',        labelEs: 'Trans',          slug: 'trans',                                      terms: ['trans', 'transgender'] },
  { label: 'Feet',         labelEs: 'Pies',           slug: 'feet',         slugEs: 'pies',               terms: ['feet', 'foot', 'toes'] },
  { label: 'BBW',          labelEs: 'BBW',            slug: 'bbw',                                        terms: ['bbw', 'plus size', 'curvy'] },
  { label: 'Latina',       labelEs: 'Latinas',        slug: 'latina',       slugEs: 'latinas',            terms: ['latina', 'latinas', 'hispanic'] },
  { label: 'Asian',        labelEs: 'Asiáticas',      slug: 'asian',        slugEs: 'asiaticas',          terms: ['asian', 'japanese', 'korean', 'chinese'] },
  { label: 'Ebony',        labelEs: 'Negras',         slug: 'ebony',        slugEs: 'negras',             terms: ['ebony', 'black'] },
  { label: 'Redhead',      labelEs: 'Pelirrojas',     slug: 'redhead',      slugEs: 'pelirrojas',         terms: ['redhead', 'ginger', 'red hair'] },
  { label: 'Petite',       labelEs: 'Petite',         slug: 'petite',                                     terms: ['petite', 'small', 'tiny'] },
  { label: 'Free',         labelEs: 'Gratis',         slug: 'free',         slugEs: 'gratis',             terms: ['free'],                                  emoji: '🆓' },
  { label: 'Models',       labelEs: 'Modelos',        slug: 'models',       slugEs: 'modelos',            terms: ['model', 'models', 'modeling'] },
  { label: 'White Girls',  labelEs: 'Chicas Blancas', slug: 'white-girls',  slugEs: 'chicas-blancas',     terms: ['white', 'white girl', 'caucasian'] },
  { label: 'Blowjob',      labelEs: 'Mamadas',        slug: 'blowjob',      slugEs: 'mamadas',            terms: ['blowjob', 'bj', 'oral'] },
  { label: 'Footjob',      labelEs: 'Footjob',        slug: 'footjob',                                    terms: ['footjob', 'foot job', 'feet'] },
  { label: 'Indian',       labelEs: 'Indias',         slug: 'indian',       slugEs: 'indias',             terms: ['indian', 'india', 'desi'] },
  { label: 'Korean',       labelEs: 'Coreanas',       slug: 'korean',       slugEs: 'coreanas',           terms: ['korean', 'korea', 'kpop'] },
  { label: 'Japanese',     labelEs: 'Japonesas',      slug: 'japanese',     slugEs: 'japonesas',          terms: ['japanese', 'japan', 'asian japanese'] },
  { label: 'Greek',        labelEs: 'Griegas',        slug: 'greek',        slugEs: 'griegas',            terms: ['greek', 'greece', 'hellenic'] },
  { label: 'Serbian',      labelEs: 'Serbias',        slug: 'serbian',      slugEs: 'serbias',            terms: ['serbian', 'serbia', 'balkan'] },
  { label: 'Bondage',      labelEs: 'Bondage',        slug: 'bondage',                                    terms: ['bondage', 'bdsm', 'tied'] },
  { label: 'BBC',          labelEs: 'BBC',            slug: 'bbc',                                        terms: ['bbc', 'big black cock', 'interracial'] },
  { label: 'Anal',         labelEs: 'Anal',           slug: 'anal',                                       terms: ['anal', 'booty', 'anal sex'] },
  { label: 'Small Tits',   labelEs: 'Tetas Pequeñas', slug: 'small-tits',   slugEs: 'tetas-pequenas',     terms: ['small tits', 'small boobs', 'flat chest'] },
  { label: 'Big Tits',     labelEs: 'Tetas Grandes',  slug: 'big-tits',     slugEs: 'tetas-grandes',      terms: ['big tits', 'big boobs', 'busty', 'large breasts'] },
  { label: 'Mature',       labelEs: 'Maduras',        slug: 'mature',       slugEs: 'maduras',            terms: ['mature', 'older woman', 'cougar'] },
  { label: 'Hentai',       labelEs: 'Hentai',         slug: 'hentai',                                     terms: ['hentai', 'anime', 'cosplay anime'] },
  { label: 'Old Young',    labelEs: 'Viejos y Jóvenes', slug: 'old-young',  slugEs: 'viejos-y-jovenes',   terms: ['old young', 'age gap', 'older'] },
  { label: 'Threesome',    labelEs: 'Tríos',          slug: 'threesome',    slugEs: 'trios',              terms: ['threesome', 'ffm', 'mmf', 'group'] },
  { label: 'Bukkake',      labelEs: 'Bukkake',        slug: 'bukkake',                                    terms: ['bukkake', 'facial', 'cumshot'] },
  { label: 'Celebrity',    labelEs: 'Famosas',        slug: 'celebrity',    slugEs: 'famosas',            terms: ['celebrity', 'famous', 'star'] },
  { label: 'Strap On',     labelEs: 'Strap-On',       slug: 'strap-on',                                   terms: ['strap on', 'strapon', 'pegging'] },
  { label: 'Italian',      labelEs: 'Italianas',      slug: 'italian',      slugEs: 'italianas',          terms: ['italian', 'italy', 'italiana'] },
  { label: 'Dutch',        labelEs: 'Holandesas',     slug: 'dutch',        slugEs: 'holandesas',         terms: ['dutch', 'netherlands', 'holland'] },
  { label: 'Rough Sex',    labelEs: 'Sexo Duro',      slug: 'rough-sex',    slugEs: 'sexo-duro',          terms: ['rough sex', 'rough', 'hardcore'] },
  { label: 'Solo Male',    labelEs: 'Solo Hombres',   slug: 'solo-male',    slugEs: 'solo-hombres',       terms: ['solo male', 'male', 'guy', 'man'] },
  { label: 'Pussy Licking', labelEs: 'Cunnilingus',   slug: 'pussy-licking', slugEs: 'cunnilingus',       terms: ['pussy licking', 'cunnilingus', 'eating out'] },
  // Add more as needed — never create a new .astro file per category
];

export function slugToCategory(slug: string): Category | undefined {
  return categories.find(c => c.slug === slug);
}

export function esSlugToCategory(slug: string): Category | undefined {
  return categories.find(c => (c.slugEs ?? c.slug) === slug);
}
