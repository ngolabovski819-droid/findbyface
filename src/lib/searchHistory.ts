// Recent-search-terms storage, shared by every search bar on the site (currently the
// homepage hero mini-form and the dedicated /onlyfans-search page). Case-insensitive
// dedupe: searching "Blonde" then "blonde" keeps one entry, newest wins.
const HISTORY_KEY = 'fbf_search_queries';
const MAX_HISTORY = 8;

export function getHistory(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function pushHistory(q: string): void {
  const trimmed = q.trim();
  if (!trimmed) return;
  const key = trimmed.toLowerCase();
  const list = getHistory().filter(s => s.toLowerCase() !== key);
  list.unshift(trimmed);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

export function removeHistory(q: string): void {
  const list = getHistory().filter(s => s !== q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
