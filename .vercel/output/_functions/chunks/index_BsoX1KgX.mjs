import { c as createComponent } from './astro-component_DgvF6lYD.mjs';
import 'piccolore';
import { m as maybeRenderHead, h as addAttribute, r as renderTemplate, n as renderComponent } from './entrypoint_Diw_7atc.mjs';
import { r as renderScript, $ as $$Base } from './Base_rmWjJ2Qt.mjs';
import 'clsx';
import { $ as $$CategoryChips, a as $$CreatorCard } from './CategoryChips_ZbVh4H1p.mjs';

const $$UploadBox = createComponent(async ($$result, $$props, $$slots) => {
  const GOOGLE_AUTH_URL = `https://sirudrqheimbgpkchtwi.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent("https://findbyface.org/auth/callback")}`;
  return renderTemplate`<!-- Auth Gate Modal -->${maybeRenderHead()}<div id="authModal" class="auth-modal" style="display:none" role="dialog" aria-modal="true" data-astro-cid-n2dqqzf6> <div class="auth-backdrop" id="authBackdrop" data-astro-cid-n2dqqzf6></div> <div class="auth-box" data-astro-cid-n2dqqzf6> <button class="auth-close" id="authClose" aria-label="Close" data-astro-cid-n2dqqzf6>×</button> <div class="auth-icon-wrap" data-astro-cid-n2dqqzf6>🔍</div> <h3 data-astro-cid-n2dqqzf6>You've used your 2 free searches</h3> <p data-astro-cid-n2dqqzf6>Sign in free to unlock unlimited searches and see all matching profiles.</p> <a${addAttribute(GOOGLE_AUTH_URL, "href")} class="google-btn" data-astro-cid-n2dqqzf6> <svg viewBox="0 0 24 24" width="20" height="20" style="flex-shrink:0" aria-hidden="true" data-astro-cid-n2dqqzf6> <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" data-astro-cid-n2dqqzf6></path> <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" data-astro-cid-n2dqqzf6></path> <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" data-astro-cid-n2dqqzf6></path> <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" data-astro-cid-n2dqqzf6></path> </svg>
Continue with Google — it's free
</a> <button class="auth-skip" id="authSkip" data-astro-cid-n2dqqzf6>Maybe later</button> </div> </div> <div class="upload-section" data-astro-cid-n2dqqzf6> <div class="upload-box" id="uploadBox" data-astro-cid-n2dqqzf6> <!-- State 1: Idle --> <div id="uploadIdle" class="upload-idle" data-astro-cid-n2dqqzf6> <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" data-astro-cid-n2dqqzf6> <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-n2dqqzf6></path> </svg> <h3 data-astro-cid-n2dqqzf6>Drop a photo here</h3> <p data-astro-cid-n2dqqzf6>Upload any image — we'll find creators who look just like them</p> <button class="choose-btn" id="chooseBtn" data-astro-cid-n2dqqzf6>Choose photo</button> <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp" style="display:none" aria-label="Upload photo" data-astro-cid-n2dqqzf6> <p class="upload-hint" data-astro-cid-n2dqqzf6>JPG · PNG · WEBP &nbsp;·&nbsp; Ctrl+V to paste</p> </div> <!-- State 2: Scanning --> <div id="uploadScanning" style="display:none" class="scanning-state" data-astro-cid-n2dqqzf6> <div class="scanning-img-box" data-astro-cid-n2dqqzf6> <img id="scanningImg" alt="Your photo being analyzed" data-astro-cid-n2dqqzf6> <div class="scan-line" data-astro-cid-n2dqqzf6></div> </div> <p class="scanning-title" data-astro-cid-n2dqqzf6>findbyface is searching...</p> <p class="scanning-sub" data-astro-cid-n2dqqzf6>Analyzing your image and comparing with millions of profiles to find lookalikes.</p> <div class="progress-track" data-astro-cid-n2dqqzf6> <div class="progress-fill" id="progressFill" data-astro-cid-n2dqqzf6></div> </div> <p class="progress-pct" id="progressPct" data-astro-cid-n2dqqzf6>0%</p> </div> <!-- State 3: Done --> <div id="uploadDone" style="display:none" class="done-state" data-astro-cid-n2dqqzf6> <img id="thumbnailImg" class="thumbnail-img" alt="Searched photo" data-astro-cid-n2dqqzf6> <div class="done-info" data-astro-cid-n2dqqzf6> <p class="done-label" data-astro-cid-n2dqqzf6>Searched image</p> <button class="new-search-btn" id="newSearchBtn" data-astro-cid-n2dqqzf6>← New Search</button> </div> </div> </div> <p class="upload-error" id="uploadError" style="display:none" data-astro-cid-n2dqqzf6></p> <div class="search-divider" data-astro-cid-n2dqqzf6><span data-astro-cid-n2dqqzf6>— or search by name —</span></div> <form class="search-bar-inline" action="/onlyfans-search/" method="get" data-astro-cid-n2dqqzf6> <input type="text" name="q" placeholder="Search creators..." autocomplete="off" data-astro-cid-n2dqqzf6> <button type="submit" data-astro-cid-n2dqqzf6>Search</button> </form> </div> <!-- Results --> <div id="faceResults" class="face-results" style="display:none" data-astro-cid-n2dqqzf6> <h2 class="results-heading" data-astro-cid-n2dqqzf6>Matching Creators</h2> <div id="faceResultsGrid" class="face-results-grid" data-astro-cid-n2dqqzf6></div> <div id="unlockBanner" class="unlock-banner" style="display:none" data-astro-cid-n2dqqzf6> <p id="unlockBannerText" data-astro-cid-n2dqqzf6>🔒 <strong data-astro-cid-n2dqqzf6>8 more matches found</strong> — sign in free to see all</p> <a${addAttribute(GOOGLE_AUTH_URL, "href")} class="unlock-banner-btn" data-astro-cid-n2dqqzf6>Sign in with Google</a> </div> </div> ${renderScript($$result, "C:/Users/nickg/findbyface/src/components/UploadBox.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/nickg/findbyface/src/components/UploadBox.astro", void 0);

const $$StatsBar = createComponent(($$result, $$props, $$slots) => {
  const stats = [
    { number: "2.4M+", label: "CREATORS INDEXED" },
    { number: "98%", label: "MATCH ACCURACY" },
    { number: "<2s", label: "SEARCH TIME" },
    { number: "free", label: "TO START" }
  ];
  return renderTemplate`${maybeRenderHead()}<div class="stats-bar" data-astro-cid-tvxlxp64> ${stats.map((s) => renderTemplate`<div class="stat" data-astro-cid-tvxlxp64> <span class="stat-number" data-astro-cid-tvxlxp64>${s.number}</span> <span class="stat-label" data-astro-cid-tvxlxp64>${s.label}</span> </div>`)} </div>`;
}, "C:/Users/nickg/findbyface/src/components/StatsBar.astro", void 0);

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const SUPABASE_URL = "https://sirudrqheimbgpkchtwi.supabase.co"?.replace(/\/+$/, "");
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnVkcnFoZWltYmdwa2NodHdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUxNTk0NiwiZXhwIjoyMDc3MDkxOTQ2fQ.FJmA1ChyHy-rgcVMy5aklDrZjijRc-yfyLRC8tN8XFs";
  let initialCreators = [];
  let hasMore = false;
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const params = new URLSearchParams({
        select: "id,username,name,avatar,isverified,subscribeprice,favoritedcount",
        order: "favoritedcount.desc",
        limit: "20"
      });
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${params}`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Accept-Profile": "public",
          Prefer: "count=exact"
        }
      });
      if (resp.ok) {
        const raw = await resp.json();
        const cr = resp.headers.get("Content-Range") ?? "";
        const total = parseInt(cr.split("/")[1] ?? "0") || 0;
        hasMore = total > 20;
        initialCreators = raw.map((c) => ({
          id: c.id,
          username: c.username,
          name: c.name,
          avatar: c.avatar,
          isVerified: c.isverified,
          subscribePrice: c.subscribeprice
        }));
      }
    } catch {
    }
  }
  return renderTemplate`${renderComponent($$result, "Base", $$Base, { "title": "findbyface — Find Lookalike OnlyFans Creators Instantly", "data-astro-cid-j7pv25f6": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="hero" data-astro-cid-j7pv25f6> <div class="hero-badge" data-astro-cid-j7pv25f6> <span class="badge-dot" data-astro-cid-j7pv25f6></span>
AI-powered face matching
</div> <h1 data-astro-cid-j7pv25f6><span class="h1-white" data-astro-cid-j7pv25f6>Find</span> <span class="gradient-text" data-astro-cid-j7pv25f6>lookalike</span><br data-astro-cid-j7pv25f6><span class="h1-white" data-astro-cid-j7pv25f6>creators instantly</span></h1> <p class="hero-sub" data-astro-cid-j7pv25f6>Upload a photo and discover OnlyFans creators with similar appearances in seconds.</p> </div> ${renderComponent($$result2, "UploadBox", $$UploadBox, { "data-astro-cid-j7pv25f6": true })} ${renderComponent($$result2, "StatsBar", $$StatsBar, { "data-astro-cid-j7pv25f6": true })} <section class="browse-section" data-astro-cid-j7pv25f6> <h2 class="section-title" data-astro-cid-j7pv25f6>Browse by Category</h2> ${renderComponent($$result2, "CategoryChips", $$CategoryChips, { "data-astro-cid-j7pv25f6": true })} </section> ${initialCreators.length > 0 && renderTemplate`<section class="creators-section" data-astro-cid-j7pv25f6> <h2 class="section-title" data-astro-cid-j7pv25f6>Popular Creators</h2> <div class="creators-grid" id="creatorsGrid" data-astro-cid-j7pv25f6> ${initialCreators.map((c, i) => renderTemplate`${renderComponent($$result2, "CreatorCard", $$CreatorCard, { "creator": c, "index": i, "data-astro-cid-j7pv25f6": true })}`)} </div> ${hasMore && renderTemplate`<div class="load-more-wrap" data-astro-cid-j7pv25f6> <button class="load-more-btn" id="loadMoreBtn" data-astro-cid-j7pv25f6>Load More</button> </div>`} </section>`}` })} ${renderScript($$result, "C:/Users/nickg/findbyface/src/pages/index.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/nickg/findbyface/src/pages/index.astro", void 0);
const $$file = "C:/Users/nickg/findbyface/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
