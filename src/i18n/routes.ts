// Extension included so Node's type-stripping can load this module directly
// (scripts/check-i18n-routes.mjs imports it); Vite resolves it the same way.
import { categories } from '../config/categories.ts';

export type Locale = 'en' | 'es';
export const defaultLocale: Locale = 'en';

// EN path -> ES path, both with trailing slash. SINGLE SOURCE OF TRUTH for
// every static route pair. Consumed by: Base.astro (hreflang cluster),
// Nav.astro (links, active-state, language switcher), the footer,
// sitemap.xml.ts, and scripts/check-i18n-routes.mjs.
// To keep an English slug for a page, set the value to `/es${enPath}`.
export const staticRoutes: Record<string, string> = {
  '/':                             '/es/',
  '/onlyfans-search/':             '/es/buscador-de-onlyfans/',
  '/onlyfans-finder-by-face/':     '/es/buscador-de-onlyfans-por-cara/',
  '/pornstar-finder-by-face/':     '/es/buscador-de-actrices-porno-por-cara/',
  '/battle/':                      '/es/batalla/',
  '/about/':                       '/es/sobre-nosotros/',
  '/how-our-search-engine-works/': '/es/como-funciona-nuestro-buscador/',
  '/promote/':                     '/es/promociona-tu-onlyfans/',
  '/contact/':                     '/es/contacto/',
  '/privacy-policy/':              '/es/politica-de-privacidad/',
  '/terms-of-use/':                '/es/terminos-de-uso/',
  '/community-guidelines/':        '/es/normas-de-la-comunidad/',
  '/dmca/':                        '/es/dmca/',
  '/sitemap/':                     '/es/mapa-del-sitio/',
  '/blog/':                        '/es/blog/',
  '/blog/author/nick/':            '/es/blog/autor/nick/',
  // noindex utility pages keep English slugs (zero SEO value; keeps ?next= flows simple)
  '/login/':     '/es/login/',
  '/signup/':    '/es/signup/',
  '/dashboard/': '/es/dashboard/',
  '/settings/':  '/es/settings/',
  '/wishlist/':  '/es/wishlist/',
};

const esToEn: Record<string, string> = Object.fromEntries(
  Object.entries(staticRoutes).map(([en, es]) => [es, en]),
);

const norm = (p: string) => (p.endsWith('/') ? p : `${p}/`);

/**
 * Counterpart path in the other locale, or undefined when no translation
 * exists. Handles static routes and category pages; blog posts pass their
 * pairing explicitly (frontmatter-driven) via Base's `alternate` prop.
 */
export function alternatePath(pathname: string): string | undefined {
  const p = norm(pathname);
  if (staticRoutes[p]) return staticRoutes[p];
  if (esToEn[p]) return esToEn[p];
  // Category pages carry an optional page number: /categories/blonde/ and
  // /categories/blonde/3/ both pair with the same-numbered page in the other locale.
  const en = p.match(/^\/categories\/([^/]+)\/(?:(\d+)\/)?$/);
  if (en) {
    const c = categories.find(c => c.slug === en[1]);
    return c && `/es/categorias/${c.slugEs ?? c.slug}/${en[2] ? `${en[2]}/` : ''}`;
  }
  const es = p.match(/^\/es\/categorias\/([^/]+)\/(?:(\d+)\/)?$/);
  if (es) {
    const c = categories.find(c => (c.slugEs ?? c.slug) === es[1]);
    return c && `/categories/${c.slug}/${es[2] ? `${es[2]}/` : ''}`;
  }
  return undefined;
}

/** English route key for nav active-state: '/es/batalla/' -> '/battle/'. */
export function routeKey(pathname: string): string {
  const p = norm(pathname);
  return p.startsWith('/es/') ? (alternatePath(p) ?? p) : p;
}

export const localeOf = (pathname: string): Locale =>
  norm(pathname).startsWith('/es/') ? 'es' : 'en';

/** Localized href for a static English path: localizePath('/battle/', 'es') -> '/es/batalla/'. */
export function localizePath(enPath: string, lang: Locale): string {
  if (lang === 'en') return enPath;
  return staticRoutes[norm(enPath)] ?? enPath;
}
