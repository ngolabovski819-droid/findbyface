// Server-side verification for Cloudflare Turnstile tokens minted by the `cf-turnstile`
// widget on contact.astro, panel/login.astro, and VideoFaceSearch.astro. Shared here instead
// of duplicated per route since all three do the exact same siteverify call.
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(
  token: string | null | undefined,
  secret: string,
  remoteIp?: string | null,
): Promise<boolean> {
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body });
    if (!res.ok) {
      console.error('[turnstile] siteverify HTTP', res.status, await res.text().catch(() => ''));
      return false;
    }
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[]; hostname?: string };
    if (data.success !== true) console.error('[turnstile] siteverify rejected:', JSON.stringify(data));
    return data.success === true;
  } catch (err) {
    console.error('[turnstile] siteverify fetch threw:', err);
    return false;
  }
}
