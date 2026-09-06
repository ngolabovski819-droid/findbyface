import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { allCategoryStaticPaths } from '../lib/categoryStatic';
import { staticRoutes } from '../i18n/routes';
import { SITE } from '../lib/site';

// Single generated XML sitemap — replaces a hand-maintained public/sitemap.xml
// that had to be kept in sync with src/config/categories.ts by hand. Category
// and blog-post URLs are now derived from their actual source of truth, so a
// new category or post can never silently go missing from here again.
// Every EN/ES pair emits two <url> entries. Deliberately NO xhtml:link hreflang
// cluster here: Base.astro already emits <link rel="alternate" hreflang> on every
// page, derived from src/i18n/routes.ts so new pages get it automatically, and
// Google wants hreflang declared via ONE of HTML tags / HTTP headers / sitemap,
// not all three. Duplicating it here bought no extra signal, quadrupled the file,
// and put XHTML-namespace elements in the document — which makes Chrome suppress
// its XML tree viewer and render the sitemap as unreadable running text.
// Verified 2026-09-06: all sitemap URLs carry 3 on-page hreflang tags. Don't re-add.
export const prerender = true;

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

export const GET: APIRoute = async () => {
  const corePages: UrlEntry[] = CORE_PAIRS.flatMap(({ en, changefreq, priority }) => {
    const es = staticRoutes[en];
    const entries: UrlEntry[] = [{ loc: `${SITE}${en}`, changefreq, priority }];
    if (es) entries.push({ loc: `${SITE}${es}`, changefreq, priority });
    return entries;
  });

  const posts = await getCollection('blog');
  const esPosts = await getCollection('blogEs');
  const esByTranslationOf = new Map(
    esPosts.map((post) => [post.data.translationOf, post.id.replace(/\.md$/, '')]),
  );

  const postPages: UrlEntry[] = posts.flatMap((post) => {
    const slug = post.id.replace(/\.md$/, '');
    const esSlug = esByTranslationOf.get(slug);
    const entries: UrlEntry[] = [{
      loc: `${SITE}/blog/${slug}/`,
      lastmod: post.data.date,
      changefreq: 'monthly',
      priority: '0.6',
    }];
    if (esSlug) {
      entries.push({
        loc: `${SITE}/es/blog/${esSlug}/`,
        lastmod: post.data.date,
        changefreq: 'monthly',
        priority: '0.6',
      });
    }
    return entries;
  });

  // Every prerendered (category, page) pair, not just page 1. The paginated pages at
  // /categories/<slug>/<n>/ are self-canonical and carry no noindex, so they are a real
  // indexable surface (~1,745 per locale) — listing only page 1 left ~97% of this site's
  // URLs discoverable by crawl alone. allCategoryStaticPaths() is memoized per category
  // inside categoryStatic.ts, so this reuses the fetches the two category routes already
  // made in the same build instead of paying for them a third time.
  const categoryPaths = await allCategoryStaticPaths();
  const categoryPages: UrlEntry[] = categoryPaths.flatMap(({ category: c, page }) => {
    const suffix = page === 1 ? '' : `${page}/`;
    const href = {
      en: `${SITE}/categories/${c.slug}/${suffix}`,
      es: `${SITE}/es/categorias/${c.slugEs ?? c.slug}/${suffix}`,
    };
    // Page 1 is the ranking target; deeper pages exist to be crawled through, not to
    // compete with it — hence the lower priority and slower changefreq.
    const changefreq = page === 1 ? 'daily' : 'weekly';
    const priority = page === 1 ? '0.8' : '0.4';
    return [
      { loc: href.en, changefreq, priority },
      { loc: href.es, changefreq, priority },
    ];
  });

  const urls = [...corePages, ...postPages, ...categoryPages];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
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

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
