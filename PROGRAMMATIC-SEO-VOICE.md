# findbyface programmatic-SEO voice — how category-page copy should sound

This governs body copy on category pages (the intro/sections/FAQ rendered by
`CategoryIntro.astro` and `CategoryBody.astro`, sourced from
`src/config/categoryContent.ts`) and any future programmatic-SEO page type
(location or occupation pages, if those ever get built). It does **not**
cover blog posts — those keep their own voice convention in
`BLOG-POST-TEMPLATE.md` (also first-person and casual, but a different
register — a blog post is one person's reflective writing, a category page
is more like a friend giving you the rundown on a specific list).

## The persona

Write like a regular person from the US, texting a friend who just asked
"hey what's actually good on findbyface for [X]?" You clearly know the
OnlyFans/creator-content space, you're not a generic blogger guessing at it
from outside. Confident, casual, a little opinionated where it's earned.
Not horny marketing copy. Not Wikipedia. Not a listicle.

## Hard rules

1. **Filler words, used naturally and sparingly.** "um," "honestly," "like,"
   "ya know," "kinda" — one or two per section, not one per sentence. If
   every paragraph has one, it reads fake. That's the tell.
2. **Trailing thoughts use ellipses (`...`)**, not em dashes or semicolons.
   A thought can trail off or double back on itself instead of being
   cleanly punctuated.
3. **Banned words — never use these.** delve, leverage, pivot, testament,
   foster, landscape, ultimately, groundbreaking, revolutionary, elevate,
   unleash, "in today's world," "it's important to note," "dive into,"
   "unlock," "game-changer," "seamless," "robust," "tapestry," "navigate"
   (as a metaphor for anything other than literal directions). If a sentence
   would only work in a LinkedIn post, rewrite it.
4. **Loose structure.** H2s stay — they're doing real work for scannability
   and SEO. But the prose *under* an H2 is not a bulleted list, not a run of
   bolded mini-subheaders, not a tidy "in conclusion" wrap-up paragraph.
   Let a paragraph run a little long, change direction mid-thought, sound
   like someone actually talking instead of an outline someone filled in.
5. **Casual contractions, occasional lowercase.** don't, gonna, wanna,
   kinda, y'all. Don't force it into every single sentence — that's just as
   fake as never using it.
6. **The read-aloud test.** If a sentence isn't something an actual person
   would say out loud to a friend, rewrite it. This is the real filter —
   rules 1-5 are just ways of describing what passing this test looks like.

## Stay factually honest

This doc governs *voice only*. For facts — how the two search tools
actually work, and the exact numbers that are safe to reuse — see
`TOOLS-REFERENCE.md`. Never invent a stat. If referencing the site's tools,
reuse the real numbers exactly: **2.4M+ creators, 98% match accuracy, <2s
search time**. And never contradict the standing rule that similarity is a
ranking signal, not proof of identity — that applies to category-page copy
too, any time it talks about how the list or the face-search tools work.

Category-page copy should almost never need an external citation — it's
describing the site's own list, not making a general factual claim, so the
sourcing bar from `BLOG-POST-TEMPLATE.md` mostly doesn't come up here.

## Before / after

**Bad (corporate/AI-cliché):**
> In today's fast-evolving landscape of adult content creators, we delve
> into what makes MILF creators such a compelling niche for fans seeking
> mature companionship.

**Good:**
> Honestly MILF is one of the categories people search for the most on
> here, and I get why... there's just something about that older, confident
> energy a lot of guys are specifically hunting for instead of scrolling
> the whole site.

---

**Bad:**
> Ultimately, by leveraging our AI-powered face search, you can elevate
> your experience and unlock the perfect match tailored to your unique
> preferences.

**Good:**
> If you've already got a specific face in mind, honestly just upload the
> photo instead of scrolling forever... the face search will pull up
> creators who actually look like that, usually in under 2 seconds.

---

**Bad (listicle-clean, not loose prose):**
> Our groundbreaking ranking system revolutionizes discovery through:
> - Real-time engagement tracking
> - Verified account status
> - Daily updated pricing

**Good:**
> The ranking here isn't some editor's personal picks, it's pulled from
> real engagement on OnlyFans... favorites, subscriber activity, that kind
> of thing. It refreshes daily too, so if someone blows up this week
> you'll actually see them move up, not find out six months from now.

## When writing a new category entry

Read the finished pilot entries in `src/config/categoryContent.ts` first —
start with `milf`, since it's the calibration example everything else was
checked against. Matching those is a better target than re-deriving the
voice from this doc alone every time.

A few practical notes specific to this site:
- Paragraphs in `categoryContent.ts` are plain text (no inline links or
  bold) — keep the writing itself doing the work, not markup.
- Every pilot category's FAQ should have one question along the lines of
  "can I just search a specific face instead of browsing?" — it's a
  natural, non-repetitive way to point people at the actual product from
  inside real content, not a bolted-on ad.
- It's fine, even good, to be honest about a category's limits or overlap
  with another category (MILF vs. Mature, Asian vs. Japanese/Korean, etc.)
  instead of pretending every category is a perfectly clean bucket. That
  honesty reads as expertise, not as a weakness.
