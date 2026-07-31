"""
Embed one uploaded query image and search Supabase's direct video-face index.

The query image is never uploaded to Supabase. Only its in-memory embedding is
sent to the match_video_faces RPC.
"""
from __future__ import annotations

import argparse
import contextlib
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import cv2
import numpy as np
import requests
from pornhub_api import PornhubApi

from process_video_faces import get_app, vector_literal

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
DEFAULT_THRESHOLD = 0.324
DEFAULT_RESULT_LIMIT = 50
MAX_RESULT_LIMIT = 50
MAX_IMAGE_PIXELS = 20_000_000
THUMBNAIL_EXPIRY_MARGIN_SECONDS = 5 * 60
THUMBNAIL_REFRESH_WORKERS = 6


class InputError(ValueError):
    pass


def normalize(vector: np.ndarray) -> np.ndarray:
    value = np.asarray(vector, dtype=np.float32).reshape(-1)
    norm = float(np.linalg.norm(value))
    if value.size != 512 or not np.isfinite(value).all() or norm <= 0:
        raise RuntimeError("model returned an invalid face embedding")
    return value / norm


def embed_query(image_path: Path) -> np.ndarray:
    image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if image is None:
        raise InputError("The uploaded file could not be decoded as an image.")
    height, width = image.shape[:2]
    if height * width > MAX_IMAGE_PIXELS:
        raise InputError("The image is too large. Use an image under 20 megapixels.")

    with contextlib.redirect_stdout(sys.stderr):
        faces = get_app().get(image)
    if not faces:
        raise InputError(
            "No face was detected. Try a sharper, front-facing photo with good light."
        )
    if len(faces) > 1:
        raise InputError(
            "Multiple faces were detected. Crop the image to one performer and try again."
        )
    return normalize(faces[0].normed_embedding)


def supabase_headers() -> dict[str, str]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY are required")
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept-Profile": "public",
        "Content-Profile": "public",
        "Content-Type": "application/json",
    }


def indexed_video_count(headers: dict[str, str]) -> int:
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/video_face_processing_runs",
        params={"select": "id", "status": "eq.completed"},
        headers={**headers, "Prefer": "count=exact", "Range": "0-0"},
        timeout=20,
    )
    response.raise_for_status()
    content_range = response.headers.get("Content-Range", "0-0/0")
    try:
        return int(content_range.rsplit("/", 1)[1])
    except (ValueError, IndexError):
        return len(response.json())


def thumbnail_expiry(url: str | None) -> int | None:
    if not url:
        return None
    try:
        query = parse_qs(urlparse(url).query)
    except ValueError:
        return None
    for key in ("validto", "exp"):
        value = query.get(key, [None])[0]
        if value and value.isdigit():
            return int(value)
    token = query.get("hdnea", [""])[0]
    match = re.search(r"(?:^|~)exp=(\d+)(?:~|$)", token)
    return int(match.group(1)) if match else None


def thumbnail_needs_refresh(url: str | None) -> bool:
    if not url or not url.startswith("https://"):
        return True
    expiry = thumbnail_expiry(url)
    return (
        expiry is not None
        and expiry <= int(time.time()) + THUMBNAIL_EXPIRY_MARGIN_SECONDS
    )


def fetch_fresh_thumbnail(external_id: str) -> str | None:
    prefix = "pornhub:"
    if not external_id.startswith(prefix):
        return None
    result = PornhubApi().video.get_by_id(external_id.removeprefix(prefix))
    video = getattr(result, "__root__", None)
    if video is None:
        return None
    for value in (getattr(video, "thumb", None), getattr(video, "default_thumb", None)):
        if value:
            return str(value)
    return None


def refresh_expired_thumbnails(
    results: list[dict],
    headers: dict[str, str],
) -> None:
    targets = [
        (index, result)
        for index, result in enumerate(results)
        if thumbnail_needs_refresh(result.get("thumbnailUrl"))
    ]
    if not targets:
        return

    refreshed: list[tuple[dict, str]] = []
    with ThreadPoolExecutor(
        max_workers=min(THUMBNAIL_REFRESH_WORKERS, len(targets))
    ) as executor:
        futures = {
            executor.submit(fetch_fresh_thumbnail, result["externalId"]): (index, result)
            for index, result in targets
        }
        for future in as_completed(futures):
            _, result = futures[future]
            try:
                thumbnail_url = future.result()
            except Exception as error:
                print(
                    f"thumbnail refresh failed for {result['externalId']}: {error}",
                    file=sys.stderr,
                )
                continue
            if not thumbnail_url:
                continue
            result["thumbnailUrl"] = thumbnail_url
            refreshed.append((result, thumbnail_url))

    for result, thumbnail_url in refreshed:
        try:
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/videos",
                params={"id": f"eq.{result['videoId']}"},
                headers={**headers, "Prefer": "return=minimal"},
                json={"thumbnail_url": thumbnail_url},
                timeout=10,
            )
            response.raise_for_status()
        except requests.RequestException as error:
            print(
                f"thumbnail cache update failed for {result['externalId']}: {error}",
                file=sys.stderr,
            )


def search(
    query: np.ndarray,
    threshold: float,
    limit: int,
) -> tuple[list[dict], int]:
    headers = supabase_headers()
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/match_video_faces",
        headers=headers,
        data=json.dumps(
            {
                "query_embedding": vector_literal(query),
                "match_count": limit,
                "min_similarity": threshold,
                # pgvector caps hnsw.ef_search at 1000.
                "candidate_count": min(1000, max(200, limit * 20)),
            }
        ),
        timeout=30,
    )
    if response.status_code == 404:
        raise RuntimeError(
            "Supabase direct video-face schema is not installed; apply migration 010"
        )
    if not response.ok:
        try:
            database_message = response.json().get("message")
        except (ValueError, AttributeError):
            database_message = None
        detail = database_message or f"HTTP {response.status_code}"
        raise RuntimeError(f"Supabase video search failed: {detail}")
    results = [
        {
            "videoId": row["video_id"],
            "externalId": row["external_id"],
            "title": row["title"],
            "sourceUrl": row["source_url"],
            "thumbnailUrl": row["thumbnail_url"],
            "durationSeconds": row["duration_seconds"],
            "similarity": row["similarity"],
            "robustSimilarity": row["robust_similarity"],
            "supportingEmbeddings": row["supporting_embeddings"],
            "bestTimestampSeconds": row["best_timestamp_seconds"],
        }
        for row in response.json()
    ]
    refresh_expired_thumbnails(results, headers)
    return results, indexed_video_count(headers)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    parser.add_argument("--limit", type=int, default=DEFAULT_RESULT_LIMIT)
    args = parser.parse_args()

    started = time.perf_counter()
    try:
        query = embed_query(args.image)
        threshold = max(-1.0, min(1.0, args.threshold))
        results, indexed_videos = search(
            query,
            threshold,
            # The deployed RPC derives hnsw.ef_search as match_count * 20.
            # pgvector caps that setting at 1000, so 50 is the largest safe
            # request until the capped migration is reapplied in Supabase.
            max(1, min(MAX_RESULT_LIMIT, args.limit)),
        )
        print(
            json.dumps(
                {
                    "ok": True,
                    "mode": "supabase-direct",
                    "model": "insightface/buffalo_l",
                    "threshold": threshold,
                    "indexedVideos": indexed_videos,
                    "facesDetected": 1,
                    "elapsedSeconds": round(time.perf_counter() - started, 3),
                    "results": results,
                },
                ensure_ascii=False,
            )
        )
        return 0
    except InputError as error:
        print(
            json.dumps(
                {
                    "ok": False,
                    "code": "invalid_image",
                    "error": str(error),
                }
            )
        )
        return 2
    except Exception as error:
        print(
            json.dumps(
                {
                    "ok": False,
                    "code": "search_failed",
                    "error": str(error),
                }
            )
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
