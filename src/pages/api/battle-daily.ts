// GET today's three shared Battle matchups plus the signed-in player's completed rounds,
// lifetime participation stats, and the site's live one-hour vote count.
//
// There is deliberately no answer or creator rating in this response. Ratings stay hidden
// until after a vote so the player must choose from preference/instinct rather than simply
// clicking the visible favorite.
import type { APIRoute } from 'astro';
import { verifySupabaseUser, extractBearerToken } from '../../lib/verifyUser';
import { logBattleError, logBattleEvent } from '../../lib/battleTelemetry';

export const prerender = false;

const SUPABASE_HEADERS = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Accept-Profile': 'public',
  'Content-Type': 'application/json',
});

interface DailyRoundRow {
  battle_date: string;
  round_index: number;
  left_id: number;
  left_username: string;
  left_name: string | null;
  left_avatar: string | null;
  right_id: number;
  right_username: string;
  right_name: string | null;
  right_avatar: string | null;
}

interface AnsweredRow {
  round_index: number;
  guessed_id: number;
  rating_delta: number | null;
  battle_won: boolean | null;
}

function countFromContentRange(value: string | null): number {
  const total = value?.split('/')[1];
  return total && total !== '*' ? Number(total) || 0 : 0;
}

export const GET: APIRoute = async ({ request }) => {
  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  const token = extractBearerToken(request);
  const user = await verifySupabaseUser(token, SUPABASE_URL, SUPABASE_KEY);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Sign in to play Battle' }), { status: 401 });
  }

  try {
    const roundsResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_or_create_daily_rounds`, {
      method: 'POST',
      headers: SUPABASE_HEADERS(SUPABASE_KEY),
      body: JSON.stringify({}),
    });
    if (!roundsResp.ok) throw new Error(`get_or_create_daily_rounds failed: ${roundsResp.status}`);

    const rounds: DailyRoundRow[] = await roundsResp.json();
    if (!rounds.length) {
      return new Response(JSON.stringify({ error: 'Not enough profiles to build today’s rounds yet' }), { status: 503 });
    }
    const battleDate = rounds[0].battle_date;

    const answeredParams = new URLSearchParams({
      select: 'round_index,guessed_id,rating_delta,battle_won',
      user_id: `eq.${user.id}`,
      battle_date: `eq.${battleDate}`,
      mode: 'eq.daily',
    });
    const statsParams = new URLSearchParams({
      select: 'total_battles,daily_battles,unlimited_battles,total_battles_won,daily_battles_won,unlimited_battles_won,current_streak_days,best_streak_days',
      user_id: `eq.${user.id}`,
    });
    const activityParams = new URLSearchParams({
      select: 'id',
      created_at: `gte.${new Date(Date.now() - 3_600_000).toISOString()}`,
    });

    const [answeredResp, statsResp, activityResp] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/battle_guesses?${answeredParams}`, {
        headers: SUPABASE_HEADERS(SUPABASE_KEY),
      }),
      fetch(`${SUPABASE_URL}/rest/v1/user_battle_stats?${statsParams}`, {
        headers: SUPABASE_HEADERS(SUPABASE_KEY),
      }),
      fetch(`${SUPABASE_URL}/rest/v1/battle_guesses?${activityParams}`, {
        headers: {
          ...SUPABASE_HEADERS(SUPABASE_KEY),
          Prefer: 'count=exact',
          Range: '0-0',
        },
      }),
    ]);

    const answered: AnsweredRow[] = answeredResp.ok ? await answeredResp.json() : [];
    const answeredByRound = new Map(answered.map((answer) => [answer.round_index, answer]));
    const statsRows = statsResp.ok ? await statsResp.json() : [];
    const stats = statsRows[0] ?? {
      total_battles: 0,
      daily_battles: 0,
      unlimited_battles: 0,
      total_battles_won: 0,
      daily_battles_won: 0,
      unlimited_battles_won: 0,
      current_streak_days: 0,
      best_streak_days: 0,
    };

    const payload = {
      date: battleDate,
      rounds: rounds.map((round) => {
        const answer = answeredByRound.get(round.round_index);
        return {
          roundIndex: round.round_index,
          left: {
            id: round.left_id,
            username: round.left_username,
            name: round.left_name,
            avatar: round.left_avatar,
          },
          right: {
            id: round.right_id,
            username: round.right_username,
            name: round.right_name,
            avatar: round.right_avatar,
          },
          answered: Boolean(answer),
          guessedId: answer?.guessed_id ?? null,
          ratingDelta: answer?.rating_delta ?? null,
          battleWon: answer?.battle_won ?? null,
        };
      }),
      stats,
      votesThisHour: activityResp.ok
        ? countFromContentRange(activityResp.headers.get('content-range'))
        : 0,
    };

    logBattleEvent('daily_loaded', {
      rounds: rounds.length,
      completedRounds: answered.length,
      votesThisHour: payload.votesThisHour,
    });

    return new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logBattleError('daily_load_failed', error);
    return new Response(JSON.stringify({ error: 'Failed to load today’s rounds' }), { status: 500 });
  }
};
