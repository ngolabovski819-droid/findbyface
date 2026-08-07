import type { APIRoute } from 'astro';
import { verifyTurnstileToken } from '../../lib/turnstile';

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  company?: unknown; // honeypot — must stay empty
  turnstileToken?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export const POST: APIRoute = async ({ request }) => {
  let body: ContactPayload;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Honeypot: bots fill hidden fields. Pretend success, do nothing.
  if (clean(body.company, 100) !== '') {
    return json({ ok: true });
  }

  const TURNSTILE_SECRET_KEY = import.meta.env.TURNSTILE_SECRET_KEY;
  if (TURNSTILE_SECRET_KEY) {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken : null;
    const humanVerified = await verifyTurnstileToken(turnstileToken, TURNSTILE_SECRET_KEY, clientIp);
    if (!humanVerified) {
      return json({ error: 'Verification failed. Please try again.' }, 400);
    }
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const subject = clean(body.subject, 160);
  const message = clean(body.message, 5000);

  if (!name || !email || !message) {
    return json({ error: 'Please fill in your name, email, and message.' }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }
  if (message.length < 10) {
    return json({ error: 'Your message is too short.' }, 400);
  }

  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return json({ error: 'Contact service is not configured.' }, 500);
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        name,
        email,
        subject: subject || '(no subject)',
        message,
        created_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('contact insert failed', res.status, detail);
      return json({ error: 'Could not send your message. Please try again later.' }, 502);
    }
  } catch (err) {
    console.error('contact insert error', err);
    return json({ error: 'Could not send your message. Please try again later.' }, 502);
  }

  return json({ ok: true });
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
