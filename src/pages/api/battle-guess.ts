// POST one Daily or Unlimited preference vote. The submit_guess RPC from migration 018
// atomically records the battle, calculates K=32 Elo movement, updates both creators, and
// updates the authenticated player's battle record and Daily streak.
import type { APIRoute } from 'astro';
import { defaultPlayerAvatarUrl, isPlayerAvatarUrl } from '../../lib/accountProfile';
import { verifySupabaseUser, extractBearerToken } from '../../lib/verifyUser';
import { isBotUserAgent } from '../../lib/botDetection';
import { logBattleError, logBattleEvent } from '../../lib/battleTelemetry';

export const prerender = false;

const SUPABASE_HEADERS = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Accept-Profile': 'public',
  'Content-Type': 'application/json',
});

interface VoteBody {
  mode?: 'daily' | 'unlimited';
  roundIndex?: number;
  leftId?: number;
  rightId?: number;
  selectedId?: number;
  guessedId?: number; // backwards-compatible name used by the first Battle draft
  sponsoredSlot?: boolean;
  access_token?: string;
}

interface BattlePosition {
  performer_id: number;
  rank_position: number;
}

function contentRangeTotal(response: Response): number | null {
  const raw = response.headers.get('content-range');
  if (!raw?.includes('/')) return null;
  const total = Number(raw.split('/').pop());
  return Number.isInteger(total) ? total : null;
}

async function getStatsTablePositions(
  supabaseUrl: string,
  supabaseKey: string,
  performerIds: number[],
): Promise<BattlePosition[] | null> {
  const countResponse = await fetch(
    `${supabaseUrl}/rest/v1/performer_vote_stats?select=performer_id&limit=1`,
    { headers: { ...SUPABASE_HEADERS(supabaseKey), Prefer: 'count=exact' } },
  );

  // This fallback is exact only while the stats table is the seeded top-10K pool. If that
  // invariant ever changes, decline to guess and let migration 020 remain authoritative.
  if (!countResponse.ok || contentRangeTotal(countResponse) !== 10000) return null;

  const statsParams = new URLSearchParams({
    select: 'performer_id,rating,upvotes,total_battles',
    performer_id: `in.(${performerIds.join(',')})`,
  });
  const statsResponse = await fetch(
    `${supabaseUrl}/rest/v1/performer_vote_stats?${statsParams}`,
    { headers: SUPABASE_HEADERS(supabaseKey) },
  );
  if (!statsResponse.ok) return null;
  const stats = await statsResponse.json();
  if (!Array.isArray(stats) || stats.length !== performerIds.length) return null;

  const positions = await Promise.all(stats.map(async (stat: any) => {
    const rating = String(stat.rating);
    const upvotes = Number(stat.upvotes);
    const totalBattles = Number(stat.total_battles);
    const performerId = Number(stat.performer_id);
    const precedingFilter = `(${[
      `rating.gt.${rating}`,
      `and(rating.eq.${rating},upvotes.gt.${upvotes})`,
      `and(rating.eq.${rating},upvotes.eq.${upvotes},total_battles.gt.${totalBattles})`,
      `and(rating.eq.${rating},upvotes.eq.${upvotes},total_battles.eq.${totalBattles},performer_id.lt.${performerId})`,
    ].join(',')})`;
    const rankParams = new URLSearchParams({
      select: 'performer_id',
      or: precedingFilter,
      limit: '1',
    });
    const rankResponse = await fetch(
      `${supabaseUrl}/rest/v1/performer_vote_stats?${rankParams}`,
      { headers: { ...SUPABASE_HEADERS(supabaseKey), Prefer: 'count=exact' } },
    );
    const preceding = rankResponse.ok ? contentRangeTotal(rankResponse) : null;
    if (preceding == null) throw new Error('rank count unavailable');
    return { performer_id: performerId, rank_position: preceding + 1 };
  }));

  return positions;
}

export const POST: APIRoute = async ({ request }) => {
  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  let body: VoteBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });
  }

  const token = extractBearerToken(request, body.access_token);
  const user = await verifySupabaseUser(token, SUPABASE_URL, SUPABASE_KEY);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Sign in to play Battle' }), { status: 401 });
  }

  if (body.mode !== 'daily' && body.mode !== 'unlimited') {
    return new Response(JSON.stringify({ error: 'mode must be "daily" or "unlimited"' }), { status: 400 });
  }

  const leftId = Number(body.leftId);
  const rightId = Number(body.rightId);
  const selectedId = Number(body.selectedId ?? body.guessedId);
  if (!Number.isInteger(leftId)
    || !Number.isInteger(rightId)
    || leftId === rightId
    || !Number.isInteger(selectedId)
    || (selectedId !== leftId && selectedId !== rightId)) {
    return new Response(JSON.stringify({ error: 'The Battle matchup or selection is invalid' }), { status: 400 });
  }
  if (body.mode === 'daily' && !Number.isInteger(body.roundIndex)) {
    return new Response(JSON.stringify({ error: 'roundIndex is required for Daily mode' }), { status: 400 });
  }

  if (isBotUserAgent(request.headers.get('user-agent') ?? '')) {
    logBattleEvent('vote_blocked_bot', { mode: body.mode });
    return new Response(JSON.stringify({ error: 'Unable to record vote' }), { status: 400 });
  }

  // A human cannot reasonably inspect and submit more than five matchups in three seconds.
  // Rate-limit by verified user id; fail open if the protective read itself is unavailable.
  try {
    const since = new Date(Date.now() - 3_000).toISOString();
    const params = new URLSearchParams({
      select: 'id',
      user_id: `eq.${user.id}`,
      created_at: `gte.${since}`,
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/battle_guesses?${params}`, {
      headers: { ...SUPABASE_HEADERS(SUPABASE_KEY), Prefer: 'count=exact', Range: '0-0' },
    });
    if (response.ok) {
      const total = Number(response.headers.get('content-range')?.split('/')[1]);
      if (Number.isFinite(total) && total >= 5) {
        logBattleEvent('vote_rate_limited', { mode: body.mode, recentVotes: total });
        return new Response(JSON.stringify({ error: 'Slow down — try again in a moment' }), { status: 429 });
      }
    }
  } catch {
    // The vote itself remains available if the optional rate-limit lookup fails.
  }

  try {
    // Profile edits are mirrored to Supabase Auth. New accounts receive the same
    // deterministic built-in avatar here without an extra database request per vote.
    const playerAvatar = isPlayerAvatarUrl(user.avatarUrl)
      ? user.avatarUrl
      : defaultPlayerAvatarUrl(user.id);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_guess`, {
      method: 'POST',
      headers: SUPABASE_HEADERS(SUPABASE_KEY),
      body: JSON.stringify({
        p_user_id: user.id,
        p_mode: body.mode,
        p_round_index: body.mode === 'daily' ? body.roundIndex : null,
        p_left_id: leftId,
        p_right_id: rightId,
        p_guessed_id: selectedId,
        p_sponsored_slot: Boolean(body.sponsoredSlot),
        p_avatar_url: playerAvatar,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      if (errorText.includes('duplicate key') || errorText.includes('23505')) {
        return new Response(JSON.stringify({ error: 'You already voted in this round' }), { status: 409 });
      }
      throw new Error(`submit_guess failed: ${response.status} ${errorText}`);
    }

    const [result] = await response.json();
    if (!result) throw new Error('submit_guess returned no result');

    // Rank is evaluated after the Elo transaction, against the same top-10K ordering used
    // by the creator leaderboard. A rank lookup failure must never roll back a valid vote.
    let selectedRank: number | null = null;
    let otherRank: number | null = null;
    let positions: BattlePosition[] = [];
    let rankSource = 'unavailable';
    const performerIds = [Number(result.selected_id), Number(result.other_id)];
    try {
      const rankResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_creator_battle_positions`, {
        method: 'POST',
        headers: SUPABASE_HEADERS(SUPABASE_KEY),
        body: JSON.stringify({ performer_ids: performerIds }),
      });
      if (rankResponse.ok) {
        positions = await rankResponse.json();
        rankSource = 'rpc';
      }
    } catch {
      // The guarded stats fallback below can still provide exact positions.
    }

    if (!Array.isArray(positions) || positions.length !== performerIds.length) {
      try {
        positions = await getStatsTablePositions(SUPABASE_URL, SUPABASE_KEY, performerIds) ?? [];
        if (positions.length === performerIds.length) rankSource = 'stats_fallback';
      } catch {
        positions = [];
      }
    }

    selectedRank = Number(positions.find((row: any) => Number(row.performer_id) === Number(result.selected_id))?.rank_position) || null;
    otherRank = Number(positions.find((row: any) => Number(row.performer_id) === Number(result.other_id))?.rank_position) || null;
    if (selectedRank == null || otherRank == null) {
      rankSource = 'unavailable';
      logBattleEvent('vote_rank_lookup_unavailable', { status: 0 });
    }

    const enrichedResult = {
      ...result,
      selected_rank: selectedRank,
      other_rank: otherRank,
    };
    logBattleEvent('vote_recorded', {
      mode: body.mode,
      battleWon: Boolean(result?.battle_won),
      ratingDelta: Number(result?.rating_delta || 0),
      sponsoredSlot: Boolean(body.sponsoredSlot),
      ranksAvailable: selectedRank != null && otherRank != null,
      rankSource,
    });
    return new Response(JSON.stringify(enrichedResult), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logBattleError('vote_failed', error, { mode: body.mode });
    return new Response(JSON.stringify({ error: 'Failed to record vote' }), { status: 500 });
  }
};
