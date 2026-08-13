/**
 * generate-embeddings.mjs
 * =======================
 * Generates 128-float face embeddings using face-api.js + pure TF.js (no native deps).
 * Fetches creator avatars from Supabase, detects faces, stores embeddings back.
 *
 * Usage:
 *   node scripts/generate-embeddings.mjs
 *
 * Requirements (already installed):
 *   npm install @vladmandic/face-api @tensorflow/tfjs jimp
 *
 * .env must have SUPABASE_URL and SUPABASE_KEY
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load env ──────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BATCH_SIZE   = 20;
const DELAY_MS     = 300;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env');
  process.exit(1);
}

const SB_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Accept-Profile': 'public',
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

// ── Init face-api with WASM backend (no native compilation needed) ────────────
async function initFaceApi() {
  // Load WASM backend and wait for it to be ready
  const tfWasm = await import('@tensorflow/tfjs-backend-wasm');
  const tf     = await import('@tensorflow/tfjs');
  await tf.setBackend('wasm');
  await tf.ready();

  const faceapi = await import('../node_modules/@vladmandic/face-api/dist/face-api.node-wasm.js');

  const modelsDir = path.join(__dirname, '..', 'node_modules', '@vladmandic', 'face-api', 'model');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsDir);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsDir);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsDir);

  console.log('face-api models loaded (WASM backend)');
  return faceapi;
}

// ── Image helpers ─────────────────────────────────────────────────────────────
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'findbyface-embedder/1.0' } }, res => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function proxyUrl(avatar) {
  const clean = avatar.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(clean)}&w=320&h=427&fit=cover&output=jpg`;
}

async function bufferToFaceApiInput(buffer, faceapi) {
  const { Jimp } = await import('jimp');
  const img = await Jimp.fromBuffer(buffer);
  const { width, height } = img.bitmap;
  const data = new Uint8ClampedArray(img.bitmap.data); // RGBA

  // face-api needs an HTMLImageElement-like object; we create a minimal tensor input
  const tf = faceapi.tf;
  // Convert RGBA → RGB tensor [H, W, 3]
  const rgbaT = tf.tensor3d(data, [height, width, 4], 'int32');
  const rgbT  = tf.slice(rgbaT, [0, 0, 0], [-1, -1, 3]);
  rgbaT.dispose();
  return { tensor: rgbT, width, height };
}

async function getDescriptor(buffer, faceapi) {
  const { tensor, width, height } = await bufferToFaceApiInput(buffer, faceapi);
  try {
    // Run detection directly on the tensor
    const input = tensor;
    const detections = await faceapi.detectAllFaces(
      input,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })
    ).withFaceLandmarks().withFaceDescriptors();

    if (!detections || detections.length === 0) return null;

    // Use the largest detected face
    const best = detections.reduce((a, b) => {
      const aArea = a.detection.box.width * a.detection.box.height;
      const bArea = b.detection.box.width * b.detection.box.height;
      return bArea > aArea ? b : a;
    });

    return Array.from(best.descriptor);
  } finally {
    tensor.dispose();
  }
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function fetchBatch(offset) {
  const params = new URLSearchParams({
    select:          'id,username,avatar',
    'avatar':        'not.is.null',
    'face_embedding':'is.null',
    order:           'favoritedcount.desc',
    limit:           String(BATCH_SIZE),
    offset:          String(offset),
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${params}`, {
    headers: SB_HEADERS,
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`);
  return res.json();
}

async function storeEmbedding(id, descriptor) {
  const vectorStr = '[' + descriptor.map(v => v.toFixed(8)).join(',') + ']';
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onlyfans_profiles?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: SB_HEADERS,
      body: JSON.stringify({ face_embedding: vectorStr }),
    }
  );
  return res.status === 200 || res.status === 204;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('findbyface — Face Embedding Generator (Node.js/TF.js)');
  console.log(`Supabase: ${SUPABASE_URL}\n`);

  const faceapi = await initFaceApi();

  let offset = 0, totalOk = 0, totalNoFace = 0, totalErr = 0;

  while (true) {
    const batch = await fetchBatch(offset);
    if (!batch.length) { console.log('\nAll done — no more creators to process.'); break; }

    console.log(`\nBatch offset=${offset} — ${batch.length} creators`);

    for (const c of batch) {
      const { id, username, avatar } = c;
      process.stdout.write(`  ${username} (${id}) ... `);

      if (!avatar?.startsWith('http')) { console.log('skip (no avatar)'); totalErr++; continue; }

      try {
        const buf = await downloadBuffer(proxyUrl(avatar));
        const descriptor = await getDescriptor(buf, faceapi);

        if (!descriptor) {
          console.log('no face');
          totalNoFace++;
        } else {
          await storeEmbedding(id, descriptor);
          console.log(`ok (${descriptor.slice(0,3).map(v=>v.toFixed(3)).join(',')}...)`);
          totalOk++;
        }
      } catch (err) {
        console.log(`error: ${err.message}`);
        totalErr++;
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    }

    offset += BATCH_SIZE;
    console.log(`Progress: stored=${totalOk} no-face=${totalNoFace} errors=${totalErr}`);
  }

  console.log('\n' + '='.repeat(40));
  console.log(`Stored   : ${totalOk}`);
  console.log(`No face  : ${totalNoFace}`);
  console.log(`Errors   : ${totalErr}`);
}

main().catch(err => { console.error(err); process.exit(1); });
