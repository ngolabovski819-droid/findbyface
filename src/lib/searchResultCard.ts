// The one renderer for /onlyfans-search result cards, shared by BOTH sides:
//   - the server, prerendering the default (unfiltered) first page into the HTML
//   - the client, appending Load More batches and re-rendering filtered searches
//
// Extracted rather than duplicated on purpose. `.github/copilot-instructions.md` tracks
// how many places card markup is copy-pasted into, and a server/client pair that drifts
// apart is the worst version of that problem: the baked cards and the appended cards sit
// in the same grid, so any divergence is visible on screen the moment someone clicks
// Load More.
import { creatorCardDataAttributes, type CreatorCardUiData } from './creatorCardUi';
import { IMG_ONERROR, proxyImg } from '../utils/image';

// Re-exported so SearchPage's <script> keeps importing it from here.
export { proxyImg };

/** Only the label keys this renderer needs — the page's full dictionary is a superset. */
export interface SearchCardLabels {
  sponsored: string;
  free: string;
  viewProfile: string;
}

export interface SearchCardCreator extends CreatorCardUiData {
  name?: string;
  profileUrl?: string;
  subscribePrice?: number | string | null;
  /** Raw column name — present when a row comes straight from PostgREST. */
  subscribeprice?: number | string | null;
}

export function safeProfileHref(value: unknown, username: unknown): string {
  const fallback = `https://onlyfans.com/${encodeURIComponent(String(username ?? ''))}`;
  if (typeof value !== 'string') return fallback;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
  } catch { /* fall through */ }
  return fallback;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]!));
}

/** `index` drives img loading=eager for the first row-and-a-bit — keep passing the real
 *  position for a first render, and something past 8 for appended batches. */
export function renderSearchCard(c: SearchCardCreator, index: number, T: SearchCardLabels): string {
  const avatar = c.avatar;
  const imgSrc = avatar?.startsWith('/')
    ? avatar
    : avatar?.startsWith('http') ? proxyImg(avatar, 320, 427) : '/no-image.png';
  const rawAvatar = avatar?.startsWith('http') ? avatar : '';
  const price = c.subscribePrice ?? c.subscribeprice;
  const priceIsFree = (!price || isNaN(Number(price)));
  const priceLabel = priceIsFree ? T.free : `$${parseFloat(String(price)).toFixed(2)}`;
  const profileUrl = safeProfileHref(c.profileUrl, c.username);
  const isSponsored = Boolean(c.sponsored) || profileUrl.startsWith('/go/');
  const rel = isSponsored ? 'noopener nofollow sponsored' : 'noopener nofollow';
  const cardData = creatorCardDataAttributes(c);
  const safeProfileUrl = escapeHtml(profileUrl);
  const safeName = escapeHtml(c.name || c.username);
  const safeUsername = escapeHtml(c.username);

  return `<div class="creator-card" data-href="${safeProfileUrl}" ${cardData}>
      <div class="card-img-wrap">
        ${isSponsored ? `<span class="sponsored-badge">${T.sponsored}</span>` : ''}
        <img src="${escapeHtml(imgSrc)}" alt="${safeName}" loading="${index < 8 ? 'eager' : 'lazy'}"
          decoding="async" referrerpolicy="no-referrer"${rawAvatar ? ` data-raw="${escapeHtml(rawAvatar)}"` : ''}
          onerror="${IMG_ONERROR}">
      </div>
      <div class="card-body">
        <p class="creator-name">${safeName}</p>
        <p class="username">@${safeUsername}</p>
        <p class="price ${priceIsFree ? 'price-free' : ''}">${priceLabel}</p>
        <a href="${safeProfileUrl}" class="view-btn" target="_blank" rel="${rel}">${T.viewProfile}</a>
      </div>
    </div>`;
}
