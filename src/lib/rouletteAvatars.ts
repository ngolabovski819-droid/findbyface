// Avatars that power the "searching through faces" roulette animation shown while a search
// runs — shared by UploadBox.astro and VideoFaceSearch.astro so the query isn't duplicated.
// Purely decorative: failures are swallowed and just leave the roulette empty (falls back to
// a static placeholder), never something worth failing a page render over.
import { proxyImg } from '../utils/image';

export async function getRouletteAvatars(
  supabaseUrl: string | undefined,
  supabaseKey: string | undefined,
): Promise<string[]> {
  if (!supabaseUrl || !supabaseKey) return [];
  try {
    const params = new URLSearchParams({
      select: 'avatar',
      avatar: 'not.is.null',
      order: 'favoritedcount.desc',
      limit: '24',
    });
    const resp = await fetch(`${supabaseUrl}/rest/v1/onlyfans_profiles?${params}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Accept-Profile': 'public',
      },
    });
    if (!resp.ok) return [];
    const raw = await resp.json();
    return raw
      .map((r: Record<string, unknown>) => r.avatar as string)
      .filter((a: string) => a?.startsWith('http'))
      .map((a: string) => proxyImg(a, 160, 213));
  } catch {
    return [];
  }
}
