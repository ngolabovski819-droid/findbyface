"""
Search the locally validated video-face cache with one uploaded face photo.

This is the localhost prototype backend. It performs no network access and no
database writes. Production should replace the NPZ scan with the pgvector RPC.
"""
from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import sys
import time
from pathlib import Path

import cv2
import numpy as np

from process_video_faces import get_app

DEFAULT_CATALOGS = (
    Path("scripts/_pornhub_test_videos.json"),
    Path("scripts/_pornhub_negative_videos.json"),
)
DEFAULT_CACHE = Path("logs/video-face-validation")
DEFAULT_THRESHOLD = 0.324
MAX_IMAGE_PIXELS = 20_000_000


class InputError(ValueError):
    pass


def normalize(vector: np.ndarray) -> np.ndarray:
    vector = np.asarray(vector, dtype=np.float32).reshape(-1)
    norm = float(np.linalg.norm(vector))
    if vector.size != 512 or not np.isfinite(vector).all() or norm <= 0:
        raise RuntimeError("model returned an invalid face embedding")
    return vector / norm


def load_index(catalog_paths: list[Path], cache_dir: Path) -> list[dict]:
    rows_by_id: dict[str, dict] = {}
    for catalog_path in catalog_paths:
        if not catalog_path.exists():
            continue
        payload = json.loads(catalog_path.read_text(encoding="utf-8"))
        if not isinstance(payload, list):
            continue
        for row in payload:
            external_id = row.get("external_id")
            if external_id:
                rows_by_id.setdefault(external_id, row)

    indexed: list[dict] = []
    for external_id, row in rows_by_id.items():
        cache_key = hashlib.sha256(external_id.encode("utf-8")).hexdigest()[:20]
        cache_path = cache_dir / f"{cache_key}.npz"
        if not cache_path.exists():
            continue
        with np.load(cache_path) as cached:
            embeddings = cached["embeddings"].astype(np.float32)
        if embeddings.ndim != 2 or embeddings.shape[1] != 512:
            continue
        indexed.append(
            {
                "external_id": external_id,
                "title": row.get("title") or external_id,
                "source_url": row.get("source_url"),
                "thumbnail_url": row.get("thumbnail_url"),
                "duration_seconds": row.get("duration_seconds"),
                "embeddings": embeddings,
            }
        )
    return indexed


def embed_query(image_path: Path) -> tuple[np.ndarray, int]:
    image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if image is None:
        raise InputError("The uploaded file could not be decoded as an image.")
    height, width = image.shape[:2]
    if height * width > MAX_IMAGE_PIXELS:
        raise InputError("The image is too large. Use an image under 20 megapixels.")

    # InsightFace prints model discovery details to stdout. Keep stdout clean
    # because the Astro endpoint consumes one machine-readable JSON document.
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
    return normalize(faces[0].normed_embedding), len(faces)


def search(
    query: np.ndarray,
    index: list[dict],
    threshold: float,
    limit: int,
) -> list[dict]:
    results: list[dict] = []
    for row in index:
        embeddings = row["embeddings"]
        if len(embeddings) == 0:
            continue
        similarities = np.sort(embeddings @ query)[::-1]
        maximum = float(similarities[0])
        if maximum < threshold:
            continue
        top_count = min(3, len(similarities))
        robust = (
            float(np.mean(similarities[:top_count]))
            if top_count >= 2
            else maximum - 0.05
        )
        results.append(
            {
                "externalId": row["external_id"],
                "title": row["title"],
                "sourceUrl": row["source_url"],
                "thumbnailUrl": row["thumbnail_url"],
                "durationSeconds": row["duration_seconds"],
                "similarity": round(maximum, 6),
                "robustSimilarity": round(robust, 6),
                "supportingEmbeddings": int(np.sum(similarities >= threshold)),
            }
        )
    results.sort(
        key=lambda item: (
            item["similarity"],
            item["supportingEmbeddings"],
        ),
        reverse=True,
    )
    return results[:limit]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--catalog", type=Path, action="append", default=[])
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()

    started = time.perf_counter()
    try:
        catalogs = args.catalog or list(DEFAULT_CATALOGS)
        index = load_index(catalogs, args.cache_dir)
        if not index:
            raise RuntimeError(
                "The local video-face index is empty. Run the validation ingest first."
            )
        query, faces_detected = embed_query(args.image)
        results = search(
            query,
            index,
            threshold=max(-1.0, min(1.0, args.threshold)),
            limit=max(1, min(200, args.limit)),
        )
        payload = {
            "ok": True,
            "mode": "local-cache",
            "model": "insightface/buffalo_l",
            "threshold": args.threshold,
            "indexedVideos": len(index),
            "facesDetected": faces_detected,
            "elapsedSeconds": round(time.perf_counter() - started, 3),
            "results": results,
        }
        print(json.dumps(payload, ensure_ascii=False))
        return 0
    except InputError as exc:
        print(
            json.dumps(
                {
                    "ok": False,
                    "code": "invalid_image",
                    "error": str(exc),
                }
            )
        )
        return 2
    except Exception as exc:
        print(
            json.dumps(
                {
                    "ok": False,
                    "code": "search_failed",
                    "error": str(exc),
                }
            )
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
