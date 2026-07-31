import type { APIRoute } from 'astro';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

export const prerender = false;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const SEARCH_TIMEOUT_MS = 60_000;
const ALLOWED_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

type SearchPayload = {
  ok: boolean;
  code?: string;
  error?: string;
  [key: string]: unknown;
};

function json(payload: SearchPayload, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function selectPython(root: string): string {
  if (process.env.VIDEO_FACE_PYTHON) return process.env.VIDEO_FACE_PYTHON;
  const candidates = process.platform === 'win32'
    ? [
        join(root, '.venv312', 'Scripts', 'python.exe'),
        join(root, '.venv', 'Scripts', 'python.exe'),
      ]
    : [
        join(root, '.venv312', 'bin', 'python'),
        join(root, '.venv', 'bin', 'python'),
      ];
  return candidates.find(existsSync) ?? (process.platform === 'win32' ? 'python' : 'python3');
}

function runMatcher(root: string, imagePath: string): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const python = selectPython(root);
    const script = join(root, 'scripts', 'search_video_faces_supabase.py');
    const child = spawn(python, [script, '--image', imagePath], {
      cwd: root,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let outputBytes = 0;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, SEARCH_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_OUTPUT_BYTES) {
        child.kill();
        return;
      }
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_OUTPUT_BYTES) {
        child.kill();
        return;
      }
      stderr += chunk.toString('utf8');
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error('Face search timed out after 60 seconds.'));
        return;
      }
      if (outputBytes > MAX_OUTPUT_BYTES) {
        reject(new Error('Face search produced too much output.'));
        return;
      }
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

function parseMatcherPayload(stdout: string): SearchPayload {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]) as SearchPayload;
    } catch {
      // InsightFace dependencies can print startup diagnostics; keep looking.
    }
  }
  throw new Error('The face matcher returned no valid JSON response.');
}

export const POST: APIRoute = async ({ request }) => {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) {
    return json({ ok: false, code: 'file_too_large', error: 'Use an image smaller than 8 MB.' }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, code: 'invalid_form', error: 'Could not read the uploaded image.' }, 400);
  }

  const image = form.get('image');
  if (!(image instanceof File)) {
    return json({ ok: false, code: 'missing_image', error: 'Choose an image to search.' }, 400);
  }
  if (image.size === 0 || image.size > MAX_UPLOAD_BYTES) {
    return json({ ok: false, code: 'file_too_large', error: 'Use an image between 1 byte and 8 MB.' }, 413);
  }
  const extension = ALLOWED_TYPES.get(image.type);
  if (!extension) {
    return json({ ok: false, code: 'unsupported_type', error: 'Use a JPEG, PNG, or WebP image.' }, 415);
  }

  const root = process.cwd();
  const uploadDirectory = await mkdtemp(join(tmpdir(), 'findbyface-query-'));
  const safeExtension = extension || extname(image.name).toLowerCase();
  const imagePath = join(uploadDirectory, `query${safeExtension}`);

  try {
    await writeFile(imagePath, Buffer.from(await image.arrayBuffer()));
    const execution = await runMatcher(root, imagePath);
    const payload = parseMatcherPayload(execution.stdout);
    if (!payload.ok) {
      const status = payload.code === 'invalid_image' ? 422 : 500;
      return json(payload, status);
    }
    if (execution.exitCode !== 0) {
      return json(
        { ok: false, code: 'search_failed', error: 'The local face matcher failed.' },
        500,
      );
    }
    return json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown local search error.';
    console.error('video-face-search:', message);
    return json(
      {
        ok: false,
        code: 'search_failed',
        error: 'Video face search is unavailable. Check the Python environment and Supabase index.',
      },
      500,
    );
  } finally {
    await rm(uploadDirectory, { recursive: true, force: true });
  }
};
