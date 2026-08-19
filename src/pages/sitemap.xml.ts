import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { categories } from '../config/categories';
import { staticRoutes } from '../i18n/routes';
import { SITE } from '../lib/site';

// Single generated XML sitemap — replaces a hand-maintained public/sitemap.xml
// that had to be kept in sync with src/config/categories.ts by hand. Category
// and blog-post URLs are now derived from their actual source of truth, so a
// new category or post can never silently go missing from here again.
// Every EN/ES pair emits two <url> entries, each carrying the same
// xhtml:link hreflang cluster (en + es + x-default → English).
export const prerender = true;

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  alternates?: { en: string; es: string };
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
    const alternates = es ? { en: `${SITE}${en}`, es: `${SITE}${es}` } : undefined;
    const entries: UrlEntry[] = [{ loc: `${SITE}${en}`, changefreq, priority, alternates }];
    if (es) entries.push({ loc: `${SITE}${es}`, changefreq, priority, alternates });
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
    const alternates = esSlug
      ? { en: `${SITE}/blog/${slug}/`, es: `${SITE}/es/blog/${esSlug}/` }
      : undefined;
    const entries: UrlEntry[] = [{
      loc: `${SITE}/blog/${slug}/`,
      lastmod: post.data.date,
      changefreq: 'monthly',
      priority: '0.6',
      alternates,
    }];
    if (esSlug) {
      entries.push({
        loc: `${SITE}/es/blog/${esSlug}/`,
        lastmod: post.data.date,
        changefreq: 'monthly',
        priority: '0.6',
        alternates,
      });
    }
    return entries;
  });

  const categoryPages: UrlEntry[] = categories.flatMap((c) => {
    const alternates = {
      en: `${SITE}/categories/${c.slug}/`,
      es: `${SITE}/es/categorias/${c.slugEs ?? c.slug}/`,
    };
    return [
      { loc: alternates.en, changefreq: 'daily', priority: '0.8', alternates },
      { loc: alternates.es, changefreq: 'daily', priority: '0.8', alternates },
    ];
  });

  const urls = [...corePages, ...postPages, ...categoryPages];

  const altXml = (a?: { en: string; es: string }) => a ? `
    <xhtml:link rel="alternate" hreflang="en" href="${a.en}"/>
    <xhtml:link rel="alternate" hreflang="es" href="${a.es}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${a.en}"/>` : '';

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map((u) => {
    const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
    const changefreq = u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : '';
    const priority = u.priority ? `\n    <priority>${u.priority}</priority>` : '';
    return `  <url>\n    <loc>${u.loc}</loc>${altXml(u.alternates)}${lastmod}${changefreq}${priority}\n  </url>`;
  })
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
