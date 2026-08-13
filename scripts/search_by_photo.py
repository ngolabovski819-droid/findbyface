"""
search_by_photo.py
===================
CLI test tool for the performer identity subsystem: given a photo, embeds
the largest face with InsightFace (same buffalo_l/ArcFace pipeline used by
process_video_faces.py), runs match_performers, and prints the matching
performer(s) plus the videos they're linked to.

This exists to validate match quality on real data BEFORE building the web
upload flow — the browser's existing face-api.js descriptor (128-D) is not
comparable to these 512-D embeddings, so the live site's query path needs a
separate decision (port to onnxruntime-node vs. a small Python service) once
matching is proven out here.

Usage:
  python scripts/search_by_photo.py path/to/photo.jpg
  python scripts/search_by_photo.py path/to/photo.jpg --match-count 5
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import cv2
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

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


def vector_literal(vec) -> str:
    return "[" + ",".join(f"{float(v):.8f}" for v in vec) + "]"


def embed_photo(path: str):
    from insightface.app import FaceAnalysis
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))

    img = cv2.imread(path)
    if img is None:
        print(f"ERROR: could not read image at {path}", file=sys.stderr)
        sys.exit(1)

    faces = app.get(img)
    if not faces:
        print("No face detected in that photo.")
        sys.exit(1)

    best = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return best.normed_embedding


def match_performers(embedding, match_count: int) -> list[dict]:
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/match_performers",
        headers=HEADERS,
        data=json.dumps({
            "query_embedding": vector_literal(embedding),
            "match_count": match_count,
            "pool_size": max(50, match_count * 10),
        }),
        timeout=20,
    )
    r.raise_for_status()
    return r.json()


def fetch_performer_videos(performer_id: int) -> list[dict]:
    params = (
        f"performer_id=eq.{performer_id}"
        f"&select=video_id,first_seen_seconds,screen_time_seconds,match_confidence,"
        f"videos(title,source_url,thumbnail_url)"
        f"&order=screen_time_seconds.desc"
    )
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/performer_videos?{params}",
        headers=HEADERS, timeout=20,
    )
    r.raise_for_status()
    return r.json()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("photo_path")
    ap.add_argument("--match-count", type=int, default=3, help="how many candidate performers to show")
    args = ap.parse_args()

    print("Embedding query photo ...")
    embedding = embed_photo(args.photo_path)

    print("Searching performer gallery ...")
    matches = match_performers(embedding, args.match_count)

    if not matches:
        print("No performers in the gallery yet — process some videos first.")
        return

    for m in matches:
        pid, sim = m["performer_id"], m["similarity"]
        print(f"\nPerformer {pid} — similarity {sim:.3f}")
        videos = fetch_performer_videos(pid)
        for v in videos:
            vinfo = v.get("videos") or {}
            title = vinfo.get("title") or vinfo.get("source_url")
            link = vinfo.get("source_url")
            ts = v.get("first_seen_seconds")
            print(f"  - {title}  ({link}#t={ts})  screen_time={v.get('screen_time_seconds')}s  conf={v.get('match_confidence'):.3f}")


if __name__ == "__main__":
    main()
