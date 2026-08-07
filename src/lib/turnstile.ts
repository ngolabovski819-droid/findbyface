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
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
