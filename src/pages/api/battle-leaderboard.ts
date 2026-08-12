// GET /api/battle-leaderboard?scope=users-daily|users-unlimited|creators&limit=50&offset=0
//
// User boards rank battles won (selecting the higher-rated creator before the vote), then
// battles played. The creator board ranks the eligible top-10k pool by current Elo rating.
import type { APIRoute } from 'astro';
import { logBattleError, logBattleEvent } from '../../lib/battleTelemetry';

export const prerender = false;

const SUPABASE_HEADERS = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Accept-Profile': 'public',
  'Content-Type': 'application/json',
});

export const GET: APIRoute = async ({ url }) => {
  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  const scope = url.searchParams.get('scope') ?? 'users-daily';
  const limit = Math.min(Math.max(Math.trunc(Number(url.searchParams.get('limit'))) || 50, 1), 100);
  const offset = Math.min(Math.max(Math.trunc(Number(url.searchParams.get('offset'))) || 0, 0), 10000);

  try {
    if (scope === 'users-daily' || scope === 'users-unlimited') {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_battle_player_leaderboard`, {
        method: 'POST',
        headers: SUPABASE_HEADERS(SUPABASE_KEY),
        body: JSON.stringify({
          board_mode: scope === 'users-daily' ? 'daily' : 'unlimited',
          limit_count: limit,
        }),
      });
      if (!resp.ok) throw new Error(`get_battle_player_leaderboard failed: ${resp.status}`);
      const users = await resp.json();
      logBattleEvent('player_leaderboard_loaded', { scope, rows: users.length });
      return new Response(JSON.stringify({ scope, users }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    if (scope === 'creators') {
      let resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_creator_battle_leaderboard`, {
        method: 'POST',
        headers: SUPABASE_HEADERS(SUPABASE_KEY),
        body: JSON.stringify({ limit_count: limit, offset_count: offset }),
      });

      let legacyFallback = false;
      if (resp.status === 404 && offset < 100) {
        legacyFallback = true;
        resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_creator_battle_leaderboard`, {
          method: 'POST',
          headers: SUPABASE_HEADERS(SUPABASE_KEY),
          body: JSON.stringify({ limit_count: Math.min(offset + limit, 100) }),
        });
      }
      if (!resp.ok) throw new Error(`get_creator_battle_leaderboard failed: ${resp.status}`);
      const rows = await resp.json();
      const creators = legacyFallback ? rows.slice(offset, offset + limit) : rows;
      const nextOffset = offset + creators.length;
      const hasMore = creators.length === limit && nextOffset < (legacyFallback ? 100 : 10000);
      logBattleEvent('creator_leaderboard_loaded', {
        rows: creators.length,
        offset,
        hasMore,
        pagination: legacyFallback ? 'legacy' : 'full',
      });
      return new Response(JSON.stringify({ scope, creators, nextOffset, hasMore }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=60' },
      });
    }

    return new Response(JSON.stringify({
      error: 'scope must be users-daily, users-unlimited, or creators',
    }), { status: 400 });
  } catch (error) {
    logBattleError('leaderboard_load_failed', error, { scope });
    return new Response(JSON.stringify({ error: 'Failed to load leaderboard' }), { status: 500 });
  }
};
