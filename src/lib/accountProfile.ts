export const PLAYER_AVATAR_STYLES = 8;

function playerSeedHash(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function defaultPlayerAvatarStyle(seed: string): number {
  const uuidHex = seed.replace(/-/g, '');
  if (/^[a-f\d]{32}$/i.test(uuidHex)) return Number.parseInt(uuidHex.slice(0, 2), 16) % PLAYER_AVATAR_STYLES + 1;
  return playerSeedHash(seed) % PLAYER_AVATAR_STYLES + 1;
}

export function playerAvatarUrl(style: number): string {
  const safeStyle = Number.isInteger(style) && style >= 1 && style <= PLAYER_AVATAR_STYLES ? style : 1;
  return `/api/player-avatar?style=${safeStyle}`;
}

export function defaultPlayerAvatarUrl(seed: string): string {
  return playerAvatarUrl(defaultPlayerAvatarStyle(seed));
}

export function defaultPlayerNickname(seed: string): string {
  const adjectives = ['Bold', 'Bright', 'Clever', 'Cosmic', 'Daring', 'Lucky', 'Mighty', 'Swift'];
  const mascots = ['Falcon', 'Fox', 'Lynx', 'Orca', 'Panda', 'Raven', 'Tiger', 'Wolf'];
  const hash = playerSeedHash(seed);
  const suffix = seed.replace(/[^a-f\d]/gi, '').slice(-8).toUpperCase() || hash.toString(16).toUpperCase().padStart(8, '0');
  return `${adjectives[hash % adjectives.length]} ${mascots[(hash >>> 5) % mascots.length]} ${suffix}`;
}

export function isPlayerAvatarUrl(value: unknown): value is string {
  return typeof value === 'string' && /^\/api\/player-avatar\?style=[1-8]$/.test(value);
}

export interface BattleAccountProfile {
  displayName: string | null;
  avatarUrl: string;
}

export async function getBattleAccountProfile(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
): Promise<BattleAccountProfile> {
  const fallback: BattleAccountProfile = {
    displayName: null,
    avatarUrl: defaultPlayerAvatarUrl(userId),
  };

  try {
    const params = new URLSearchParams({
      select: 'display_name,avatar_url',
      user_id: `eq.${userId}`,
      limit: '1',
    });
    const response = await fetch(`${supabaseUrl}/rest/v1/user_battle_stats?${params}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Accept-Profile': 'public',
      },
    });
    if (!response.ok) return fallback;
    const [profile] = await response.json();
    if (!profile) return fallback;
    return {
      displayName: typeof profile.display_name === 'string' ? profile.display_name : null,
      avatarUrl: isPlayerAvatarUrl(profile.avatar_url) ? profile.avatar_url : fallback.avatarUrl,
    };
  } catch {
    return fallback;
  }
}
