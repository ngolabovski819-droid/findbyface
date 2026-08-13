"""
import_videos.py
=================
Bulk-loads a video catalog (title, source_url, thumbnail_url, ...) into the
`videos` table ahead of face processing. Test-batch tool for the performer
identity subsystem — see scripts/migrations/009_performer_video_identity.sql
and scripts/process_video_faces.py.

Input: a JSON file containing a list of objects:
  [
    {
      "source_url": "https://cdn.example.com/clips/abc123.mp4",
      "title": "Optional title",
      "thumbnail_url": "https://.../thumb.jpg",
      "duration_seconds": 720,
      "external_id": "abc123"
    },
    ...
  ]
Only "source_url" is required. Rows with an "external_id" are upserted
(re-running with the same id won't create duplicates); rows without one are
always inserted fresh, so avoid re-running those without external_id.

Usage:
  python scripts/import_videos.py path/to/videos.json
  python scripts/import_videos.py path/to/videos.json --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

DB_VIDEO_FIELDS = {
    "title",
    "source_url",
    "thumbnail_url",
    "duration_seconds",
    "external_id",
}

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: set SUPABASE_URL and SUPABASE_KEY in .env", file=sys.stderr)
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Accept-Profile": "public",
    "Content-Profile": "public",
    "Content-Type": "application/json",
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("json_path")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with open(args.json_path, "r", encoding="utf-8") as f:
        rows = json.load(f)

    if not isinstance(rows, list):
        print("ERROR: JSON file must contain a list of video objects", file=sys.stderr)
        sys.exit(1)

    with_id = [r for r in rows if r.get("external_id")]
    without_id = [r for r in rows if not r.get("external_id")]

    for r in rows:
        if not r.get("source_url"):
            print(f"ERROR: row missing source_url: {r}", file=sys.stderr)
            sys.exit(1)

    # Catalog collectors may carry ephemeral processing-only fields (for
    # example a signed HLS URL). Never persist those as public video fields.
    rows = [{k: v for k, v in row.items() if k in DB_VIDEO_FIELDS} for row in rows]
    with_id = [r for r in rows if r.get("external_id")]
    without_id = [r for r in rows if not r.get("external_id")]

    print(f"{len(rows)} rows ({len(with_id)} upsertable by external_id, "
          f"{len(without_id)} plain insert)")

    if args.dry_run:
        print("--dry-run: not writing to Supabase")
        return

    if with_id:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/videos?on_conflict=external_id",
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"},
            data=json.dumps(with_id),
            timeout=30,
        )
        if r.status_code >= 300:
            print(f"upsert failed: {r.status_code} {r.text[:300]}", file=sys.stderr)
            sys.exit(1)
        print(f"  upserted {len(r.json())} rows with external_id")

    if without_id:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/videos",
            headers={**HEADERS, "Prefer": "return=representation"},
            data=json.dumps(without_id),
            timeout=30,
        )
        if r.status_code >= 300:
            print(f"insert failed: {r.status_code} {r.text[:300]}", file=sys.stderr)
            sys.exit(1)
        print(f"  inserted {len(r.json())} rows without external_id")


if __name__ == "__main__":
    main()
