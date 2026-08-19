// Minimal, safe inline-link syntax for the "About [Category] OnlyFans" copy in
// categoryContent.ts, so writers can interlink to other categories without
// authoring raw HTML or needing set:html. Syntax: [[Visible Label|slug]] where
// slug is an ENGLISH category slug. Unknown slugs degrade to plain text rather
// than a broken link — content stays safe to write even before every
// sub-niche mentioned in the copy has its own category page.

export type InlineLinkToken = { label: string; slug: string };
export type InlineLinkPart = string | InlineLinkToken;

const TOKEN_RE = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;

export function parseInlineCategoryLinks(text: string): InlineLinkPart[] {
  const parts: InlineLinkPart[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));
    parts.push({ label: match[1], slug: match[2] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
