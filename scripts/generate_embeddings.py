"""
Face Embedding Generator for findbyface.org
============================================
Generates 128-float face embeddings for creator avatars and stores them in Supabase.

Prerequisites:
  pip install face_recognition requests Pillow tqdm python-dotenv

Usage:
  python scripts/generate_embeddings.py

The script fetches creators with avatars but no face_embedding, downloads each
avatar, detects a face, computes the 128-float dlib embedding, and upserts it
back to Supabase.  The same model is used by face-api.js in the browser, so
embeddings are compatible for cosine similarity search.

Before running, ensure the Supabase DB has the vector column:
  See scripts/setup_pgvector.sql for the required SQL.
"""

import os
import sys
import json
import time
import requests
import face_recognition
import numpy as np
from io import BytesIO
from PIL import Image, UnidentifiedImageError
from tqdm import tqdm

# ── Config ──────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
BATCH_SIZE   = 50   # creators per Supabase page
REQUEST_DELAY = 0.3  # seconds between avatar downloads

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_KEY in .env or environment")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Accept-Profile": "public",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# ── Helpers ──────────────────────────────────────────────────────────────────

def fetch_creators_without_embeddings(page: int) -> list[dict]:
    """Fetch a page of creators that have an avatar but no face_embedding."""
    params = {
        "select": "id,username,avatar",
        "avatar": "not.is.null",
        "face_embedding": "is.null",
        "order": "favoritedcount.desc",
        "limit": str(BATCH_SIZE),
        "offset": str(page * BATCH_SIZE),
    }
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    r = requests.get(f"{SUPABASE_URL}/rest/v1/onlyfans_profiles?{qs}", headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()


def proxy_url(avatar_url: str) -> str:
    """Route avatar through images.weserv.nl for resizing (faster detection)."""
    clean = avatar_url.lstrip("https://").lstrip("http://")
    return f"https://images.weserv.nl/?url={clean}&w=320&h=427&fit=cover&output=jpg"


def download_image(url: str) -> np.ndarray | None:
    """Download and convert image to RGB numpy array for face_recognition."""
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "findbyface-embedder/1.0"})
        r.raise_for_status()
        img = Image.open(BytesIO(r.content)).convert("RGB")
        return np.array(img)
    except (requests.RequestException, UnidentifiedImageError, OSError):
        return None


def compute_embedding(img_array: np.ndarray) -> list[float] | None:
    """Detect largest face and return its 128-float dlib embedding."""
    try:
        locations = face_recognition.face_locations(img_array, model="hog")
        if not locations:
            return None
        # Use the largest detected face
        largest = max(locations, key=lambda loc: (loc[2] - loc[0]) * (loc[1] - loc[3]))
        encodings = face_recognition.face_encodings(img_array, [largest])
        if not encodings:
            return None
        return encodings[0].tolist()
    except Exception:
        return None


def store_embedding(creator_id: int, embedding: list[float]) -> bool:
    """Upsert the face_embedding vector for a creator."""
    vector_str = "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"
    payload = {"face_embedding": vector_str}
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/onlyfans_profiles?id=eq.{creator_id}",
        headers=HEADERS,
        json=payload,
        timeout=10,
    )
    return r.status_code in (200, 204)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("findbyface — Face Embedding Generator")
    print(f"Supabase: {SUPABASE_URL}")
    print()

    total_processed = 0
    total_success   = 0
    total_no_face   = 0
    total_error     = 0
    page = 0

    while True:
        creators = fetch_creators_without_embeddings(page)
        if not creators:
            print(f"\nDone! No more creators to process.")
            break

        print(f"\nPage {page + 1}: {len(creators)} creators")
        for c in tqdm(creators, desc="Embedding"):
            creator_id = c["id"]
            username   = c.get("username", "?")
            avatar     = c.get("avatar", "")

            if not avatar or not avatar.startswith("http"):
                total_error += 1
                continue

            img = download_image(proxy_url(avatar))
            if img is None:
                total_error += 1
                time.sleep(REQUEST_DELAY)
                continue

            embedding = compute_embedding(img)
            total_processed += 1

            if embedding is None:
                total_no_face += 1
                # Store a sentinel so we don't retry indefinitely (optional: skip)
            else:
                ok = store_embedding(creator_id, embedding)
                if ok:
                    total_success += 1
                else:
                    total_error += 1

            time.sleep(REQUEST_DELAY)

        page += 1

    print(f"\n{'='*40}")
    print(f"Processed : {total_processed}")
    print(f"Embedded  : {total_success}")
    print(f"No face   : {total_no_face}")
    print(f"Errors    : {total_error}")


if __name__ == "__main__":
    main()
