/**
 * provision_panel_user.mjs
 * =========================
 * Creates (or updates) a Supabase Auth user for the panel.findbyface.org client portal.
 * Accounts created this way are pre-confirmed (email_confirm: true) — Supabase never sends a
 * confirmation email, so the address doesn't need to be a real, receivable inbox. It's just a
 * login identifier tagged with panel_role/client_slugs metadata that src/lib/panelAuth.ts checks.
 *
 * Usage:
 *   node scripts/provision_panel_user.mjs --email=admin@findbyface.org --role=admin --name="Nick"
 *   node scripts/provision_panel_user.mjs --email=bernard.client@findbyface.org --role=guest --client=emilylopz --name="Bernard"
 *   node scripts/provision_panel_user.mjs --email=bernard.client@findbyface.org --role=guest --client=emilylopz,secondmodel --name="Bernard"
 *   node scripts/provision_panel_user.mjs --email=old.login@findbyface.org --delete
 *
 * Flags:
 *   --email     required
 *   --role      required unless --delete — "admin" or "guest"
 *   --client    required when --role=guest — one slug, or a comma-separated list, from
 *               src/config/panelClients.ts. A guest can own more than one model (an agency
 *               running several creators) — re-running this with a new --client value REPLACES
 *               the account's full set, it does not add to it, so always pass every slug the
 *               account should have.
 *   --name      optional display name (defaults to the email's local part)
 *   --password  optional — a strong password is generated and printed if omitted
 *   --delete    revokes access by deleting the account outright — ignores --role/--client/
 *               --name/--password. Use this to fully retire a login (e.g. one superseded by a
 *               better-named replacement), not just to change what it can see.
 *
 * .env must have SUPABASE_URL and SUPABASE_KEY (service role key — this calls the Admin API).
 *
 * If the email already exists (e.g. re-running to change role/client), the script does NOT
 * overwrite that account's password unless --password was explicitly passed — it only merges
 * the panel_role/client_slugs/name fields into whatever user_metadata already exists there.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const withValue = arg.match(/^--([a-zA-Z]+)=(.*)$/);
    if (withValue) { args[withValue[1]] = withValue[2]; continue; }
    const bareFlag = arg.match(/^--([a-zA-Z]+)$/);
    if (bareFlag) args[bareFlag[1]] = true;
  }
  return args;
}

function generatePassword(length = 18) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function supaFetch(pathAndQuery, options = {}) {
  return fetch(`${SUPABASE_URL}${pathAndQuery}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

// There is no server-side email filter on the Admin "list users" endpoint (only page/per_page
// pagination), and auth.users is shared with every real consumer signup on this site — so this
// is a bounded fallback, not the primary path. The primary path is always "try to create it".
async function findUserByEmail(email) {
  const target = email.toLowerCase();
  const perPage = 200;
  const MAX_PAGES = 20;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const resp = await supaFetch(`/auth/v1/admin/users?page=${page}&per_page=${perPage}`);
    if (!resp.ok) return null;
    const payload = await resp.json();
    const users = payload.users || (Array.isArray(payload) ? payload : []);
    const found = users.find(u => (u.email || '').toLowerCase() === target);
    if (found) return found;
    if (users.length < perPage) return null; // reached the last page
  }
  return null;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_KEY in .env');
    process.exit(1);
  }

  const args = parseArgs();
  const email = args.email?.trim().toLowerCase();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error('Usage: --email=<email> --role=admin|guest [--client=<slug>[,<slug>...]] [--name="..."] [--password=...]');
    console.error('   or: --email=<email> --delete');
    process.exit(1);
  }

  if (args.delete) {
    const existing = await findUserByEmail(email);
    if (!existing) {
      console.error(`No panel user found for ${email} — nothing to delete.`);
      process.exit(1);
    }
    const deleteResp = await supaFetch(`/auth/v1/admin/users/${existing.id}`, { method: 'DELETE' });
    if (!deleteResp.ok) {
      console.error(`Failed to delete ${email}: ${await deleteResp.text()}`);
      process.exit(1);
    }
    console.log(`Deleted ${email} — that login no longer works.`);
    return;
  }

  const role = args.role;
  const clientSlugs = args.client ? args.client.split(',').map(s => s.trim()).filter(Boolean) : [];
  const name = args.name || email?.split('@')[0];
  const password = args.password || generatePassword();

  if (role !== 'admin' && role !== 'guest') {
    console.error('--role must be "admin" or "guest"');
    process.exit(1);
  }
  if (role === 'guest' && clientSlugs.length === 0) {
    console.error('--client=<slug>[,<slug>...] is required for role=guest');
    process.exit(1);
  }

  const user_metadata = { panel_role: role, client_slugs: clientSlugs, name };

  const createResp = await supaFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata }),
  });

  let passwordWasSet = true;

  if (createResp.ok) {
    console.log('Created a new panel user.');
  } else {
    const createErrorBody = await createResp.text();
    console.log(`Create returned ${createResp.status} — assuming this email already exists, looking it up to update instead...`);
    const existing = await findUserByEmail(email);
    if (!existing) {
      console.error('Could not create the user AND could not find an existing one with this email within the lookup bound.');
      console.error(`Original create error: ${createErrorBody}`);
      process.exit(1);
    }

    const mergedMetadata = { ...(existing.user_metadata || {}), ...user_metadata };
    const updateBody = { user_metadata: mergedMetadata };
    if (args.password) updateBody.password = password; // only touch password if explicitly requested
    else passwordWasSet = false;

    const updateResp = await supaFetch(`/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify(updateBody),
    });
    if (!updateResp.ok) {
      console.error(`Failed to update existing user: ${await updateResp.text()}`);
      process.exit(1);
    }
    console.log(`Updated the existing account for ${email} — merged panel_role=${role}${clientSlugs.length ? `, client_slugs=${clientSlugs.join(',')}` : ''} into it.`);
  }

  console.log('');
  console.log('=== Panel login credentials ===');
  console.log(`Email:    ${email}`);
  console.log(passwordWasSet ? `Password: ${password}` : 'Password: (unchanged — existing account, no --password given)');
  console.log(`Role:     ${role}${clientSlugs.length ? ` (models: ${clientSlugs.join(', ')})` : ''}`);
  console.log('================================');
}

main();
