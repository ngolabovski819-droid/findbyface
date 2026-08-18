// Validate the EN↔ES route map, twin files, and Spanish slugs.
// - every staticRoutes pair must have a page file on both sides
// - copy-heavy twins must carry the "i18n-twin:" mirror comment on both sides
//   (thin wrappers around a shared page component are exempt by size)
// - Spanish category slugs must be unique and ASCII-safe
// - every content/blog-es post must name a real English post in translationOf

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { staticRoutes } from '../src/i18n/routes.ts';
import { categories } from '../src/config/categories.ts';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PAGES = join(ROOT, 'src', 'pages');

let issues = 0;
const fail = (msg) => { console.error('✗ ' + msg); issues++; };

// route path -> page file (dir-style routes map to <path>.astro or <path>/index.astro)
function routeFile(route) {
  const trimmed = route.replace(/^\/+|\/+$/g, '');
  if (trimmed === '') return join(PAGES, 'index.astro');
  const direct = join(PAGES, ...trimmed.split('/')) + '.astro';
  if (existsSync(direct)) return direct;
  const index = join(PAGES, ...trimmed.split('/'), 'index.astro');
  return index;
}

const WRAPPER_MAX_BYTES = 400; // thin wrappers around shared page components

const seenEs = new Set();
for (const [en, es] of Object.entries(staticRoutes)) {
  if (seenEs.has(es)) fail(`duplicate ES path in staticRoutes: ${es}`);
  seenEs.add(es);
  if (!/^\/es\//.test(es)) fail(`ES path does not start with /es/: ${es}`);
  if (!/^[\x00-\x7F]*$/.test(es)) fail(`ES path is not ASCII: ${es}`);

  const enFile = routeFile(en);
  const esFile = routeFile(es);
  if (!existsSync(enFile)) { fail(`missing EN page for ${en} (expected ${enFile})`); continue; }
  if (!existsSync(esFile)) { fail(`missing ES page for ${es} (expected ${esFile})`); continue; }

  const enSrc = readFileSync(enFile, 'utf8');
  const esSrc = readFileSync(esFile, 'utf8');
  const enIsWrapper = enSrc.length <= WRAPPER_MAX_BYTES;
  const esIsWrapper = esSrc.length <= WRAPPER_MAX_BYTES;
  if (!enIsWrapper && !enSrc.includes('i18n-twin:')) fail(`EN page ${en} is missing its "i18n-twin:" mirror comment`);
  if (!esIsWrapper && !esSrc.includes('i18n-twin:')) fail(`ES page ${es} is missing its "i18n-twin:" mirror comment`);
}

// Spanish category slugs
const seenSlugEs = new Set();
for (const c of categories) {
  const slugEs = c.slugEs ?? c.slug;
  if (!/^[a-z0-9-]+$/.test(slugEs)) fail(`category slugEs is not ascii-kebab: ${slugEs} (${c.slug})`);
  if (seenSlugEs.has(slugEs)) fail(`duplicate category slugEs: ${slugEs}`);
  seenSlugEs.add(slugEs);
  if (!c.labelEs) fail(`category ${c.slug} has no labelEs`);
}

// Spanish blog posts must translate a real English post
const enPostIds = new Set(
  readdirSync(join(ROOT, 'content', 'blog')).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')),
);
for (const file of readdirSync(join(ROOT, 'content', 'blog-es')).filter(f => f.endsWith('.md'))) {
  const src = readFileSync(join(ROOT, 'content', 'blog-es', file), 'utf8');
  const m = src.match(/^translationOf:\s*["']?([\w-]+)["']?\s*$/m);
  if (!m) { fail(`${file} is missing translationOf frontmatter`); continue; }
  if (!enPostIds.has(m[1])) fail(`${file} translationOf "${m[1]}" does not match any English post`);
  if (!/^[\x00-\x7F]+$/.test(file)) fail(`Spanish post filename is not ASCII: ${file}`);
}

if (issues) {
  console.error(`\n${issues} issue(s) found.`);
  process.exit(1);
}
console.log(`OK — ${Object.keys(staticRoutes).length} route pairs, ${categories.length} category slugs, blog-es pairing all valid.`);
