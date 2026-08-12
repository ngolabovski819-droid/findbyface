// GET the next Unlimited Battle pair from the first-phase pool: the top 10,000 profiles by
// favoritedcount. A sponsored creator may receive extra exposure only when they are already
// inside that same pool; sponsorship never changes Elo or expands eligibility.
import type { APIRoute } from 'astro';
import { verifySupabaseUser, extractBearerToken } from '../../lib/verifyUser';
import { getPlacement } from '../../config/placements';
import { logBattleError, logBattleEvent } from '../../lib/battleTelemetry';

export const prerender = false;

const SUPABASE_HEADERS = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Accept-Profile': 'public',
  'Content-Type': 'application/json',
});

// Frequent enough to create useful exposure without overwhelming the organic game loop.
const SPONSOR_SLOT_RATE = 0.2;

interface Candidate {
  id: number;
  username: string;
  name: string | null;
  avatar: string | null;
  sponsored?: true;
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
    const pairResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_unlimited_pair`, {
      method: 'POST',
      headers: SUPABASE_HEADERS(SUPABASE_KEY),
      body: JSON.stringify({}),
    });
    if (!pairResp.ok) throw new Error(`get_unlimited_pair failed: ${pairResp.status}`);

    const rows: Candidate[] = await pairResp.json();
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: 'Not enough profiles to play yet' }), { status: 503 });
    }
    let [left, right]: Candidate[] = rows;

    const { pinned } = getPlacement('battle');
    let sponsoredSlot = false;
    if (pinned.length && Math.random() < SPONSOR_SLOT_RATE) {
      const pick = pinned[Math.floor(Math.random() * pinned.length)];
      const sponsoredResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_eligible_battle_creator`, {
        method: 'POST',
        headers: SUPABASE_HEADERS(SUPABASE_KEY),
        body: JSON.stringify({ target_username: pick.username }),
      });
      const sponsoredRows: Candidate[] = sponsoredResp.ok ? await sponsoredResp.json() : [];
      const sponsoredRow = sponsoredRows[0];

      if (sponsoredRow && sponsoredRow.id !== left.id && sponsoredRow.id !== right.id) {
        right = {
          id: sponsoredRow.id,
          username: sponsoredRow.username,
          name: sponsoredRow.name,
          avatar: sponsoredRow.avatar,
          sponsored: true,
        };
        sponsoredSlot = true;
      }
    }

    logBattleEvent('unlimited_pair_loaded', { sponsoredSlot });
    return new Response(JSON.stringify({ left, right, sponsoredSlot }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logBattleError('unlimited_pair_failed', error);
    return new Response(JSON.stringify({ error: 'Failed to load next pair' }), { status: 500 });
  }
};
