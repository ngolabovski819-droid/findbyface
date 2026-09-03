// Same-origin resizing for creator photos.
//
// Every card, dropdown and feed image used to be built as an images.weserv.nl URL. On
// 2026-09-03 weserv policy-blocked every *.onlyfans.com host (adult-category filter, no
// allowlist process) and every creator photo on the site went blank at once. Photos now
// go through Astro's built-in `/_image` endpoint instead: it runs sharp inside our own
// Vercel function, crops to the requested box (fit=cover), encodes WebP, and only fetches
// hosts allowlisted in astro.config.mjs `image.remotePatterns`. src/middleware.ts adds the
// CDN cache header that endpoint doesn't set itself.
//
// This is THE builder — it is imported by server frontmatter and by browser <script>
// bundles alike. Keep the contract identical on both sides, or prerendered cards and
// client-appended cards diverge in the same grid:
//   - local paths ('/uploads/sponsors/…', '/no-image.png', an already-built '/_image?…')
//     pass through untouched
//   - anything that isn't an http(s) URL → IMAGE_PLACEHOLDER

export const IMAGE_PLACEHOLDER = '/no-image.png';

/**
 * Inline `onerror` for creator <img>s. If the resized image fails, retry once with the
 * raw source from `data-raw` (bigger, but it renders), then fall back to the placeholder.
 * The retry is gated by a `data-retried` flag rather than by comparing `this.src` to the
 * raw URL: the browser returns `src` normalized, so a raw URL it rewrites (odd percent
 * encoding, upgraded scheme) would never compare equal and the handler would loop.
 * `this.onerror=null` on the last step keeps the placeholder itself from looping.
 */
export const IMG_ONERROR =
  "if(this.dataset.raw&&!this.dataset.retried){this.dataset.retried='1';this.removeAttribute('srcset');this.src=this.dataset.raw;}"
  + "else{this.onerror=null;this.removeAttribute('srcset');this.src='/no-image.png';}";

const HTTP_URL = /^https?:\/\//i;

/**
 * Every (w x h) box the site requests. src/middleware.ts rejects any other size with a
 * 400, so an attacker can't burn the resize function (and the CDN cache) by asking for
 * thousands of arbitrary dimensions. Add a pair here BEFORE using it in a component.
 */
export const IMAGE_SIZES = new Set([
  '60x80',    // feed blur background
  '72x72',    // dropdown ad row, dashboard preview stack
  '80x80',    // dropdown creator suggestion
  '96x96',    // battle leaderboard
  '100x100',  // category top creators
  '144x192', '240x320', '320x427', '480x640', '720x960', // card + srcset (3:4)
  '160x213',  // roulette faces
  '220x293',  // dashboard saved results
  '520x680',  // battle VS card
  '640x853',  // feed photo
]);

/** Only the OnlyFans CDNs may be resized; mirrors `image.remotePatterns` in astro.config.mjs. */
const IMAGE_HOST = /^https:\/\/([a-z0-9-]+\.)+onlyfans\.com\//i;

export function proxyImg(url: string | null | undefined, w: number, h: number): string {
  if (!url) return IMAGE_PLACEHOLDER;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  if (!HTTP_URL.test(url)) return IMAGE_PLACEHOLDER;
  if (import.meta.env.DEV && !IMAGE_SIZES.has(`${w}x${h}`)) {
    console.warn(`[image] ${w}x${h} is not in IMAGE_SIZES — the middleware will 400 it. Add it to src/utils/image.ts.`);
  }
  return `/_image?href=${encodeURIComponent(url)}&w=${w}&h=${h}&fit=cover&f=webp`;
}

/**
 * Middleware guard for `/_image` requests: only the exact URL shape `proxyImg` emits.
 * Astro's endpoint would otherwise also proxy same-origin paths and honour arbitrary
 * `w`/`h`/`f` values; the site never needs either.
 */
export function isAllowedImageRequest(params: URLSearchParams): boolean {
  const href = params.get('href') ?? '';
  if (!IMAGE_HOST.test(href)) return false;
  if (!IMAGE_SIZES.has(`${params.get('w')}x${params.get('h')}`)) return false;
  return params.get('fit') === 'cover' && params.get('f') === 'webp';
}

/** Card srcset at the 3:4 card ratio. */
export function buildSrcset(url: string): { src: string; srcset: string; sizes: string } {
  const widths = [144, 240, 320, 480, 720];
  const srcset = widths.map(w => `${proxyImg(url, w, Math.round(w * 4 / 3))} ${w}w`).join(', ');
  const src = proxyImg(url, 320, 427);
  const sizes = '(max-width:480px) 144px, (max-width:768px) 240px, (max-width:1200px) 320px, 360px';
  return { src, srcset, sizes };
}
