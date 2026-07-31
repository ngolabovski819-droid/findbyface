import type { APIRoute } from 'astro';

export const prerender = false;

const CACHE_TTL_MS = 30_000;
let cachedCount: { value: number; timestamp: number } | null = null;

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200
        ? 'public, max-age=15, s-maxage=30, stale-while-revalidate=60'
        : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const GET: APIRoute = async () => {
  if (cachedCount && Date.now() - cachedCount.timestamp < CACHE_TTL_MS) {
    return json({ indexedVideos: cachedCount.value });
  }

  const supabaseUrl = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const supabaseKey = import.meta.env.SUPABASE_KEY || process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return json({ error: 'Video index statistics are unavailable.' }, 503);
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/video_face_processing_runs?select=id&status=eq.completed`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Accept-Profile': 'public',
          Prefer: 'count=exact',
          Range: '0-0',
        },
      },
    );

    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const contentRange = response.headers.get('content-range') ?? '';
    const total = Number(contentRange.split('/').pop());
    if (!Number.isSafeInteger(total) || total < 0) {
      throw new Error('Supabase did not return a valid count.');
    }

    cachedCount = { value: total, timestamp: Date.now() };
    return json({ indexedVideos: total });
  } catch (error) {
    console.error('video-index-stats:', error instanceof Error ? error.message : error);
    return json({ error: 'Video index statistics are unavailable.' }, 502);
  }
};
