// XML sitemaps, split by template the way onlyaussiefans does it:
//
//   /sitemap/0  core pages        (src/i18n/routes.ts pairs)
//   /sitemap/1  categories        (page 1 of every category, both locales)
//   /sitemap/2  blog posts        (EN + their ES translations)
//   /sitemap.xml                  sitemap index pointing at the three above
//
// Why split: GSC's Page Indexing report can be filtered per *submitted* sitemap. With one
// combined file every indexing problem lands in a single bucket; with one child per
// template you can see at a glance whether it's categories or posts that aren't getting
// indexed. Submit the index AND each child individually in GSC — children that are only
// discovered through the index don't get their own filter.
//
// Paginated category pages (/categories/<slug>/<n>/) are deliberately NOT listed. They stay
// self-canonical and crawlable through CategoryPagination's real <a> links, but they carry
// no unique content (intro/FAQ/body are page-1 only) and have never earned an impression.
// Listing all ~3,500 of them buried the ~110 URLs that matter and flooded GSC with
// "Discovered - currently not indexed". Page 1 always exists — categoryStatic.ts pushes an
// empty page when a category comes back with nothing — so the category list comes straight
// from config with no database fetch.
//
// Deliberately NO xhtml:link hreflang cluster: Base.astro already emits
// <link rel="alternate" hreflang> on every page, derived from src/i18n/routes.ts so new
// pages get it automatically, and Google wants hreflang declared via ONE of HTML tags /
// HTTP headers / sitemap, not all three. Duplicating it here bought no extra signal,
// quadrupled the file, and put XHTML-namespace elements in the document — which makes
// Chrome suppress its XML tree viewer and render the sitemap as unreadable running text.
// Verified 2026-09-06: all sitemap URLs carry 3 on-page hreflang tags. Don't re-add.
import { getCollection } from 'astro:content';
import { categories } from '../config/categories';
import { staticRoutes } from '../i18n/routes';
import { SITE } from './site';

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

// Indexable EN/ES page pairs with their sitemap metadata. Paths must exist in
// src/i18n/routes.ts staticRoutes (checked by scripts/check-i18n-routes.mjs).
const CORE_PAIRS: Array<{ en: string; changefreq: string; priority: string }> = [
  { en: '/',                        changefreq: 'daily',   priority: '1.0' },
  { en: '/onlyfans-search/',        changefreq: 'daily',   priority: '0.9' },
  { en: '/battle/',                 changefreq: 'daily',   priority: '0.9' },
  { en: '/onlyfans-finder-by-face/', changefreq: 'daily',  priority: '0.9' },
  { en: '/pornstar-finder-by-face/', changefreq: 'daily',  priority: '0.9' },
  { en: '/blog/',                   changefreq: 'weekly',  priority: '0.7' },
  { en: '/how-our-search-engine-works/', changefreq: 'monthly', priority: '0.6' },
  { en: '/blog/author/nick/',       changefreq: 'monthly', priority: '0.5' },
  { en: '/sitemap/',                changefreq: 'monthly', priority: '0.5' },
  { en: '/about/',                  changefreq: 'monthly', priority: '0.4' },
  { en: '/promote/',                changefreq: 'monthly', priority: '0.4' },
  { en: '/contact/',                changefreq: 'monthly', priority: '0.3' },
  { en: '/privacy-policy/',         changefreq: 'yearly',  priority: '0.2' },
  { en: '/terms-of-use/',           changefreq: 'yearly',  priority: '0.2' },
  { en: '/community-guidelines/',   changefreq: 'yearly',  priority: '0.2' },
  { en: '/dmca/',                   changefreq: 'yearly',  priority: '0.2' },
];

async function corePages(): Promise<UrlEntry[]> {
  return CORE_PAIRS.flatMap(({ en, changefreq, priority }) => {
    const es = staticRoutes[en];
    const entries: UrlEntry[] = [{ loc: `${SITE}${en}`, changefreq, priority }];
    if (es) entries.push({ loc: `${SITE}${es}`, changefreq, priority });
    return entries;
  });
}

async function categoryPages(): Promise<UrlEntry[]> {
  return categories.flatMap((c) => [
    { loc: `${SITE}/categories/${c.slug}/`, changefreq: 'daily', priority: '0.8' },
    { loc: `${SITE}/es/categorias/${c.slugEs ?? c.slug}/`, changefreq: 'daily', priority: '0.8' },
  ]);
}

async function postPages(): Promise<UrlEntry[]> {
  const posts = await getCollection('blog');
  const esPosts = await getCollection('blogEs');
  const esByTranslationOf = new Map(
    esPosts.map((post) => [post.data.translationOf, post]),
  );

  return posts.flatMap((post) => {
    const slug = post.id.replace(/\.md$/, '');
    const es = esByTranslationOf.get(slug);
    const entries: UrlEntry[] = [{
      loc: `${SITE}/blog/${slug}/`,
      lastmod: post.data.updated ?? post.data.date,
      changefreq: 'monthly',
      priority: '0.6',
    }];
    if (es) {
      entries.push({
        loc: `${SITE}/es/blog/${es.id.replace(/\.md$/, '')}/`,
        lastmod: es.data.updated ?? es.data.date,
        changefreq: 'monthly',
        priority: '0.6',
      });
    }
    return entries;
  });
}

/** Child sitemaps, served at /sitemap/<index>. Order is the public URL — append, never reorder. */
const CHILDREN: Array<() => Promise<UrlEntry[]>> = [corePages, categoryPages, postPages];

export const sitemapUrls = (): string[] => CHILDREN.map((_, i) => `${SITE}/sitemap/${i}`);

/** The urlset for /sitemap/<id>, or null when no such child exists. */
export async function renderChildSitemap(id: string): Promise<string | null> {
  const build = /^\d+$/.test(id) ? CHILDREN[Number(id)] : undefined;
  if (!build) return null;
  const urls = await build();
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
    const changefreq = u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : '';
    const priority = u.priority ? `\n    <priority>${u.priority}</priority>` : '';
    return `  <url>\n    <loc>${u.loc}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
  })
  .join('\n')}
</urlset>
`;
}

export function renderSitemapIndex(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls().map((loc) => `  <sitemap>\n    <loc>${loc}</loc>\n  </sitemap>`).join('\n')}
</sitemapindex>
`;
}
