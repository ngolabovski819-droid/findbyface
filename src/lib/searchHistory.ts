// Recent-search-terms storage, shared by every search bar on the site (currently the
// homepage hero mini-form and the dedicated /onlyfans-search page). Case-insensitive
// dedupe: searching "Blonde" then "blonde" keeps one entry, newest wins.
import { scopedSearchHistoryKey } from './accountSearchHistory';

const HISTORY_KEY = 'fbf_search_queries';
const MAX_HISTORY = 8;

function localAccountId(): string | null {
  try {
    const user = JSON.parse(localStorage.getItem('fbf_user') || 'null') as { id?: unknown } | null;
    return typeof user?.id === 'string' && user.id ? user.id : null;
  } catch {
    return null;
  }
}

export function historyStorageKey(): string {
  return scopedSearchHistoryKey(HISTORY_KEY);
}

export function historyStorageKeyForOwner(accountId: string | null): string {
  return scopedSearchHistoryKey(HISTORY_KEY, accountId);
}

export function getHistoryForOwner(accountId: string | null): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(historyStorageKeyForOwner(accountId)) || '[]');
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function pushHistoryForOwner(q: string, accountId: string | null): void {
  const trimmed = q.trim();
  if (!trimmed) return;
  const key = trimmed.toLowerCase();
  const list = getHistoryForOwner(accountId).filter(s => s.toLowerCase() !== key);
  list.unshift(trimmed);
  localStorage.setItem(historyStorageKeyForOwner(accountId), JSON.stringify(list.slice(0, MAX_HISTORY)));
}

export function removeHistoryForOwner(q: string, accountId: string | null): void {
  const list = getHistoryForOwner(accountId).filter(s => s !== q);
  localStorage.setItem(historyStorageKeyForOwner(accountId), JSON.stringify(list));
}

export function clearHistoryForOwner(accountId: string | null): void {
  localStorage.removeItem(historyStorageKeyForOwner(accountId));
}

export function getHistory(): string[] {
  return getHistoryForOwner(localAccountId());
}

export function pushHistory(q: string): void {
  pushHistoryForOwner(q, localAccountId());
}

export function removeHistory(q: string): void {
  removeHistoryForOwner(q, localAccountId());
}

export function clearHistory(): void {
  clearHistoryForOwner(localAccountId());
}
