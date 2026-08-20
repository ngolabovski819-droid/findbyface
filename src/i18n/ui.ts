import type { Locale } from './routes';

// Shared UI strings for chrome + components that render in both locales.
// Copy-heavy marketing pages do NOT use this — their Spanish twins under
// src/pages/es/ carry fully rewritten copy inline. This dictionary is only
// for strings that live inside shared components/layouts.
//
// Placeholders use {name} syntax and are filled by t()/fmt().

const en = {
  // --- Nav ---
  'nav.home': 'Home',
  'nav.discover': 'Discover',
  'nav.onlyfansFinder': 'OnlyFans Finder',
  'nav.pornstarFinder': 'Pornstar Finder',
  'nav.search': 'OnlyFans Search',
  'nav.categories': 'OnlyFans Categories',
  'nav.new': 'New',
  'nav.login': 'Log in',
  'nav.signup': 'Sign up',
  'nav.signupFree': 'Sign up free',
  'nav.wishlist': 'Wishlist',
  'nav.openMenu': 'Open menu',
  'nav.freePlan': 'Free Plan',
  'nav.dashboard': 'Dashboard',
  'nav.settings': 'Settings',
  'nav.logout': 'Logout',

  // --- Footer (Base.astro) ---
  'footer.about': 'About',
  'footer.how': 'How Our Search Engine Works',
  'footer.blog': 'Blog',
  'footer.search': 'Search',
  'footer.onlyfansFinder': 'OnlyFans Finder',
  'footer.pornstarFinder': 'Pornstar Finder',
  'footer.battle': 'Creator Battle',
  'footer.categories': 'Categories',
  'footer.catPopular': 'Popular',
  'footer.catAppearance': 'Appearance',
  'footer.catBackground': 'Background',
  'footer.catContentType': 'Content Type',
  'footer.promote': 'Promote Your OnlyFans',
  'footer.contact': 'Contact',
  'footer.privacy': 'Privacy',
  'footer.terms': 'Terms',
  'footer.guidelines': 'Community Guidelines',
  'footer.dmca': 'DMCA',
  'footer.sitemap': 'Sitemap',
  'footer.legal1': '© {year} findbyface.org — For entertainment purposes only. Results are based on visual similarity and are not an indication of identity.',
  'footer.legal2': 'All rights reserved. findbyface.org is neither owned nor affiliated with onlyfans.com, which is a registered trademark of Fenix International Limited.',

  // --- Common / cards ---
  'common.loading': 'Loading...',
  'common.loadMore': 'Load More',
  'common.viewProfile': 'View Profile',
  'common.free': 'FREE',
  'common.backHome': '← Back to home',
  'common.creatorsFound': '{n} creators found',
  'common.noCreators': 'No creators found for this category yet.',
  'common.browseTop': 'Browse top creators',

  // --- Blog chrome ---
  'blog.readMore': 'Read more →',
  'blog.backToBlog': '← Back to Blog',
  'blog.minRead': 'min read',
  'blog.published': 'Published',
  'blog.updated': 'Updated',
  'blog.noPosts': 'No posts yet — check back soon.',
  'blog.summary': 'Summary',
  'blog.toc': 'Table of contents',
  'blog.writtenBy': 'Written by',
  'blog.authorBioDefault': "Writes about online safety, visual search, and how to use face search responsibly. Been building findbyface's search tools since day one.",
  'blog.aboutAuthor': 'About the author',
  'blog.share': 'Share',
  'blog.linkCopied': 'Link copied!',
  'blog.references': 'References',
  'blog.disclaimer': 'Disclaimer',
  'blog.refsAria': 'References and disclaimer',
  'blog.disclaimerDefault': 'This article is for general information and safety awareness only. It is not legal, investigative, or law-enforcement advice. Similarity results from any face-search tool are a ranking signal, not proof of identity — always verify independently before acting on them.',
  'blog.tryIt': 'Try it yourself',
  'blog.toolsAria': 'Try our search tools',
  'blog.toolOF': 'OnlyFans Finder',
  'blog.toolOFsub': 'Search creator profiles by face',
  'blog.toolPS': 'Pornstar Finder',
  'blog.toolPSsub': 'Search & find pornstars by face',
  'blog.toolsNote': 'Free to start. No account required for your first search.',

  // --- Ranking attribution bar ---
  'attribution.createdBy': 'Created by',
  'attribution.rankedBy': 'Ranked by',
  'attribution.noHumanReview': 'no human review',
  'attribution.updated': 'Updated {date}',

  // --- Stats bar ---
  'stats.creators': 'CREATORS INDEXED',
  'stats.accuracy': 'MATCH ACCURACY',
  'stats.searchTime': 'SEARCH TIME',
  'stats.free': 'free',
  'stats.toStart': 'TO START',

  // --- Search bar ---
  'search.placeholder': 'Search creators...',
  'search.orByName': '— or search by name —',
  'search.button': 'Search',

  // --- Pagination (static category pages) ---
  'pagination.label': 'Pagination',
  'pagination.prev': 'Previous',
  'pagination.next': 'Next',
  'pagination.page': 'Page {page}',
  'pagination.status': 'Page {page} of {total}',
} as const;

export type UIKey = keyof typeof en;
type Dict = Record<UIKey, string>;

const es: Dict = {
  // --- Nav ---
  'nav.home': 'Inicio',
  'nav.discover': 'Descubrir',
  'nav.onlyfansFinder': 'Buscador OnlyFans',
  'nav.pornstarFinder': 'Buscador de Actrices',
  'nav.search': 'Búsqueda OnlyFans',
  'nav.categories': 'Categorías de OnlyFans',
  'nav.new': 'Nuevo',
  'nav.login': 'Iniciar sesión',
  'nav.signup': 'Registrarse',
  'nav.signupFree': 'Regístrate gratis',
  'nav.wishlist': 'Favoritos',
  'nav.openMenu': 'Abrir menú',
  'nav.freePlan': 'Plan Gratis',
  'nav.dashboard': 'Panel',
  'nav.settings': 'Ajustes',
  'nav.logout': 'Cerrar sesión',

  // --- Footer ---
  'footer.about': 'Sobre nosotros',
  'footer.how': 'Cómo funciona nuestro buscador',
  'footer.blog': 'Blog',
  'footer.search': 'Búsqueda',
  'footer.onlyfansFinder': 'Buscador OnlyFans',
  'footer.pornstarFinder': 'Buscador de Actrices',
  'footer.battle': 'Batalla de Creadoras',
  'footer.categories': 'Categorías',
  'footer.catPopular': 'Populares',
  'footer.catAppearance': 'Apariencia',
  'footer.catBackground': 'Origen',
  'footer.catContentType': 'Tipo de Contenido',
  'footer.promote': 'Promociona tu OnlyFans',
  'footer.contact': 'Contacto',
  'footer.privacy': 'Privacidad',
  'footer.terms': 'Términos',
  'footer.guidelines': 'Normas de la comunidad',
  'footer.dmca': 'DMCA',
  'footer.sitemap': 'Mapa del sitio',
  'footer.legal1': '© {year} findbyface.org — Solo con fines de entretenimiento. Los resultados se basan en similitud visual y no son una indicación de identidad.',
  'footer.legal2': 'Todos los derechos reservados. findbyface.org no es propiedad de ni está afiliado a onlyfans.com, marca registrada de Fenix International Limited.',

  // --- Common / cards ---
  'common.loading': 'Cargando...',
  'common.loadMore': 'Cargar más',
  'common.viewProfile': 'Ver perfil',
  'common.free': 'GRATIS',
  'common.backHome': '← Volver al inicio',
  'common.creatorsFound': '{n} creadoras encontradas',
  'common.noCreators': 'Todavía no hay creadoras en esta categoría.',
  'common.browseTop': 'Explorar creadoras top',

  // --- Blog chrome ---
  'blog.readMore': 'Leer más →',
  'blog.backToBlog': '← Volver al blog',
  'blog.minRead': 'min de lectura',
  'blog.published': 'Publicado',
  'blog.updated': 'Actualizado',
  'blog.noPosts': 'Todavía no hay artículos — vuelve pronto.',
  'blog.summary': 'Resumen',
  'blog.toc': 'Índice de contenidos',
  'blog.writtenBy': 'Escrito por',
  'blog.authorBioDefault': 'Escribe sobre seguridad en línea, búsqueda visual y cómo usar la búsqueda facial de forma responsable. Construye las herramientas de findbyface desde el primer día.',
  'blog.aboutAuthor': 'Sobre el autor',
  'blog.share': 'Compartir',
  'blog.linkCopied': '¡Enlace copiado!',
  'blog.references': 'Referencias',
  'blog.disclaimer': 'Aviso',
  'blog.refsAria': 'Referencias y aviso',
  'blog.disclaimerDefault': 'Este artículo es solo para información general y conciencia de seguridad. No es asesoría legal, de investigación ni policial. Los resultados de similitud de cualquier herramienta de búsqueda facial son una señal de clasificación, no prueba de identidad — verifica siempre de forma independiente antes de actuar.',
  'blog.tryIt': 'Pruébalo tú mismo',
  'blog.toolsAria': 'Prueba nuestras herramientas de búsqueda',
  'blog.toolOF': 'Buscador OnlyFans',
  'blog.toolOFsub': 'Busca perfiles de creadoras por cara',
  'blog.toolPS': 'Buscador de Actrices',
  'blog.toolPSsub': 'Busca y encuentra actrices por cara',
  'blog.toolsNote': 'Gratis para empezar. Sin cuenta para tu primera búsqueda.',

  // --- Ranking attribution bar ---
  'attribution.createdBy': 'Creado por',
  'attribution.rankedBy': 'Clasificado por',
  'attribution.noHumanReview': 'sin revisión humana',
  'attribution.updated': 'Actualizado el {date}',

  // --- Stats bar ---
  'stats.creators': 'CREADORAS INDEXADAS',
  'stats.accuracy': 'PRECISIÓN DE MATCH',
  'stats.searchTime': 'TIEMPO DE BÚSQUEDA',
  'stats.free': 'gratis',
  'stats.toStart': 'PARA EMPEZAR',

  // --- Search bar ---
  'search.placeholder': 'Buscar creadoras...',
  'search.orByName': '— o busca por nombre —',
  'search.button': 'Buscar',

  // --- Paginación (páginas de categoría estáticas) ---
  'pagination.label': 'Paginación',
  'pagination.prev': 'Anterior',
  'pagination.next': 'Siguiente',
  'pagination.page': 'Página {page}',
  'pagination.status': 'Página {page} de {total}',
};

export const ui: Record<Locale, Dict> = { en, es };

/** Fill {name} placeholders in a template string. Shared shape with the client-side fmt(). */
export function fmt(s: string, vars: Record<string, string | number> = {}): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export function t(lang: Locale, key: UIKey, vars: Record<string, string | number> = {}): string {
  return fmt(ui[lang][key] ?? ui.en[key], vars);
}

/** Subset of the dictionary for handing to client scripts as an inline JSON block. */
export function pick(lang: Locale, keys: UIKey[]): Record<string, string> {
  return Object.fromEntries(keys.map(k => [k, ui[lang][k]]));
}
