"""
Local, non-destructive validation for face-photo -> video retrieval.

It embeds high-quality faces sampled from labeled positive and negative video
catalogs, embeds an independent reference photo with the same InsightFace
model, and sweeps video-level cosine thresholds. Nothing is written to the
database.

Usage:
  python scripts/validate_video_face_search.py \
    --positive scripts/_pornhub_test_videos.json \
    --negative scripts/_pornhub_negative_videos.json \
    --reference-url "https://.../avatar.jpg" \
    --limit-per-class 5
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import tempfile
import time
from pathlib import Path

import cv2
import numpy as np
import requests

from process_video_faces import extract_frames, get_app

MIN_FACE_SIZE_PX = 80
MIN_DETECTION_SCORE = 0.75
MIN_BLUR_VARIANCE = 20.0
MAX_ABS_POSE_DEGREES = 50.0
MAX_EMBEDDINGS_PER_VIDEO = 200
DEFAULT_CACHE = Path("logs/video-face-validation")
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
)


def l2_normalize(vector: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vector))
    if norm <= 0:
        raise ValueError("zero-length embedding")
    return vector.astype(np.float32) / norm


def load_catalog(path: Path, label: bool, limit: int) -> list[dict]:
    rows = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise ValueError(f"{path} must contain a JSON list")
    selected = []
    for row in rows:
        if not row.get("external_id") or not row.get("processing_url"):
            continue
        selected.append({**row, "expected_match": label})
        if len(selected) >= limit:
            break
    if len(selected) < limit:
        raise ValueError(f"{path} has only {len(selected)} usable rows; need {limit}")
    return selected


def face_quality(img: np.ndarray, face) -> tuple[float, float, int] | None:
    x1, y1, x2, y2 = [int(round(v)) for v in face.bbox]
    height, width = img.shape[:2]
    x1, x2 = max(0, x1), min(width, x2)
    y1, y2 = max(0, y1), min(height, y2)
    face_size = min(x2 - x1, y2 - y1)
    if face_size < MIN_FACE_SIZE_PX:
        return None

    detection_score = float(getattr(face, "det_score", 0.0))
    if detection_score < MIN_DETECTION_SCORE:
        return None

    pose = np.asarray(getattr(face, "pose", []), dtype=np.float32).reshape(-1)
    if pose.size and float(np.max(np.abs(pose[:2]))) > MAX_ABS_POSE_DEGREES:
        return None

    crop = img[y1:y2, x1:x2]
    if crop.size == 0:
        return None
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    blur_variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if blur_variance < MIN_BLUR_VARIANCE:
        return None

    size_factor = min(1.0, face_size / 180.0)
    blur_factor = min(1.0, math.log1p(blur_variance) / math.log1p(250.0))
    pose_factor = 1.0
    if pose.size:
        pose_factor = max(0.25, 1.0 - float(np.max(np.abs(pose[:2]))) / 75.0)
    quality = detection_score * size_factor * blur_factor * pose_factor
    return quality, blur_variance, face_size


def embed_video(row: dict, cache_dir: Path, refresh: bool) -> tuple[np.ndarray, dict]:
    cache_key = hashlib.sha256(row["external_id"].encode("utf-8")).hexdigest()[:20]
    cache_path = cache_dir / f"{cache_key}.npz"
    if cache_path.exists() and not refresh:
        cached = np.load(cache_path)
        embeddings = cached["embeddings"].astype(np.float32)
        return embeddings, {
            "frames": int(cached["frames"]),
            "detections": int(cached["detections"]),
            "accepted": len(embeddings),
            "cache": "hit",
        }

    temp_dir = tempfile.mkdtemp(prefix="fbf_validate_")
    try:
        frames = extract_frames(
            row["processing_url"],
            temp_dir,
            row.get("duration_seconds"),
            row.get("processing_frame_rate"),
        )
        accepted: list[tuple[float, np.ndarray]] = []
        detections = 0
        for frame_path, _timestamp in frames:
            img = cv2.imread(frame_path)
            if img is None:
                continue
            faces = get_app().get(img)
            detections += len(faces)
            for face in faces:
                quality = face_quality(img, face)
                if quality is None:
                    continue
                accepted.append(
                    (quality[0], l2_normalize(np.asarray(face.normed_embedding)))
                )

        accepted.sort(key=lambda item: item[0], reverse=True)
        embeddings = np.asarray(
            [item[1] for item in accepted[:MAX_EMBEDDINGS_PER_VIDEO]],
            dtype=np.float32,
        )
        if embeddings.size == 0:
            embeddings = np.empty((0, 512), dtype=np.float32)
        np.savez_compressed(
            cache_path,
            embeddings=embeddings,
            frames=np.int32(len(frames)),
            detections=np.int32(detections),
        )
        return embeddings, {
            "frames": len(frames),
            "detections": detections,
            "accepted": len(embeddings),
            "cache": "miss",
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def read_reference(path: Path | None, url: str | None) -> np.ndarray:
    if path:
        img = cv2.imread(str(path))
    else:
        response = requests.get(
            url,
            headers={"User-Agent": USER_AGENT, "Referer": "https://www.pornhub.com/"},
            timeout=30,
        )
        response.raise_for_status()
        data = np.frombuffer(response.content, dtype=np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("could not decode reference image")

    faces = get_app().get(img)
    if len(faces) != 1:
        raise ValueError(f"reference image must contain exactly one face; detected {len(faces)}")
    face = faces[0]
    return l2_normalize(np.asarray(face.normed_embedding))


def video_score(query: np.ndarray, embeddings: np.ndarray) -> tuple[float, float, int]:
    if len(embeddings) == 0:
        return -1.0, -1.0, 0
    similarities = np.sort(embeddings @ query)[::-1]
    maximum = float(similarities[0])
    top_n = min(3, len(similarities))
    # Two or three independent supporting frames are much safer than a
    # single accidental high score. A one-face video receives a small penalty.
    robust = (
        float(np.mean(similarities[:top_n]))
        if top_n >= 2
        else maximum - 0.05
    )
    return maximum, robust, len(similarities)


def metrics(rows: list[dict], threshold: float, score_field: str = "max_similarity") -> dict:
    tp = fp = tn = fn = 0
    for row in rows:
        predicted = row[score_field] >= threshold
        expected = row["expected_match"]
        if predicted and expected:
            tp += 1
        elif predicted and not expected:
            fp += 1
        elif not predicted and not expected:
            tn += 1
        else:
            fn += 1
    precision = tp / (tp + fp) if tp + fp else 1.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {
        "threshold": round(threshold, 3),
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--positive", type=Path, required=True)
    parser.add_argument("--negative", type=Path, required=True)
    reference = parser.add_mutually_exclusive_group(required=True)
    reference.add_argument("--reference", type=Path)
    reference.add_argument("--reference-url")
    parser.add_argument("--limit-per-class", type=int, default=5)
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()

    args.cache_dir.mkdir(parents=True, exist_ok=True)
    catalog = load_catalog(
        args.positive, True, args.limit_per_class
    ) + load_catalog(args.negative, False, args.limit_per_class)
    query = read_reference(args.reference, args.reference_url)

    started = time.time()
    scored: list[dict] = []
    for index, row in enumerate(catalog, 1):
        label = "positive" if row["expected_match"] else "negative"
        print(f"[{index}/{len(catalog)}] {label} {row['external_id']}")
        embeddings, stats = embed_video(row, args.cache_dir, args.refresh)
        maximum, robust, count = video_score(query, embeddings)
        result = {
            "external_id": row["external_id"],
            "expected_match": row["expected_match"],
            "max_similarity": round(maximum, 6),
            "robust_similarity": round(robust, 6),
            "embedding_count": count,
            **stats,
        }
        scored.append(result)
        print(
            f"  frames={stats['frames']} accepted={count} "
            f"max={maximum:.3f} robust={robust:.3f}"
        )

    positive_scores = [
        row["max_similarity"] for row in scored if row["expected_match"]
    ]
    negative_scores = [
        row["max_similarity"] for row in scored if not row["expected_match"]
    ]
    lowest_positive = min(positive_scores)
    highest_negative = max(negative_scores)
    separation_margin = lowest_positive - highest_negative
    sweep = [
        metrics(scored, value / 100, "max_similarity") for value in range(0, 81)
    ]
    if separation_margin > 0:
        midpoint = (lowest_positive + highest_negative) / 2
        best = metrics(scored, midpoint, "max_similarity")
    else:
        best = max(sweep, key=lambda item: (item["f1"], item["precision"], item["recall"]))

    report = {
        "model": "insightface/buffalo_l",
        "primary_aggregation": "maximum_qualified_face_cosine",
        "secondary_diagnostic": "mean_top_3_cosine",
        "videos": scored,
        "score_separation": {
            "lowest_positive": round(lowest_positive, 6),
            "highest_negative": round(highest_negative, 6),
            "margin": round(separation_margin, 6),
        },
        "recommended_operating_point": best,
        "pass": best["fp"] == 0 and best["recall"] >= 0.8,
        "elapsed_seconds": round(time.time() - started, 1),
    }
    report_path = args.cache_dir / "report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["recommended_operating_point"], indent=2))
    print(f"pass={report['pass']} report={report_path}")


if __name__ == "__main__":
    main()
