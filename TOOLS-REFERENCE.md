# findbyface tools — technical reference for writing

This is a writing reference, not user-facing copy. It exists so that anyone writing
blog posts, landing-page copy, FAQs, or marketing material for findbyface's two
face-search tools can do it from an accurate understanding of what the tools
actually do — not guesses. Every claim below is sourced from the current
implementation (file paths included) so it can be re-verified if the code changes.

There are **two separate face-search tools** on findbyface. They look similar to a
user (upload a photo, get ranked matches) but run on completely different engines,
built for different jobs. Conflating them in copy is the single easiest accuracy
mistake to make — see "Don't mix these two up" below before writing anything.

---

## 1. OnlyFans Finder by Face — `/onlyfans-finder-by-face/`

**The job:** lookalike *discovery*. "Find creators who look like this face." Near
misses are fine and often the point — someone might want the closest visual match,
not an exact re-identification.

### How it actually works, end to end

1. **In the browser** (`src/components/UploadBox.astro`): the user's photo is
   decoded locally. `face-api.js` (running on TensorFlow.js, WebGL backend) loads
   two models lazily — **only when the user actually uploads something**, never on
   page load — and detects one face, then extracts a **128-dimensional descriptor**
   (the classic dlib-based face-recognition embedding).
2. **The photo itself never leaves the browser.** Only the 128-number descriptor
   is POSTed to `/api/face-search`. This is a genuinely accurate, strong privacy
   claim — worth using in copy — because it's structurally true, not just a policy
   promise: the server-side code (`src/pages/api/face-search.ts`) only ever
   receives an array of floats, never image bytes.
3. **Server-side matching**, three tiers in order:
   - **Primary:** the `match_faces` Postgres RPC (pgvector) computes cosine
     similarity between the query descriptor and every creator's precomputed
     `face_embedding`, across the full `onlyfans_profiles` table, and returns a
     real `matchPct`.
   - **Fallback:** if the RPC call fails, the same comparison runs in Node,
     scoring up to 1,000 creators server-side.
   - **Last resort:** if no face was detected at all (empty/all-zero descriptor),
     the response falls back to popular creators by favorite count, with no
     match percentage — this is the *only* case where results aren't a real face
     match, and copy should never claim otherwise for this fallback.
4. **The embeddings being searched are precomputed offline**, not live —
   `scripts/generate-embeddings.mjs` (Node, TF.js/WASM) runs face-api.js against
   the creator catalog ahead of time and stores each `face_embedding` as a
   `vector(128)` column. Match quality scales directly with how much of the
   catalog has been embedded — this is a real, ongoing coverage story worth
   framing honestly ("growing index"), not "instantly searches everything."

### Access & limits (accurate — don't overstate or understate)

- Anonymous visitors get **2 free searches**, tracked by a `fbf_searches` counter
  in `localStorage` — soft, resettable by clearing browser storage. After that,
  a sign-in gate appears, and every other result card (odd index) is blurred for
  signed-out users.
- Signed-in accounts get unlimited searches, plus search history.
- Sponsored/pinned results can appear in the list (via `src/config/placements.ts`)
  but are always disclosed with an "Ad · Sponsored" badge and are never blurred —
  don't write copy implying every visible card is an organic face match.

### Promotional angles that are actually true

- **"Your photo never leaves your device."** The strongest, most specific privacy
  claim available — the matching happens on a numeric fingerprint of the face,
  computed in-browser, not the picture itself.
- **Speed** — detection and matching are fast enough for the site's existing
  "under 2 seconds" framing (already used in `StatsBar`/hero copy) — keep new copy
  consistent with that number rather than inventing a different one.
- **Free to start, no account required for the first searches.**
- Avoid implying the tool is a general reverse-image search — it specifically
  searches the OnlyFans creator catalog, nothing else.

---

## 2. Pornstar Finder by Face — `/pornstar-finder-by-face/`

**The job:** closer to *identity re-identification*. "Find videos this specific
person appears in." This tool is held to a higher precision bar than the OnlyFans
finder on purpose — see migration `009_performer_video_identity.sql`'s own comment:
it deliberately moved to a modern 512-D embedding *because* re-identification needs
better pose/lighting/blur robustness than lookalike discovery does.

### How it actually works, end to end

1. **Upload** (`src/components/VideoFaceSearch.astro` → `src/pages/api/video-face-search.ts`):
   the user's actual image bytes (JPEG/PNG/WebP, max 8MB) are sent — unlike the
   OnlyFans finder, this tool does upload the real photo, because the heavy face
   model runs server-side, not in the browser. That distinction matters for
   accurate privacy copy — see the note below.
2. **Guest rate limiting is a signed httpOnly cookie**, not localStorage: one free
   search per UTC day, enforced by an HMAC token the server verifies — meaningfully
   harder to reset than the OnlyFans finder's client-side counter. Signed-in users
   get unlimited searches. An optional Cloudflare Turnstile check can gate the
   request when configured.
3. **The image is forwarded to a remote matcher**, not processed on the Vercel
   server: a Modal-hosted, serverless FastAPI service
   (`services/video_face_matcher_modal.py`). The request is authenticated with an
   HMAC signature (timestamp + SHA-256 of the body, signed with a shared secret) so
   only findbyface's own backend can call it.
4. **Face detection & embedding** uses **InsightFace `buffalo_l`** — a modern
   ArcFace-family model producing a **512-dimensional** embedding, a meaningfully
   different (and more discriminative) model than the OnlyFans finder's 128-D one.
   - If the standard detection pass finds nothing, it **automatically retries**
     with a padded canvas and a lowered detection threshold, specifically to
     rescue tightly-cropped screenshots (common for video stills) that would
     otherwise fail. This is a real, deliberate UX accommodation worth mentioning
     in a "why results sometimes work even on a rough screenshot" FAQ answer.
   - Exactly **one face is required** — multi-face uploads are rejected with a
     clear message asking the user to crop to one person. Don't write copy
     implying group photos work.
   - **The image is never persisted.** It's decoded in memory for the one request
     and discarded — not written to disk, not uploaded to storage.
5. **Matching** runs against a `video_face_embeddings` table (512-D `halfvec`,
   HNSW-indexed, ~130k+ rows and growing) via the `match_video_faces` RPC, and it
   does more than a flat top-N lookup:
   - Pulls a large candidate pool of individual matching **frames**, filters by a
     tuned similarity threshold, then **groups matches by video** — because one
     video is sampled at many timestamps during indexing, so several of its frames
     can independently match the same query face.
   - Reports **two confidence scores per video**: `similarity` (the single best
     matching frame) and `robustSimilarity` (the average of the top 3 matching
     frames, when at least 2 frames agree — otherwise a discounted version of the
     best score). This is a genuine, explainable accuracy story: *"we don't trust
     one lucky frame — we cross-check multiple moments before we're confident."*
   - Returns `bestTimestampSeconds` — the exact moment in the video the best match
     occurred, which is what powers a "jump to this moment" result rather than
     just "this video contains a match somewhere."
6. **Thumbnails are cached, not re-fetched every time.** The first time a video
   surfaces in results, its thumbnail is pulled (from the stored URL, or freshly
   from the source) and saved permanently to Supabase Storage; later searches for
   the same video serve the cached copy instantly.

### The offline indexing pipeline (what "growing index" actually means)

- Video catalog is currently sourced from Pornhub (`scripts/collect_pornhub_catalog.py`
  and related collectors).
- `scripts/index_video_faces_supabase.py` resolves a signed stream URL just-in-time
  (never stored), samples frames at a fixed interval, and **deliberately skips the
  first and last ~20 seconds of every video** to avoid intros/outros/logo bumpers —
  a real, specific quality decision worth citing if a post ever explains "why."
  Frames live in a temp folder for the one job and are deleted immediately after.
- Per video, faces are detected, clustered by who they belong to, and only up to
  48 of the best representative embeddings are kept — not one per frame. This is
  quality-over-quantity sampling, not a raw video-frame dump.
- Each indexing run is versioned (`pipeline_version`, `model_version`), and a
  Postgres function (`complete_video_face_run`) atomically flips a finished run's
  embeddings live while retiring the previous run's — a half-finished or failed
  reprocessing job can never leave the search index in an inconsistent state, and
  nothing goes live until it's fully validated. Genuinely strong "our index only
  ever serves complete, checked data" trust point.
- There's a second, **not-yet-live** identity subsystem in the schema (`performers`,
  `performer_exemplars`, `performer_videos`, the `match_performers` RPC — see
  migration `009`) designed for a future "browse by performer" experience using a
  gallery of exemplar embeddings per performer. **Do not promote this as shipped**
  — the current live search path is the video-grouped one described above, not
  this performer-identity layer.

### Access & limits (accurate — don't overstate or understate)

- **1 free search per day** for guests (UTC-day reset), enforced server-side, not
  client-side. Unlimited for signed-in accounts.
- Max upload: 8MB, JPEG/PNG/WebP only, exactly one face.
- The page already calls this index a **"beta"** — keep new copy consistent with
  that framing rather than implying complete coverage of all adult video content.

### Promotional angles that are actually true

- **"We don't just check one frame — we cross-check the whole video."** The
  robust-similarity/multi-frame-evidence system is a real, explainable accuracy
  advantage, not marketing fluff.
- **"Jump straight to the moment, not just the video."** The timestamp feature is
  a genuine UX differentiator worth a screenshot or callout.
- **A more precise model than the OnlyFans finder, on purpose** — because this
  tool's job (re-identifying one specific person) is a harder problem than
  lookalike discovery, and it uses a newer, higher-dimensional model to match.
- **Nothing about the uploaded photo is stored** — true for this tool too, just
  via a different mechanism (in-memory processing + immediate discard, rather
  than never leaving the browser at all).

---

## Don't mix these two up

| | OnlyFans Finder | Pornstar Finder |
|---|---|---|
| Searches | OnlyFans creator profiles | Indexed adult video appearances |
| Model | face-api.js, 128-D (dlib-based) | InsightFace `buffalo_l`, 512-D (ArcFace) |
| Where the photo is processed | Browser only — image never sent | Server (Modal) — image bytes sent, never stored |
| What's sent to the backend | A 128-number descriptor only | The actual image bytes (HMAC-authenticated) |
| Guest limit | 2 total, client-side counter | 1 per day, server-verified signed cookie |
| Multi-face photos | Matches whichever face is detected | Rejected — must be exactly one face |
| Result grouping | One row per creator | One row per video, built from multiple matching frames |
| Maturity framing | Live, established | Explicitly "beta" |

If a piece of copy could apply to either tool without changing a word, that's a
sign it's describing the shallow surface ("upload a photo, get matches") instead
of what's actually differentiated about each one — which is usually the more
interesting, more credible thing to write about anyway.

## Things every piece of copy should get right

- **Similarity is a ranking signal, not proof of identity.** Both tools' existing
  FAQ copy already says this explicitly — new content should never contradict it,
  especially anything adjacent to identity claims about real people.
- **Don't invent statistics.** "2.4M+ creators," "98% match accuracy," "<2s search
  time" are the site's existing, established numbers (`StatsBar`) — reuse them
  exactly rather than approximating a new figure.
- **Query photos are never added to the searchable index**, for either tool — true
  and worth repeating, since it's the single biggest trust objection a new visitor
  has before uploading anything.
