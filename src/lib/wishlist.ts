// Client-side wishlist storage — account-scoped the same way search history is (see
// src/lib/accountSearchHistory.ts's scopedSearchHistoryKey), so switching accounts on a
// shared browser never leaks one person's saved creators into another's list. There is no
// server sync yet: signing in raises the cap (a real, honest incentive — a bigger, more
// durable list tied to your account instead of just this one browser) but the data itself
// still lives in this browser until a synced backend is worth building.
import { currentAccountId, scopedSearchHistoryKey } from './accountSearchHistory';

const STORAGE_BASE_KEY = 'findbyface:wishlist';
export const WISHLIST_LIMIT_GUEST = 10;
export const WISHLIST_LIMIT_ACCOUNT = 50;

export interface WishlistEntry {
  username: string;
  name: string;
  avatar: string;
  price: string;
  profileUrl: string;
  addedAt: number;
}

function storageKey(): string {
  return scopedSearchHistoryKey(STORAGE_BASE_KEY);
}

// Older builds stored a plain string[] of usernames. Tolerate that shape rather than
// discarding it — every string entry survives as a minimal WishlistEntry.
function normalizeEntry(value: unknown): WishlistEntry | null {
  if (typeof value === 'string') {
    const username = value.trim();
    return username ? { username, name: username, avatar: '', price: '', profileUrl: '', addedAt: 0 } : null;
  }
  if (value && typeof value === 'object' && typeof (value as { username?: unknown }).username === 'string') {
    const entry = value as Partial<WishlistEntry>;
    const username = (entry.username ?? '').trim();
    if (!username) return null;
    return {
      username,
      name: typeof entry.name === 'string' && entry.name ? entry.name : username,
      avatar: typeof entry.avatar === 'string' ? entry.avatar : '',
      price: typeof entry.price === 'string' ? entry.price : '',
      profileUrl: typeof entry.profileUrl === 'string' ? entry.profileUrl : '',
      addedAt: typeof entry.addedAt === 'number' ? entry.addedAt : 0,
    };
  }
  return null;
}

export function getWishlist(): WishlistEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey()) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeEntry).filter((entry): entry is WishlistEntry => entry !== null);
  } catch {
    return [];
  }
}

function setWishlist(entries: WishlistEntry[]): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(entries));
  } catch {
    // Storage full/unavailable (private browsing) — the in-memory toggle already reflected
    // the attempt; there's nothing further to do without a server-side fallback.
  }
}

export function isInWishlist(username: string): boolean {
  const needle = username.toLowerCase();
  return getWishlist().some(entry => entry.username.toLowerCase() === needle);
}

export function getWishlistLimit(): number {
  return currentAccountId() ? WISHLIST_LIMIT_ACCOUNT : WISHLIST_LIMIT_GUEST;
}

export interface ToggleResult {
  added: boolean;
  blocked: boolean; // true only when trying to add past the limit
  count: number;
  limit: number;
}

// Reads the rest of an entry's display data straight off the already-rendered card DOM
// (name/avatar/price/profile link) rather than requiring every card-rendering page to bake
// extra data attributes just for the wishlist — the classnames below are already the site's
// shared card convention (CreatorCard.astro, onlyfans-search.astro's renderCard, etc.).
export function readEntryFromCard(card: HTMLElement, username: string): WishlistEntry {
  const name = card.querySelector('.creator-name')?.textContent?.trim();
  const price = card.querySelector('.price')?.textContent?.trim();
  const avatar = card.querySelector<HTMLImageElement>('.card-img-wrap img')?.src;
  return {
    username,
    name: name || username,
    avatar: avatar || '',
    price: price || '',
    profileUrl: card.dataset.href || `https://onlyfans.com/${encodeURIComponent(username)}`,
    addedAt: Date.now(),
  };
}

export function toggleWishlist(username: string, entryIfAdding?: WishlistEntry): ToggleResult {
  const needle = username.toLowerCase();
  const current = getWishlist();
  const exists = current.some(entry => entry.username.toLowerCase() === needle);
  const limit = getWishlistLimit();

  if (exists) {
    const next = current.filter(entry => entry.username.toLowerCase() !== needle);
    setWishlist(next);
    return { added: false, blocked: false, count: next.length, limit };
  }

  if (current.length >= limit) {
    return { added: false, blocked: true, count: current.length, limit };
  }

  const next = [...current, entryIfAdding ?? { username, name: username, avatar: '', price: '', profileUrl: '', addedAt: Date.now() }];
  setWishlist(next);
  return { added: true, blocked: false, count: next.length, limit };
}

export function removeFromWishlist(username: string): WishlistEntry[] {
  const needle = username.toLowerCase();
  const next = getWishlist().filter(entry => entry.username.toLowerCase() !== needle);
  setWishlist(next);
  return next;
}
