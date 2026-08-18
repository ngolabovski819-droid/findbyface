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

// Spanish niche nouns — same slug keys, Spanish flavour phrases.
const NICHE_NOUN_ES: Record<string, string> = {
  feet: 'amantes del fetiche de pies',
  footjob: 'amantes del fetiche de pies',
  bondage: 'amantes del kink',
  'rough-sex': 'amantes del kink',
  anal: 'amantes del kink',
  bukkake: 'amantes del kink',
  bbc: 'amantes del kink',
  'strap-on': 'amantes del kink',
  bbw: 'amantes de las curvas',
  mature: 'fans de las maduras',
  milf: 'fans de las maduras',
  'old-young': 'fans de la diferencia de edad',
  latina: 'amantes de las latinas',
  asian: 'fans de las asiáticas',
  ebony: 'fans de las chicas negras',
  indian: 'fans de las indias',
  korean: 'fans de las coreanas',
  japanese: 'fans de las japonesas',
  italian: 'fans de las italianas',
  dutch: 'fans de las holandesas',
  greek: 'fans de las griegas',
  serbian: 'fans de las serbias',
  petite: 'fans de las petite',
  'small-tits': 'fans de las petite',
  'big-tits': 'fans de las tetonas',
  redhead: 'fans de las pelirrojas',
  blonde: 'amantes de las rubias',
  'white-girls': 'fans',
  free: 'cazadores de ofertas',
  top: 'fans del mainstream',
  models: 'fans del mainstream',
  celebrity: 'fans del mainstream',
  trans: 'la comunidad trans',
  hentai: 'fans del anime',
  blowjob: 'fans del sexo oral',
  'pussy-licking': 'fans del sexo oral',
  'solo-male': 'fans del contenido solo',
  threesome: 'fans del contenido en grupo',
};

function nicheFor(slug: string, locale: 'en' | 'es' = 'en'): string {
  if (locale === 'es') return NICHE_NOUN_ES[slug] || 'fans de OnlyFans';
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

// ---------- CATEGORY TITLES (Spanish) ----------
// Same rotation mechanics, hashed on the ENGLISH slug (stable pairing with the
// EN page). Spanish runs ~20% longer than English, so these are written terse;
// several must fit even the longest labelEs ('Viejos y Jóvenes').

const CAT_TITLES_ES: ((label: string, n: string, plus: boolean) => string)[] = [
  (l, n, p) => `Top ${n}${p ? '+' : ''} OnlyFans ${l} · Ranking ${Y}`,
  (l, n, p) => `Las ${n}${p ? '+' : ''} Mejores ${l} de OnlyFans (${Y})`,
  (l, n, p) => `${n}${p ? '+' : ''} Creadoras ${l} en OnlyFans · Lista ${Y}`,
  (l, n, p) => `Mejores Cuentas OnlyFans ${l} — ${n}${p ? '+' : ''} Perfiles ${Y}`,
  (l, n, p) => `OnlyFans ${l}: ${n}${p ? '+' : ''} Mejores Creadoras (${Y})`,
  (l, n, p) => `${n}${p ? '+' : ''} OnlyFans ${l} · Verificadas y Gratis ${Y}`,
  (l, n, p) => `Ranking ${Y}: ${n}${p ? '+' : ''} Creadoras ${l} de OnlyFans`,
  (l, n, p) => `Las Mejores ${l} de OnlyFans · ${n}${p ? '+' : ''} Perfiles ${Y}`,
  (l, n, p) => `Top OnlyFans ${l} — ${n}${p ? '+' : ''} Cuentas Destacadas ${Y}`,
  (l, n, p) => `${n}${p ? '+' : ''} Mejores ${l} en OnlyFans, Según los Fans ${Y}`,
];

// ---------- CATEGORY DESCRIPTIONS (Spanish) ----------

const CAT_DESCS_ES: ((label: string, n: string, plus: boolean, niche: string) => string)[] = [
  (l, n, p) => `Descubre las ${n}${p ? '+' : ''} mejores creadoras ${l} de OnlyFans en ${Y}, ordenadas por popularidad real. Cuentas gratis, verificadas y búsqueda facial con IA.`,
  (l, n, p, ni) => `Explora ${n}${p ? '+' : ''} cuentas OnlyFans ${l} seleccionadas para ${ni}. Precios, verificación y ofertas de packs — sin registro, actualizado a diario.`,
  (l, n, p) => `La lista definitiva ${Y} con ${n}${p ? '+' : ''} creadoras ${l} de OnlyFans que valen tu suscripción. Filtra gratis, verificadas y packs con descuento en un clic.`,
  (l, n, p) => `¿Buscas las mejores ${l} de OnlyFans? Nuestro directorio de ${n}${p ? '+' : ''} creadoras ordena cada perfil por popularidad, con filtros de gratis y verificadas.`,
  (l, n, p) => `${n}${p ? '+' : ''} creadoras ${l} de OnlyFans elegidas a mano para ${Y} — ordenadas por interacción de fans, con verificación, packs y búsqueda facial con IA.`,
  (l, n, p) => `Explora ${n}${p ? '+' : ''} cuentas ${l} de OnlyFans clasificadas para ${Y}. Compara precios, popularidad y verificación de un vistazo — búsqueda facial gratis.`,
  (l, n, p) => `De cuentas nuevas a las más top: las ${n}${p ? '+' : ''} mejores creadoras ${l} de OnlyFans de ${Y}, filtrables por precio, gratis y verificación.`,
  (l, n, p) => `${n}${p ? '+' : ''} creadoras ${l} de OnlyFans que seguir en ${Y}. Búsqueda facial con IA, filtros de cuentas gratis, verificación y precios de packs en vivo.`,
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

// `slug` is ALWAYS the English slug (stable hash + niche key across locales);
// pass `labelEs` as `label` when locale is 'es'.
export function categorySeo(slug: string, label: string, total: number, locale: 'en' | 'es' = 'en'): CategorySeo {
  const { display, hasPlus } = bucketCount(total);
  const niche = nicheFor(slug, locale);

  const titles = locale === 'es' ? CAT_TITLES_ES : CAT_TITLES;
  const descs = locale === 'es' ? CAT_DESCS_ES : CAT_DESCS;
  const title = pickByHash(slug, titles, [label, display, hasPlus], 60, 30);
  const description = pickByHash(slug, descs, [label, display, hasPlus, niche], 165, 120);

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

// ---------- static page meta, Spanish (hand-tuned, not translated 1:1) ----------

export const HOME_SEO_ES = {
  title: `Buscador Facial de Contenido Adulto · Busca por Foto`,
  description:
    'Sube una foto para buscar perfiles de creadoras de OnlyFans y apariciones en videos para adultos con reconocimiento facial IA. Gratis para empezar, sin registro.',
};

export const SEARCH_SEO_ES = {
  title: `Buscador de OnlyFans · Filtra 2.4M+ Perfiles (${Y})`,
  description: `Busca entre 2.4M+ creadoras de OnlyFans con filtros de verificadas, gratis y packs. Tu próxima suscripción en segundos — sin registro, actualizado a diario.`,
};

export const AI_DISCOVER_SEO_ES = {
  title: `Crea Tu Tipo Ideal · Descubrimiento Visual con IA (${Y})`,
  description:
    'Ajusta el rostro ideal — color de ojos, mandíbula, labios y más — y ve al instante las creadoras de OnlyFans que coinciden. Sin subir ninguna foto.',
};

export const BLOG_SEO_ES = {
  title: `Guías y Rankings de OnlyFans en Español | findbyface`,
  description:
    'Guías honestas de OnlyFans, listas clasificadas y reseñas de creadoras. Consejos sobre cuentas gratis, packs, verificación y búsqueda facial con IA — en español.',
};
