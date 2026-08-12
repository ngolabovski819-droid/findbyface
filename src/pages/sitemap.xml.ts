import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { categories } from '../config/categories';

// Single generated XML sitemap — replaces a hand-maintained public/sitemap.xml
// that had to be kept in sync with src/config/categories.ts by hand. Category
// and blog-post URLs are now derived from their actual source of truth, so a
// new category or post can never silently go missing from here again.
export const prerender = true;

const SITE = 'https://findbyface.org';

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export const GET: APIRoute = async () => {
  const corePages: UrlEntry[] = [
    { loc: `${SITE}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE}/onlyfans-search/`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE}/battle/`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE}/onlyfans-finder-by-face/`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE}/pornstar-finder-by-face/`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE}/blog/`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${SITE}/sitemap/`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE}/about/`, changefreq: 'monthly', priority: '0.4' },
    { loc: `${SITE}/promote/`, changefreq: 'monthly', priority: '0.4' },
    { loc: `${SITE}/contact/`, changefreq: 'monthly', priority: '0.3' },
    { loc: `${SITE}/privacy-policy/`, changefreq: 'yearly', priority: '0.2' },
    { loc: `${SITE}/terms-of-use/`, changefreq: 'yearly', priority: '0.2' },
    { loc: `${SITE}/dmca/`, changefreq: 'yearly', priority: '0.2' },
  ];

  const posts = await getCollection('blog');
  const postPages: UrlEntry[] = posts.map((post) => ({
    loc: `${SITE}/blog/${post.id.replace(/\.md$/, '')}/`,
    lastmod: post.data.date,
    changefreq: 'monthly',
    priority: '0.6',
  }));

  const categoryPages: UrlEntry[] = categories.map((c) => ({
    loc: `${SITE}/categories/${c.slug}/`,
    changefreq: 'daily',
    priority: '0.8',
  }));

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
