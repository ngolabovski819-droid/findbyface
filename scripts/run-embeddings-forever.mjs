/**
 * run-embeddings-forever.mjs
 * ==========================
 * Supervisor for generate-embeddings.mjs. Keeps the embedder alive across
 * crashes / transient exits so the ~1M-avatar backfill can run unattended.
 *
 *   - Captures the child's stdout/stderr and appends them to logs/embeddings.log
 *     as UTF-8 (Node's default), so the log stays readable — unlike the old
 *     PowerShell-redirected UTF-16 file that couldn't be tailed.
 *   - Child exits 0  → pool drained ("All done"), supervisor stops too.
 *   - Child crashes  → restart after a backoff that grows on repeated fast
 *     failures and resets once a run has lasted a while (i.e. made progress).
 *
 * Does NOT survive a machine reboot on its own — pair with a logon Scheduled
 * Task for that (see the FBFEmbeddings task).
 *
 * Usage:  node scripts/run-embeddings-forever.mjs
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT   = path.join(__dirname, '..');
const SCRIPT = path.join(__dirname, 'generate-embeddings.mjs');
const LOG    = path.join(ROOT, 'logs', 'embeddings.log');

const BASE_DELAY_MS    = 15_000;    // wait after a crash before restarting
const MAX_DELAY_MS     = 5 * 60_000; // cap the backoff at 5 min
const HEALTHY_RUN_MS   = 2 * 60_000; // a run this long counts as "made progress"

fs.mkdirSync(path.dirname(LOG), { recursive: true });
const out = fs.createWriteStream(LOG, { flags: 'a', encoding: 'utf8' });

function stamp(msg) {
  const line = `\n===== [supervisor ${new Date().toISOString()}] ${msg} =====\n`;
  process.stdout.write(line);
  out.write(line);
}

let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { stopping = true; stamp(`${sig} — supervisor exiting`); out.end(() => process.exit(0)); });
}

function runOnce() {
  return new Promise(resolve => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, [SCRIPT], { cwd: ROOT });
    child.stdout.on('data', d => { process.stdout.write(d); out.write(d); });
    child.stderr.on('data', d => { process.stderr.write(d); out.write(d); });
    child.on('exit', (code, signal) => resolve({ code, signal, ranMs: Date.now() - startedAt }));
    child.on('error', err => resolve({ code: -1, signal: null, ranMs: Date.now() - startedAt, err }));
  });
}

(async () => {
  stamp('supervisor start');
  let fails = 0;
  while (!stopping) {
    const { code, signal, ranMs, err } = await runOnce();

    if (code === 0) { stamp('embedder finished cleanly — pool drained. Stopping supervisor.'); break; }

    if (ranMs >= HEALTHY_RUN_MS) fails = 0; // last run made progress; reset backoff
    fails++;
    const delay = Math.min(BASE_DELAY_MS * fails, MAX_DELAY_MS);
    stamp(`embedder exited (code=${code} signal=${signal}${err ? ' err=' + err.message : ''}) after ${Math.round(ranMs/1000)}s — restart #${fails} in ${Math.round(delay/1000)}s`);

    for (let waited = 0; waited < delay && !stopping; waited += 500) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  out.end();
})();
