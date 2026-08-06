// Aggregates a client's click log ACROSS THE WHOLE NETWORK, not just findbyface's own table —
// emilylopz (and future clients) run the same paid placement campaign on several sibling
// sites at once (findbyface, fanspedia, onlyamericanfans, onlyaussiefans, ...), each logging
// clicks into its own Supabase table. All of those tables live in the one shared Supabase
// project this app already talks to, so this is still just more raw fetch() calls with the
// same credentials — see src/config/networkClickSources.ts for why the table names and even
// timestamp column names differ per site and can't be derived from a template.
//
// Called from both src/pages/panel/index.astro (SSR, first paint) and
// src/pages/api/panel/stats.ts (kept for parity/future use) — one function, one code path.
import { getSponsorOverride } from '../config/sponsors';
import { networkClickSources, type NetworkClickSource } from '../config/networkClickSources';
import type { CampaignGoal } from '../config/campaignGoals';

export interface PanelStats {
  clientSlug: string;
  hasClickTable: boolean;
  allTimeTotal: number;
  last7: number;
  /** The 7 days before last7 (days 8-14 ago) — the comparison period for a delta indicator. */
  prev7: number;
  last30: number;
  /** The 30 days before last30 (days 31-60 ago) — the comparison period for a delta indicator. */
  prev30: number;
  /** Last 90 days, zero-filled so the trend line has no gaps. Oldest first, today last. Summed across every network site. */
  daily: { date: string; count: number }[];
  /** On-page placement breakdown over the same 90-day window, summed across every site, sorted descending. */
  placements: { label: string; count: number }[];
  /** Which network site delivered the click, same 90-day window, sorted descending. */
  bySite: { site: string; count: number }[];
  recent: { createdAt: string; site: string; placementLabel: string; referrer: string | null }[];
}

const WINDOW_DAYS = 90;
const ROW_CAP = 5000;
const DAY_MS = 86_400_000;

function humanizePlacement(placement: string | null): string {
  if (!placement) return 'Direct / unknown';
  if (placement === 'home') return 'Homepage';
  if (placement === 'search') return 'Search results';
  if (placement === 'dashboard') return 'Dashboard';
  if (placement === 'ai-discover') return 'AI Discover';
  if (placement.startsWith('category:')) return `Category — ${placement.slice('category:'.length)}`;
  if (placement.startsWith('external:')) return `Referral — ${placement.slice('external:'.length)}`;
  if (placement.startsWith('internal:')) return 'Other internal page';
  return placement;
}

// findbyface's own table stays sourced from sponsors.ts (unchanged, still the single source
// of truth for THIS site's table name) — only the other network legs come from the new
// registry, so a campaign's own-site table never has to be duplicated in two places.
function resolveSources(clientSlug: string): NetworkClickSource[] {
  const sources: NetworkClickSource[] = [];
  const ownTable = getSponsorOverride(clientSlug)?.clickTable;
  if (ownTable) sources.push({ site: 'findbyface.org', table: ownTable, timestampColumn: 'created_at' });
  sources.push(...(networkClickSources[clientSlug] ?? []));
  return sources;
}

function emptyStats(clientSlug: string, hasClickTable: boolean): PanelStats {
  return { clientSlug, hasClickTable, allTimeTotal: 0, last7: 0, prev7: 0, last30: 0, prev30: 0, daily: [], placements: [], bySite: [], recent: [] };
}

function supabaseHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Accept-Profile': 'public',
    Prefer: 'count=exact',
  };
}

function parseTotal(resp: Response, fallback: number): number {
  const contentRange = resp.headers.get('Content-Range') ?? '';
  const total = parseInt(contentRange.split('/')[1] ?? '', 10);
  return Number.isFinite(total) ? total : fallback;
}

interface SourceResult {
  site: string;
  allTime: number;
  rows: { createdAt: string; placement: string | null; referrer: string | null }[];
}

// One source's fetch failing (a table not yet migrated on some site, a transient network
// blip) must never take down the whole dashboard — this returns null on any failure and the
// caller just omits that site's contribution rather than erroring the whole page.
async function fetchSource(supabaseUrl: string, supabaseKey: string, source: NetworkClickSource): Promise<SourceResult | null> {
  const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS).toISOString();
  const windowParams = new URLSearchParams({
    select: `${source.timestampColumn},placement,referrer`,
    order: `${source.timestampColumn}.desc`,
    limit: String(ROW_CAP),
    [source.timestampColumn]: `gte.${since}`,
  });

  try {
    const [totalResp, windowResp] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/${source.table}?select=id&limit=1`, { headers: supabaseHeaders(supabaseKey) }),
      fetch(`${supabaseUrl}/rest/v1/${source.table}?${windowParams}`, { headers: supabaseHeaders(supabaseKey) }),
    ]);
    if (!totalResp.ok || !windowResp.ok) return null;

    const allTime = parseTotal(totalResp, 0);
    const rawRows: Record<string, unknown>[] = await windowResp.json();
    const rows = rawRows.map(row => ({
      createdAt: String(row[source.timestampColumn]),
      placement: (row.placement as string | null | undefined) ?? null,
      referrer: (row.referrer as string | null | undefined) ?? null,
    }));
    return { site: source.site, allTime, rows };
  } catch {
    return null;
  }
}

export async function getPanelStats(clientSlug: string, recentLimit = 25): Promise<PanelStats> {
  const sources = resolveSources(clientSlug);
  if (!sources.length) return emptyStats(clientSlug, false);

  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return emptyStats(clientSlug, true);

  const settled = await Promise.all(sources.map(source => fetchSource(SUPABASE_URL, SUPABASE_KEY, source)));
  const results = settled.filter((r): r is SourceResult => r !== null);
  if (!results.length) return emptyStats(clientSlug, true);

  const now = Date.now();
  const last7Since = now - 7 * DAY_MS;
  const prev7Since = now - 14 * DAY_MS;
  const last30Since = now - 30 * DAY_MS;
  const prev30Since = now - 60 * DAY_MS;
  let allTimeTotal = 0;
  let last7 = 0;
  let prev7 = 0;
  let last30 = 0;
  let prev30 = 0;
  const dailyMap = new Map<string, number>();
  const placementMap = new Map<string, number>();
  const siteMap = new Map<string, number>();
  const allRecent: PanelStats['recent'] = [];

  for (const result of results) {
    allTimeTotal += result.allTime;
    siteMap.set(result.site, (siteMap.get(result.site) ?? 0) + result.rows.length);

    for (const row of result.rows) {
      const ts = new Date(row.createdAt).getTime();
      if (Number.isFinite(ts)) {
        if (ts >= last7Since) last7++;
        else if (ts >= prev7Since) prev7++;
        if (ts >= last30Since) last30++;
        else if (ts >= prev30Since) prev30++;
      }
      const day = row.createdAt.slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);

      const placementLabel = humanizePlacement(row.placement);
      placementMap.set(placementLabel, (placementMap.get(placementLabel) ?? 0) + 1);

      allRecent.push({ createdAt: row.createdAt, site: result.site, placementLabel, referrer: row.referrer });
    }
  }

  const daily: { date: string; count: number }[] = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const date = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    daily.push({ date, count: dailyMap.get(date) ?? 0 });
  }

  const placements = [...placementMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const bySite = [...siteMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([site, count]) => ({ site, count }));

  const recent = allRecent
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, recentLimit);

  return { clientSlug, hasClickTable: true, allTimeTotal, last7, prev7, last30, prev30, daily, placements, bySite, recent };
}

// --- Activity log: the FULL history, not the 90-day window getPanelStats() uses for its
// chart/breakdowns. That window is an intentional "recent trend" scope for the dashboard;
// the activity log's whole point is that nothing older silently disappears from it.

export interface ActivityEntry {
  createdAt: string;
  site: string;
  placementLabel: string;
  referrer: string | null;
}

export interface ActivityLog {
  entries: ActivityEntry[];
  hasClickTable: boolean;
  /** True if at least one source may have older rows beyond what was fetched — see the cap note below. */
  truncated: boolean;
}

// Per-source cap, not a total cap. Generous enough that "day one" is genuinely all there for
// any realistic campaign volume today; if a source ever exceeds it, the log still shows that
// source's most recent ACTIVITY_LOG_CAP rows (never silently empties, just trims the oldest
// tail on an extremely high-volume source) and flags `truncated` so that's visible rather than
// silently assumed complete.
const ACTIVITY_LOG_CAP = 2000;

async function fetchAllRows(supabaseUrl: string, supabaseKey: string, source: NetworkClickSource, cap: number) {
  const params = new URLSearchParams({
    select: `${source.timestampColumn},placement,referrer`,
    order: `${source.timestampColumn}.desc`,
    limit: String(cap),
  });
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/${source.table}?${params}`, { headers: supabaseHeaders(supabaseKey) });
    if (!resp.ok) return null;
    const rawRows: Record<string, unknown>[] = await resp.json();
    const rows = rawRows.map(row => ({
      createdAt: String(row[source.timestampColumn]),
      placement: (row.placement as string | null | undefined) ?? null,
      referrer: (row.referrer as string | null | undefined) ?? null,
    }));
    return { rows, hitCap: rows.length >= cap };
  } catch {
    return null;
  }
}

// No date filter at all — every row, from whenever tracking started for this client on each
// site. `limit` caps how many are RETURNED to the caller (for a sane page size); the fetch
// itself still pulls up to ACTIVITY_LOG_CAP per source so a global sort+slice down to `limit`
// is correct (fetching each source's own top-K guarantees the true global top-K is among
// them — a row outside its own source's top-K can't be in the global top-K either, since that
// source alone already supplies K rows newer than it).
export async function getActivityLog(clientSlug: string, limit = ACTIVITY_LOG_CAP): Promise<ActivityLog> {
  const sources = resolveSources(clientSlug);
  if (!sources.length) return { entries: [], hasClickTable: false, truncated: false };

  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return { entries: [], hasClickTable: true, truncated: false };

  const perSourceCap = Math.max(limit, ACTIVITY_LOG_CAP);
  const settled = await Promise.all(sources.map(source => fetchAllRows(SUPABASE_URL, SUPABASE_KEY, source, perSourceCap)));

  let anySourceHitCap = false;
  const all: ActivityEntry[] = [];
  settled.forEach((result, i) => {
    if (!result) return;
    if (result.hitCap) anySourceHitCap = true;
    const site = sources[i].site;
    for (const row of result.rows) {
      all.push({ createdAt: row.createdAt, site, placementLabel: humanizePlacement(row.placement), referrer: row.referrer });
    }
  });

  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const entries = all.slice(0, limit);
  return { entries, hasClickTable: true, truncated: anySourceHitCap && all.length > limit };
}

// --- Goal progress: the commercial deal agreed for a campaign (src/config/campaignGoals.ts),
// measured from the trial's start date onward with NO upper cutoff — a campaign doesn't stop
// producing real results just because day 14 passed, and freezing the count there both hides
// real clicks from "all-time" (confusing on its own) and throws away a good story ("still
// delivering past the trial"). trialDays/clickTarget stay the reference for pace and the
// pass/fail read, but tracking itself runs indefinitely from startDate to now.

export interface GoalProgress {
  clicksSoFar: number;
  clickTarget: number;
  /** Days since the trial started — NOT capped at trialDays; can run past it into "bonus" days. */
  daysElapsed: number;
  trialDays: number;
  daysRemaining: number;
  /** Days tracked beyond the formal trial window — 0 while still inside it. */
  bonusDays: number;
  valueDelivered: number;
  valueTarget: number;
  /** Uncapped — can exceed 100 when the target's been beaten. Use Math.min(100, ...) only where a ring/bar physically requires it. */
  pctOfTarget: number;
  /** Capped at 100 — "how far through the AGREED window", not the open-ended tracking period. */
  pctOfTime: number;
  pace: 'ahead' | 'on-track' | 'behind';
  /** True once the 14 (or however many) agreed days have passed — tracking keeps going regardless. */
  isComplete: boolean;
  /** clicksSoFar - clickTarget — positive once the target's been beaten, used for the "N over target" callout. */
  surplus: number;
  /** Rolls pace + isComplete + surplus into the one state the card actually renders around. */
  status: 'achieved' | 'ahead' | 'on-track' | 'behind' | 'missed';
  /** One point per day since start (including any bonus days), zero-filled, oldest first — powers the mini daily chart. */
  daily: { date: string; count: number }[];
}

// Every row from startDate onward, no upper bound — "now" is implicit (a click can't have a
// timestamp in the future), so there's nothing to gain from an explicit `lt now` filter except
// a sliver of risk that clock skew between computing "now" and the query executing excludes a
// click that landed in between. Capped at 5000 like the other row-fetches in this file.
async function fetchRowsSince(supabaseUrl: string, supabaseKey: string, source: NetworkClickSource, sinceIso: string): Promise<string[]> {
  const params = new URLSearchParams({
    select: source.timestampColumn,
    limit: '5000',
    [source.timestampColumn]: `gte.${sinceIso}`,
  });
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/${source.table}?${params}`, { headers: supabaseHeaders(supabaseKey) });
    if (!resp.ok) return [];
    const rows: Record<string, unknown>[] = await resp.json();
    return rows.map(row => String(row[source.timestampColumn]));
  } catch {
    return [];
  }
}

export async function getGoalProgress(clientSlug: string, goal: CampaignGoal): Promise<GoalProgress | null> {
  const sources = resolveSources(clientSlug);
  if (!sources.length) return null;

  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  const startMs = new Date(`${goal.startDate}T00:00:00Z`).getTime();
  const trialEndMs = startMs + goal.trialDays * DAY_MS;
  const startIso = new Date(startMs).toISOString();

  const rowSets = await Promise.all(sources.map(source => fetchRowsSince(SUPABASE_URL, SUPABASE_KEY, source, startIso)));
  const allTimestamps = rowSets.flat();
  const clicksSoFar = allTimestamps.length;

  const now = Date.now();
  const isComplete = now >= trialEndMs;
  const daysElapsed = Math.max(0, Math.ceil((now - startMs) / DAY_MS));
  const daysRemaining = Math.max(0, goal.trialDays - daysElapsed);
  const bonusDays = Math.max(0, daysElapsed - goal.trialDays);

  const dailyMap = new Map<string, number>();
  for (const ts of allTimestamps) {
    const day = ts.slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }
  const dayCount = Math.max(1, daysElapsed);
  const daily: { date: string; count: number }[] = [];
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(startMs + i * DAY_MS).toISOString().slice(0, 10);
    daily.push({ date, count: dailyMap.get(date) ?? 0 });
  }

  const pctOfTarget = goal.clickTarget > 0 ? (clicksSoFar / goal.clickTarget) * 100 : 0;
  // Capped at the trial window on purpose — pace is "are we on track for the AGREED 14 days",
  // which stops being a meaningful question once those 14 days are behind us.
  const pctOfTime = goal.trialDays > 0 ? (Math.min(daysElapsed, goal.trialDays) / goal.trialDays) * 100 : 0;
  const surplus = clicksSoFar - goal.clickTarget;
  // A few points of slack either side of "exactly on the time-progress line" reads as
  // "on-track" rather than flapping between ahead/behind on tiny day-to-day swings.
  const pace: GoalProgress['pace'] = pctOfTarget >= pctOfTime + 5 ? 'ahead' : pctOfTarget <= pctOfTime - 10 ? 'behind' : 'on-track';
  const status: GoalProgress['status'] = clicksSoFar >= goal.clickTarget ? 'achieved' : (isComplete ? 'missed' : pace);

  return {
    clicksSoFar,
    clickTarget: goal.clickTarget,
    daysElapsed,
    trialDays: goal.trialDays,
    daysRemaining,
    bonusDays,
    valueDelivered: clicksSoFar * goal.ratePerClick,
    valueTarget: goal.clickTarget * goal.ratePerClick,
    pctOfTarget: Math.round(pctOfTarget),
    pctOfTime: Math.round(pctOfTime),
    pace,
    isComplete,
    surplus,
    status,
    daily,
  };
}
