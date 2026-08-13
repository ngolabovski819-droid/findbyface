export type AccountSearchType = 'directory' | 'creator_face' | 'video_face';

export interface AccountSearchHistoryInput {
  clientSearchId: string;
  searchType: AccountSearchType;
  query?: string | null;
  label?: string | null;
  resultCount?: number;
  filters?: Record<string, unknown>;
  results?: Record<string, unknown>[];
  createdAt?: string;
}

export interface AccountSearchHistoryItem extends AccountSearchHistoryInput {
  id: string;
  resultCount: number;
  filters: Record<string, unknown>;
  results: Record<string, unknown>[];
  createdAt: string;
}

interface StoredAccount {
  id?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  [key: string]: unknown;
}

interface AccountHistoryPage {
  items: AccountSearchHistoryItem[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
}

interface FlushResult {
  ok: boolean;
  items: AccountSearchHistoryItem[];
}

const USER_KEY = 'fbf_user';
const OUTBOX_BASE_KEY = 'fbf_search_history_outbox';
const OUTBOX_BATCH_SIZE = 10;

// Refresh and outbox work must never cross account boundaries. The refresh token is
// part of the key as well so a newly established session for the same user cannot be
// overwritten by an older refresh that resolves later.
const refreshPromises = new Map<string, Promise<StoredAccount | null>>();
const flushPromises = new Map<string, Promise<FlushResult>>();

function readStoredAccount(): StoredAccount | null {
  try {
    const value = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return value && typeof value === 'object' ? value as StoredAccount : null;
  } catch {
    return null;
  }
}

export function currentAccountId(): string | null {
  const id = readStoredAccount()?.id;
  return typeof id === 'string' && id ? id : null;
}

/**
 * Returns an account-isolated browser-storage key. Passing null explicitly targets
 * the guest scope; omitting accountId uses the account currently signed in.
 */
export function scopedSearchHistoryKey(base: string, accountId?: string | null): string {
  const owner = accountId === undefined ? currentAccountId() : accountId;
  return `${base}:${owner ? `account:${owner}` : 'guest'}`;
}

function tokenExpiry(accessToken?: string): number {
  if (!accessToken) return 0;
  try {
    const encoded = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded)) as { exp?: number };
    return Number(payload.exp || 0) * 1000;
  } catch {
    return 0;
  }
}

function tokenSubject(accessToken?: string): string | null {
  if (!accessToken) return null;
  try {
    const encoded = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded)) as { sub?: unknown };
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function isCurrentAccount(accountId: string): boolean {
  return currentAccountId() === accountId;
}

async function refreshAccount(account: StoredAccount): Promise<StoredAccount | null> {
  const accountId = typeof account.id === 'string' ? account.id : '';
  const refreshToken = typeof account.refresh_token === 'string' ? account.refresh_token : '';
  if (!accountId || !refreshToken || !isCurrentAccount(accountId)) return null;

  const refreshKey = `${accountId}:${refreshToken}`;
  const existing = refreshPromises.get(refreshKey);
  if (existing) return existing;

  const promise = (async (): Promise<StoredAccount | null> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.access_token || payload.user?.id !== accountId) return null;

      // Re-read immediately before writing. Logging out, switching accounts, or
      // starting a newer session while this request was in flight invalidates it.
      const current = readStoredAccount();
      if (current?.id !== accountId || current.refresh_token !== refreshToken) return null;

      const refreshed: StoredAccount = {
        ...current,
        ...payload.user,
        access_token: payload.access_token,
        refresh_token: payload.refresh_token || refreshToken,
        expires_at: Date.now() + Number(payload.expires_in || 3600) * 1000,
      };
      localStorage.setItem(USER_KEY, JSON.stringify(refreshed));
      return refreshed;
    } catch {
      return null;
    } finally {
      if (refreshPromises.get(refreshKey) === promise) refreshPromises.delete(refreshKey);
    }
  })();

  refreshPromises.set(refreshKey, promise);
  return promise;
}

async function accessToken(account: StoredAccount): Promise<string | null> {
  const accountId = typeof account.id === 'string' ? account.id : '';
  if (!accountId
    || !account.access_token
    || tokenSubject(account.access_token) !== accountId
    || !isCurrentAccount(accountId)) return null;
  const expiresAt = Number(account.expires_at || tokenExpiry(account.access_token));
  if (expiresAt > Date.now() + 60_000) return account.access_token;
  return (await refreshAccount(account))?.access_token || null;
}

async function accountRequest(
  path: string,
  init: RequestInit = {},
  expectedAccountId?: string,
): Promise<Response | null> {
  const account = readStoredAccount();
  const accountId = typeof account?.id === 'string' ? account.id : '';
  if (!account || !accountId || (expectedAccountId && expectedAccountId !== accountId)) return null;

  const token = await accessToken(account);
  if (!token || !isCurrentAccount(accountId)) return null;
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(path, { ...init, headers });
    // A response owned by the prior account/session is never exposed to a new user.
    if (!isCurrentAccount(accountId)) return null;
    if (response.status !== 401) return response;

    // A token can be revoked or expire just before its local timestamp. Refresh once
    // for this exact account/session and retry, while retaining the outbox on failure.
    const current = readStoredAccount();
    if (!current || current.id !== accountId) return null;
    const refreshed = await refreshAccount(current);
    if (!refreshed?.access_token || !isCurrentAccount(accountId)) return null;
    headers.set('Authorization', `Bearer ${refreshed.access_token}`);
    const retry = await fetch(path, { ...init, headers });
    return isCurrentAccount(accountId) ? retry : null;
  } catch {
    return null;
  }
}

async function accountRequestForOwner(
  accountId: string,
  path: string,
  init: RequestInit = {},
): Promise<Response | null> {
  if (!accountId || currentAccountId() !== accountId) return null;
  return accountRequest(path, init, accountId);
}

export function newSearchHistoryId(prefix: AccountSearchType): string {
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}

function outboxKey(accountId: string): string {
  return scopedSearchHistoryKey(OUTBOX_BASE_KEY, accountId);
}

function readOutbox(accountId: string): AccountSearchHistoryInput[] {
  try {
    const value = JSON.parse(localStorage.getItem(outboxKey(accountId)) || '[]');
    return Array.isArray(value)
      ? value.filter(entry => entry && typeof entry === 'object') as AccountSearchHistoryInput[]
      : [];
  } catch {
    return [];
  }
}

function writeOutbox(accountId: string, entries: AccountSearchHistoryInput[]): boolean {
  try {
    if (entries.length) localStorage.setItem(outboxKey(accountId), JSON.stringify(entries));
    else localStorage.removeItem(outboxKey(accountId));
    return true;
  } catch {
    return false;
  }
}

function enqueueOutboxEntries(accountId: string, entries: AccountSearchHistoryInput[]): boolean {
  if (!entries.length || !isCurrentAccount(accountId)) return false;
  const queued = readOutbox(accountId);
  const byClientId = new Map(queued.map(entry => [entry.clientSearchId, entry]));
  const queuedAt = new Date().toISOString();
  entries.forEach(entry => {
    if (!entry?.clientSearchId) return;
    byClientId.set(entry.clientSearchId, {
      ...entry,
      createdAt: entry.createdAt || queuedAt,
    });
  });
  return writeOutbox(accountId, Array.from(byClientId.values()));
}

function removeSentEntries(
  accountId: string,
  sentEntries: AccountSearchHistoryInput[],
): boolean {
  const sentFingerprints = new Map(
    sentEntries.map(entry => [entry.clientSearchId, JSON.stringify(entry)]),
  );
  const remaining = readOutbox(accountId).filter(entry => {
    const sent = sentFingerprints.get(entry.clientSearchId);
    // If the same id was updated during the request, retain the newer value.
    return sent === undefined || JSON.stringify(entry) !== sent;
  });
  return writeOutbox(accountId, remaining);
}

function removeQueuedClientId(accountId: string, clientSearchId: string): boolean {
  return writeOutbox(
    accountId,
    readOutbox(accountId).filter(entry => entry.clientSearchId !== clientSearchId),
  );
}

function removeQueuedType(accountId: string, searchType: AccountSearchType): boolean {
  return writeOutbox(
    accountId,
    readOutbox(accountId).filter(entry => entry.searchType !== searchType),
  );
}

async function flushAccountOutbox(accountId: string): Promise<FlushResult> {
  const existing = flushPromises.get(accountId);
  if (existing) return existing;

  const promise = (async (): Promise<FlushResult> => {
    const savedItems: AccountSearchHistoryItem[] = [];
    while (isCurrentAccount(accountId)) {
      const batch = readOutbox(accountId).slice(0, OUTBOX_BATCH_SIZE);
      if (!batch.length) return { ok: true, items: savedItems };

      const response = await accountRequest('/api/search-history', {
        method: 'POST',
        body: JSON.stringify({ entries: batch }),
      }, accountId);
      if (!response?.ok) return { ok: false, items: savedItems };

      try {
        const payload = await response.json() as { items?: AccountSearchHistoryItem[] };
        if (Array.isArray(payload.items)) savedItems.push(...payload.items);
      } catch {
        // HTTP success is authoritative. A malformed response must not cause the
        // already-saved idempotent batch to remain permanently queued.
      }

      if (!isCurrentAccount(accountId) || !removeSentEntries(accountId, batch)) {
        return { ok: false, items: savedItems };
      }
    }
    return { ok: false, items: savedItems };
  })();

  flushPromises.set(accountId, promise);
  try {
    return await promise;
  } finally {
    if (flushPromises.get(accountId) === promise) flushPromises.delete(accountId);
  }
}

export async function saveAccountSearchHistory(
  entry: AccountSearchHistoryInput,
): Promise<AccountSearchHistoryItem | null> {
  const accountId = currentAccountId();
  return saveAccountSearchHistoryForOwner(accountId, entry);
}

export async function saveAccountSearchHistoryForOwner(
  accountId: string | null,
  entry: AccountSearchHistoryInput,
): Promise<AccountSearchHistoryItem | null> {
  if (!accountId) return null;
  if (currentAccountId() !== accountId) return null;
  if (!enqueueOutboxEntries(accountId, [entry])) {
    // Private-browsing/storage-quota failures should not prevent the server save.
    const response = await accountRequest('/api/search-history', {
      method: 'POST',
      body: JSON.stringify(entry),
    }, accountId);
    if (!response?.ok) return null;
    const payload = await response.json() as { items?: AccountSearchHistoryItem[] };
    return payload.items?.[0] ?? null;
  }
  const flushed = await flushAccountOutbox(accountId);
  if (!flushed.ok) return null;
  return flushed.items.find(item => item.clientSearchId === entry.clientSearchId) ?? null;
}

export async function saveAccountSearchHistoryBatch(
  entries: AccountSearchHistoryInput[],
): Promise<boolean> {
  if (!entries.length) return true;
  const accountId = currentAccountId();
  return saveAccountSearchHistoryBatchForOwner(accountId, entries);
}

export async function saveAccountSearchHistoryBatchForOwner(
  accountId: string | null,
  entries: AccountSearchHistoryInput[],
): Promise<boolean> {
  if (!entries.length) return true;
  if (!accountId) return false;
  if (currentAccountId() !== accountId) return false;
  if (!enqueueOutboxEntries(accountId, entries)) {
    for (let offset = 0; offset < entries.length; offset += OUTBOX_BATCH_SIZE) {
      const response = await accountRequest('/api/search-history', {
        method: 'POST',
        body: JSON.stringify({ entries: entries.slice(offset, offset + OUTBOX_BATCH_SIZE) }),
      }, accountId);
      if (!response?.ok) return false;
    }
    return true;
  }
  return (await flushAccountOutbox(accountId)).ok;
}

export async function loadAccountSearchHistory(options: {
  limit?: number;
  offset?: number;
  type?: AccountSearchType;
  query?: string;
} = {}): Promise<AccountHistoryPage | null> {
  return loadAccountSearchHistoryForOwner(currentAccountId(), options);
}

export async function loadAccountSearchHistoryForOwner(
  accountId: string | null,
  options: {
    limit?: number;
    offset?: number;
    type?: AccountSearchType;
    query?: string;
  } = {},
): Promise<AccountHistoryPage | null> {
  if (!accountId) return null;
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));
  if (options.type) params.set('type', options.type);
  if (options.query) params.set('q', options.query);
  const response = await accountRequestForOwner(accountId, `/api/search-history?${params}`);
  if (!response?.ok) return null;
  return response.json() as Promise<AccountHistoryPage>;
}

export async function deleteAccountSearchHistory(id: string): Promise<boolean> {
  const accountId = currentAccountId();
  return deleteAccountSearchHistoryForOwner(accountId, id);
}

export async function deleteAccountSearchHistoryForOwner(accountId: string | null, id: string): Promise<boolean> {
  if (!accountId) return false;
  const response = await accountRequestForOwner(accountId, `/api/search-history?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return Boolean(response?.ok);
}

export async function deleteAccountSearchHistoryByClientId(clientSearchId: string): Promise<boolean> {
  const accountId = currentAccountId();
  if (!accountId) return false;
  const response = await accountRequest(`/api/search-history?clientSearchId=${encodeURIComponent(clientSearchId)}`, {
    method: 'DELETE',
  }, accountId);
  if (!response?.ok) return false;
  removeQueuedClientId(accountId, clientSearchId);
  return true;
}

export async function deleteAccountDirectoryHistoryByQuery(query: string): Promise<boolean> {
  return deleteAccountDirectoryHistoryByQueryForOwner(currentAccountId(), query);
}

export async function deleteAccountDirectoryHistoryByQueryForOwner(
  accountId: string | null,
  query: string,
): Promise<boolean> {
  const normalized = query.trim().toLocaleLowerCase();
  if (!accountId || !normalized) return false;
  const response = await accountRequestForOwner(accountId, `/api/search-history?query=${encodeURIComponent(query.trim())}`, {
    method: 'DELETE',
  });
  if (!response?.ok) return false;
  writeOutbox(
    accountId,
    readOutbox(accountId).filter(entry => (
      entry.searchType !== 'directory'
      || entry.query?.trim().toLocaleLowerCase() !== normalized
    )),
  );
  return true;
}

export async function clearAccountDirectoryHistory(): Promise<boolean> {
  return clearAccountDirectoryHistoryForOwner(currentAccountId());
}

export async function clearAccountDirectoryHistoryForOwner(accountId: string | null): Promise<boolean> {
  if (!accountId) return false;
  const response = await accountRequestForOwner(accountId, '/api/search-history?all=true&type=directory', { method: 'DELETE' });
  if (!response?.ok) return false;
  removeQueuedType(accountId, 'directory');
  return true;
}

export async function clearAccountSearchHistory(): Promise<boolean> {
  return clearAccountSearchHistoryForOwner(currentAccountId());
}

export async function clearAccountSearchHistoryForOwner(accountId: string | null): Promise<boolean> {
  if (!accountId) return false;
  const response = await accountRequestForOwner(accountId, '/api/search-history?all=true', { method: 'DELETE' });
  if (!response?.ok) return false;
  writeOutbox(accountId, []);
  return true;
}

export function clearCurrentAccountSearchHistoryOutbox(): void {
  const accountId = currentAccountId();
  if (accountId) writeOutbox(accountId, []);
}

/**
 * Flushes only the current account's durable outbox. Despite the retained public
 * name, this never reads or imports the old unscoped `fbf_history`,
 * `fbf_pornstar_history`, or `fbf_search_queries` keys: those could belong to a
 * different person who previously used the same browser.
 */
export async function importBrowserHistoryToAccount(): Promise<boolean> {
  return importBrowserHistoryToAccountForOwner(currentAccountId());
}

export async function importBrowserHistoryToAccountForOwner(accountId: string | null): Promise<boolean> {
  if (!accountId) return false;
  if (currentAccountId() !== accountId) return false;
  // Old releases used unowned keys. They cannot be safely attributed to the
  // current account, so discard them instead of risking cross-account import.
  try {
    localStorage.removeItem('fbf_history');
    localStorage.removeItem('fbf_pornstar_history');
    localStorage.removeItem('fbf_search_queries');
  } catch { /* storage may be unavailable */ }
  return (await flushAccountOutbox(accountId)).ok;
}
