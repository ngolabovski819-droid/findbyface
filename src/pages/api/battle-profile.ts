import type { APIRoute } from 'astro';
import { defaultPlayerAvatarStyle, defaultPlayerNickname, getBattleAccountProfile, playerAvatarUrl } from '../../lib/accountProfile';
import { logBattleError, logBattleEvent } from '../../lib/battleTelemetry';
import { extractBearerToken, verifySupabaseUser } from '../../lib/verifyUser';

export const prerender = false;

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function serviceHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Accept-Profile': 'public',
    'Content-Profile': 'public',
    'Content-Type': 'application/json',
  };
}

function avatarStyleFromUrl(avatarUrl: string, fallback: number): number {
  const parsed = Number(new URL(avatarUrl, 'https://findbyface.org').searchParams.get('style'));
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 8 ? parsed : fallback;
}

async function authenticatedContext(request: Request) {
  const supabaseUrl = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const supabaseKey = import.meta.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  const accessToken = extractBearerToken(request);
  const user = await verifySupabaseUser(accessToken, supabaseUrl, supabaseKey);
  if (!user || !accessToken) return null;
  return { supabaseUrl, supabaseKey, accessToken, user };
}

type AuthenticatedContext = NonNullable<Awaited<ReturnType<typeof authenticatedContext>>>;

async function persistBattleProfile(
  context: AuthenticatedContext,
  displayName: string,
  avatarStyle: number,
): Promise<Response> {
  const avatarUrl = playerAvatarUrl(avatarStyle);
  let response = await fetch(`${context.supabaseUrl}/rest/v1/rpc/update_battle_player_profile`, {
    method: 'POST',
    headers: serviceHeaders(context.supabaseKey),
    body: JSON.stringify({
      p_user_id: context.user.id,
      p_display_name: displayName,
      p_avatar_style: avatarStyle,
    }),
  });

  // Keeps local development usable for the few moments between deploying the UI and
  // applying migration 021. The migration adds the permanent uniqueness guarantee.
  if (response.status === 404) {
    response = await fetch(`${context.supabaseUrl}/rest/v1/user_battle_stats?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        ...serviceHeaders(context.supabaseKey),
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        user_id: context.user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
      }),
    });
  }
  return response;
}

export const GET: APIRoute = async ({ request }) => {
  const context = await authenticatedContext(request);
  if (!context) return json({ error: 'Sign in to edit your Battle profile' }, 401);

  const profile = await getBattleAccountProfile(context.supabaseUrl, context.supabaseKey, context.user.id);
  const fallbackStyle = defaultPlayerAvatarStyle(context.user.id);
  const displayName = profile.displayName || defaultPlayerNickname(context.user.id);
  const avatarStyle = avatarStyleFromUrl(profile.avatarUrl, fallbackStyle);

  // Establish one stable identity before the first vote, and repair legacy missing provider
  // images. This prevents a newly created account's nickname/avatar from changing mid-game.
  try {
    const ensureResponse = await persistBattleProfile(context, displayName, avatarStyle);
    if (!ensureResponse.ok) logBattleEvent('player_profile_ensure_unavailable', { status: ensureResponse.status });
  } catch {
    logBattleEvent('player_profile_ensure_unavailable', { status: 0 });
  }

  return json({
    displayName,
    avatarUrl: playerAvatarUrl(avatarStyle),
    avatarStyle,
  });
};

export const POST: APIRoute = async ({ request }) => {
  const context = await authenticatedContext(request);
  if (!context) return json({ error: 'Sign in to edit your Battle profile' }, 401);

  let body: { displayName?: string; avatarStyle?: number };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const displayName = String(body.displayName ?? '').trim().replace(/\s+/g, ' ');
  const avatarStyle = Math.trunc(Number(body.avatarStyle));
  const nicknameLength = Array.from(displayName).length;
  if (nicknameLength < 3 || nicknameLength > 24) {
    return json({ error: 'Nickname must contain 3–24 characters' }, 400);
  }
  if (!/^[\p{L}\p{N} _.-]+$/u.test(displayName)) {
    return json({ error: 'Use letters, numbers, spaces, periods, underscores, or hyphens' }, 400);
  }
  if (!Number.isInteger(avatarStyle) || avatarStyle < 1 || avatarStyle > 8) {
    return json({ error: 'Choose one of the available avatars' }, 400);
  }

  const avatarUrl = playerAvatarUrl(avatarStyle);
  try {
    const response = await persistBattleProfile(context, displayName, avatarStyle);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      if (response.status === 409 || errorText.includes('23505')) {
        return json({ error: 'That nickname is already taken' }, 409);
      }
      throw new Error(`profile update failed: ${response.status}`);
    }

    // Keep login/navigation presentation aligned with the Battle profile. Battle's own
    // database row remains authoritative if the optional auth-metadata sync is unavailable.
    try {
      await fetch(`${context.supabaseUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: context.supabaseKey,
          Authorization: `Bearer ${context.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { full_name: displayName, avatar_url: avatarUrl } }),
      });
    } catch {
      // The saved Battle profile is still complete and will be rehydrated at next login.
    }

    logBattleEvent('player_profile_updated', { avatarStyle });
    return json({ displayName, avatarUrl, avatarStyle });
  } catch (error) {
    logBattleError('player_profile_update_failed', error);
    return json({ error: 'Could not save your player profile' }, 500);
  }
};
