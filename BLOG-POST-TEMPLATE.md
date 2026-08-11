# findbyface blog post template — how to write one

Everything a new post in `content/blog/*.md` gets, and the mix-in HTML blocks
available to use inside the post body. The rendering template lives at
`src/pages/blog/[slug].astro`; the schema lives at `src/content.config.ts`.
This file documents both so writing a new post is copy-paste, not
reverse-engineering the last one.

---

## What you get automatically — no action needed

Just by adding a `.md` file to `content/blog/`, every post automatically gets:

- A **featured header banner** (branded gradient graphic with a search-in-photo
  icon, unless you set `image` — see below) with `Published` / `Updated` dates
  and a **Share** button overlaid on it.
- A **table of contents**, built from your real `##`/`###` headings, collapsed
  by default.
- A **sticky sidebar** promoting the OnlyFans Finder and Pornstar Finder tools.
- **`BlogPosting` + `Person` (author) JSON-LD schema**, wired from your
  frontmatter — nothing to add in the body.
- Styled **tables** — just write a normal Markdown table, no HTML needed.
- A **References / Disclaimer** tab section at the end of the post (always
  renders — falls back to a sensible default disclaimer if you don't set one).
- An **author byline** with an illustrated avatar (not a real photo — see
  `src/components/blog/AuthorAvatar.astro` if you ever want to change the look).

You only need to write frontmatter + body content. Everything above is handled
by the template.

---

## Frontmatter reference

```yaml
---
title: "Your Post Title"                # required
description: "150-165 char meta description, also shown under the H1."  # required
date: "2026-08-11"                       # required, ISO date, this is "Published"
updated: "2026-08-20"                    # optional — shows "Updated" if set; omit if never revised
author: "Nick"                           # optional, defaults to "Nick"
image: "/some-real-photo.jpg"            # optional — real photo for the header. Omit to use the generated graphic banner.
summary: "2-4 sentence TL;DR."           # optional — renders as the Summary box near the top. Skip it and the box just doesn't render.
disclaimer: "Custom disclaimer text."    # optional — omit to use the default safety/accuracy disclaimer.
references:                              # optional — omit and the References tab just won't render (Disclaimer tab still does)
  - title: "Source title"
    description: "One sentence on what this source is / why it's cited."
    url: "https://example.com/the-actual-page"
---
```

**Rule for `references`:** only real, authoritative, checkable sources — the
same standard used in `check-dating-profile-photos.md` (Pew Research, FTC,
FBI/IC3). Don't invent a reference to fill the section; if there's nothing
worth citing, just omit `references` entirely.

---

## Mix-in blocks — paste directly into the post body

These are plain HTML `<div>`s with specific class names. The CSS for all of
them lives globally in `src/pages/blog/[slug].astro` (search for "Reusable
post mix-ins" in that file) — **you never need to paste any `<style>` block
into a post.** Just paste the HTML below and fill in your own text.

### Pull-quote

Use to break up a long section with an emphasized one-liner — pulled from
your own text, not a new claim.

```html
<div class="bp-pullquote">
  Your emphasized sentence goes here.
</div>
```

### Two-up comparison card

Use for "method A vs. method B" or "before vs. after" framing. The second
card (`accent`) is the one you want visually favored.

```html
<div class="bp-compare">
  <div class="bp-compare-card">
    <span class="bp-compare-kicker">Method 1</span>
    <h4>Title</h4>
    <ul>
      <li>Point one</li>
      <li>Point two</li>
    </ul>
  </div>
  <div class="bp-compare-card accent">
    <span class="bp-compare-kicker">Method 2</span>
    <h4>Title</h4>
    <ul>
      <li>Point one</li>
      <li>Point two</li>
    </ul>
  </div>
</div>
```

### Checklist box

Use for scannable "signs to watch for" / "things to check" lists. Reuse the
same checkmark SVG each time — don't invent a new icon per item.

```html
<div class="bp-checklist">
  <h4>Box heading</h4>
  <ul>
    <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>First item text.</li>
    <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>Second item text.</li>
  </ul>
</div>
```

### 4-step infographic

Use for a "here's exactly how to do it" walkthrough — replaces a numbered
list when you want it visual. Works with any number of `.bp-step` items, but
4 is the sweet spot for the connecting-line layout (auto-stacks vertically on
mobile). Real `<a>` links inside captions/labels work fine and stay crawlable
— don't rely on the graphic alone to carry a link.

```html
<div class="bp-steps">
  <span class="bp-steps-line" aria-hidden="true"></span>
  <div class="bp-step">
    <span class="bp-step-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><!-- icon path --></svg></span>
    <p class="bp-step-label">Step title</p>
    <p class="bp-step-caption">One-line explanation.</p>
  </div>
  <!-- repeat .bp-step for each step -->
</div>
```

Icon set already used elsewhere in the site (grab any of these instead of
drawing a new one — consistency matters more than variety): the search/camera
icons in `src/components/blog/SearchToolsWidget.astro`, and the outline-style
icon set throughout `src/pages/index.astro` and `src/components/Nav.astro`.

### Tables

Just write standard Markdown — no HTML needed:

```markdown
| Column | Column | Column |
|---|---|---|
| Row | Row | Row |
```

---

## Conventions to keep

- **Class prefix `bp-` is reserved** for these shared mix-ins. If you invent a
  new one-off visual for a single post, prefix it differently (or scope it to
  something unique) so it can't silently collide with a future shared
  component.
- **First-person, personal voice.** Not corporate copy — see
  `check-dating-profile-photos.md` for the calibration: "I've noticed," "here's
  what I actually do," opinions stated plainly.
- **Reference big, checkable sites only** — FTC, Pew, FBI/IC3, Google, Yandex,
  academic sources. Never an SEO-farm or unverifiable blog as a citation.
- **Internal links to the two finder tools should read naturally**, not be
  stuffed. Vary anchor text ("our OnlyFans face finder," "the Pornstar
  Finder") rather than repeating the exact same phrase every time.
- **Don't invent stats.** Reuse the site's existing numbers (`2.4M+`, `98%`,
  `<2s` from `StatsBar`) exactly, or cite a real external source — see
  `TOOLS-REFERENCE.md` for the technical facts that are safe to promote.
- **Check `TOOLS-REFERENCE.md`** before writing anything that describes how
  either search tool actually works — it's the accuracy source of truth so
  posts don't drift from what the tools really do.

## If you need a new schema field or a new mix-in

- New frontmatter field → add it to the Zod schema in `src/content.config.ts`,
  then wire it into `src/pages/blog/[slug].astro`.
- New reusable visual block → add its CSS under the "Reusable post mix-ins"
  comment in `src/pages/blog/[slug].astro` (as `.prose :global(.bp-whatever)`
  so it reaches content rendered from Markdown), then document it here so the
  next post doesn't have to rediscover it.
