// Validate generated SEO titles + descriptions for findbyface.
// Runs each category slug through the generator at three count levels
// (37 / 200 / 1500) and checks length + uniqueness across slugs.

import { categories } from '../src/config/categories.ts';
import { categorySeo, HOME_SEO, SEARCH_SEO, BLOG_SEO } from '../src/config/seo-meta.ts';

const COUNTS = [37, 200, 1500];
const T_MIN = 30, T_MAX = 60;
const D_MIN = 120, D_MAX = 165;

let issues = 0;

for (const total of COUNTS) {
  const titles = new Map();
  const descs  = new Map();
  for (const c of categories) {
    const seo = categorySeo(c.slug, c.label, total);
    if (seo.title.length < T_MIN || seo.title.length > T_MAX) {
      console.error(`title len ${seo.title.length} (${c.slug}, n=${total}): ${seo.title}`);
      issues++;
    }
    if (seo.description.length < D_MIN || seo.description.length > D_MAX) {
      console.error(`desc len ${seo.description.length} (${c.slug}, n=${total}): ${seo.description}`);
      issues++;
    }
    if (titles.has(seo.title)) {
      console.error(`dup title @ n=${total}: "${seo.title}" -- ${titles.get(seo.title)} & ${c.slug}`);
      issues++;
    } else titles.set(seo.title, c.slug);
    if (descs.has(seo.description)) {
      console.error(`dup desc @ n=${total}: ${c.slug} & ${descs.get(seo.description)}`);
      issues++;
    } else descs.set(seo.description, c.slug);
  }
}

// Static pages
for (const [k, v] of Object.entries({ HOME: HOME_SEO, SEARCH: SEARCH_SEO, BLOG: BLOG_SEO })) {
  if (v.title.length > T_MAX) { console.error(`${k} title too long ${v.title.length}: ${v.title}`); issues++; }
  if (v.description.length > D_MAX) { console.error(`${k} desc too long ${v.description.length}: ${v.description}`); issues++; }
}

if (issues) {
  console.error(`\n${issues} issue(s) found.`);
  process.exit(1);
}
console.log(`OK — ${categories.length} categories x ${COUNTS.length} counts + 3 static pages, no issues.`);
