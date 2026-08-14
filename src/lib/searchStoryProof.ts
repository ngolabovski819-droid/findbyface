import type { FinderKind } from './finderComments';

export interface SearchStoryProof {
  token: string;
  nonce: string;
  finder: FinderKind;
  issuedAt: number;
  expiresAt: number;
}

export interface VerifiedSearchStoryProof {
  finder: FinderKind;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

interface ProofPayload {
  v: 1;
  f: FinderKind;
  n: string;
  i: number;
  e: number;
}

const VALID_FINDERS = new Set<FinderKind>(['onlyfans', 'pornstar']);
const DEFAULT_TTL_SECONDS = 60 * 60 * 6;
const MAX_TTL_SECONDS = 60 * 60 * 24;
const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function secret(): Promise<Uint8Array | null> {
  const dedicated = import.meta.env.SEARCH_STORY_SECRET?.trim();
  if (dedicated && encoder.encode(dedicated).byteLength >= 32) return encoder.encode(dedicated);

  // Existing deployments already carry this strong server-only root secret. Derive a
  // purpose-specific subkey so launching Search Stories does not depend on a same-minute
  // Vercel settings change and never reuses the click-token key directly.
  const root = import.meta.env.CLICK_TOKEN_SECRET?.trim();
  if (!root || encoder.encode(root).byteLength < 32) return null;
  const rootKey = await crypto.subtle.importKey(
    'raw', encoder.encode(root), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const derived = await crypto.subtle.sign(
    'HMAC', rootKey, encoder.encode('findbyface/search-story/v1'),
  );
  return new Uint8Array(derived);
}

async function signingKey(value: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', value, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
}

export async function createSearchStoryProof(
  finder: FinderKind,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<SearchStoryProof> {
  if (!VALID_FINDERS.has(finder)) throw new Error('Invalid finder kind');
  const keySecret = await secret();
  if (!keySecret) throw new Error('Search story proof service is unavailable');
  const ttl = Math.max(60, Math.min(MAX_TTL_SECONDS, Math.trunc(ttlSeconds)));
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ttl;
  const nonce = base64Url(crypto.getRandomValues(new Uint8Array(24)));
  const payload: ProofPayload = { v: 1, f: finder, n: nonce, i: issuedAt, e: expiresAt };
  const encodedPayload = base64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(keySecret), encoder.encode(encodedPayload));
  return {
    token: `${encodedPayload}.${base64Url(new Uint8Array(signature))}`,
    nonce,
    finder,
    issuedAt,
    expiresAt,
  };
}

export async function verifySearchStoryProof(
  token: string | null | undefined,
  expectedFinder?: FinderKind,
): Promise<VerifiedSearchStoryProof | null> {
  const keySecret = await secret();
  if (!keySecret || typeof token !== 'string' || token.length > 1_024) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSignature] = parts;
  const payloadBytes = decodeBase64Url(encodedPayload);
  const signature = decodeBase64Url(encodedSignature);
  if (!payloadBytes || !signature || signature.byteLength !== 32) return null;
  try {
    const validSignature = await crypto.subtle.verify(
      'HMAC', await signingKey(keySecret), signature, encoder.encode(encodedPayload),
    );
    if (!validSignature) return null;
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<ProofPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (payload.v !== 1 || !VALID_FINDERS.has(payload.f as FinderKind)) return null;
    if (expectedFinder && payload.f !== expectedFinder) return null;
    if (typeof payload.n !== 'string' || !/^[A-Za-z0-9_-]{24,128}$/.test(payload.n)) return null;
    if (!Number.isSafeInteger(payload.i) || !Number.isSafeInteger(payload.e)) return null;
    if (payload.i! > now + 300 || payload.e! <= now || payload.e! - payload.i! > MAX_TTL_SECONDS) return null;
    return { finder: payload.f!, nonce: payload.n, issuedAt: payload.i!, expiresAt: payload.e! };
  } catch {
    return null;
  }
}
