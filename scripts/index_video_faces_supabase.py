"""
Index video faces directly into Supabase.

Persistent state is stored only in:
  * public.videos
  * public.video_face_processing_runs
  * public.video_face_embeddings

Frames live in a temporary directory for the duration of one job and are
deleted afterwards. Signed HLS URLs are resolved just in time and never stored.

Run migration 010 before using this script.

Example:
  python scripts/index_video_faces_supabase.py \
    scripts/_pornhub_test_videos.json \
    scripts/_pornhub_negative_videos.json
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import requests

from collect_pornhub_test import (
    USER_AGENT,
    choose_hls,
    extract_media_definitions,
)
from process_video_faces import (
    FRAME_INTERVAL_SECONDS,
    MAX_FRAMES_PER_VIDEO,
    SKIP_INTRO_SECONDS,
    SKIP_OUTRO_SECONDS,
    cluster_detections,
    extract_frames,
    get_app,
    vector_literal,
)
from validate_video_face_search import face_quality, l2_normalize

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
PIPELINE_VERSION = "video-face-v2-skip-20s-edges"
MODEL_VERSION = "insightface-buffalo_l-w600k_r50"
MAX_EMBEDDINGS_PER_VIDEO = 48
MAX_EXEMPLARS_PER_CLUSTER = 4

if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit("Set SUPABASE_URL and SUPABASE_KEY in .env")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Accept-Profile": "public",
    "Content-Profile": "public",
    "Content-Type": "application/json",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def check_schema() -> None:
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/video_face_processing_runs",
        params={"select": "id", "limit": "1"},
        headers=HEADERS,
        timeout=20,
    )
    if response.status_code == 404:
        raise SystemExit(
            "Migration 010 is not applied. Run "
            "scripts/migrations/010_direct_video_face_embeddings.sql "
            "in the Supabase SQL editor."
        )
    response.raise_for_status()


def load_catalogs(paths: list[Path]) -> list[dict]:
    rows_by_id: dict[str, dict] = {}
    for path in paths:
        rows = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(rows, list):
            raise ValueError(f"{path} must contain a JSON list")
        for row in rows:
            external_id = row.get("external_id")
            if external_id and row.get("source_url"):
                rows_by_id.setdefault(external_id, row)
    return list(rows_by_id.values())


def upsert_video(row: dict) -> dict:
    payload = {
        "external_id": row["external_id"],
        "title": row.get("title"),
        "source_url": row["source_url"],
        "thumbnail_url": row.get("thumbnail_url"),
        "duration_seconds": row.get("duration_seconds"),
        "process_error": None,
    }
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/videos",
        params={"on_conflict": "external_id"},
        headers={
            **HEADERS,
            "Prefer": "resolution=merge-duplicates,return=representation",
        },
        data=json.dumps(payload),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()[0]


def resolve_hls(session: requests.Session, source_url: str) -> str:
    response = session.get(source_url, timeout=30)
    response.raise_for_status()
    hls_url = choose_hls(extract_media_definitions(response.text), 720)
    if not hls_url:
        raise RuntimeError("watch page did not contain a usable HLS stream")
    return hls_url


def start_run(video_id: int) -> int:
    payload = {
        "video_id": video_id,
        "pipeline_version": PIPELINE_VERSION,
        "model_version": MODEL_VERSION,
        "status": "processing",
        "skip_intro_seconds": SKIP_INTRO_SECONDS,
        "skip_outro_seconds": SKIP_OUTRO_SECONDS,
        "frame_interval_seconds": FRAME_INTERVAL_SECONDS,
        "max_frames": MAX_FRAMES_PER_VIDEO,
        "frames_sampled": None,
        "faces_detected": None,
        "embeddings_stored": None,
        "error_message": None,
        "started_at": utc_now(),
        "completed_at": None,
        "updated_at": utc_now(),
    }
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/video_face_processing_runs",
        params={"on_conflict": "video_id,pipeline_version,model_version"},
        headers={
            **HEADERS,
            "Prefer": "resolution=merge-duplicates,return=representation",
        },
        data=json.dumps(payload),
        timeout=30,
    )
    response.raise_for_status()
    run_id = int(response.json()[0]["id"])

    # A retry starts from an empty, non-searchable attempt.
    cleanup = requests.delete(
        f"{SUPABASE_URL}/rest/v1/video_face_embeddings",
        params={"run_id": f"eq.{run_id}"},
        headers=HEADERS,
        timeout=30,
    )
    cleanup.raise_for_status()
    return run_id


def completed_run_exists(video_id: int) -> bool:
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/video_face_processing_runs",
        params={
            "select": "id",
            "video_id": f"eq.{video_id}",
            "pipeline_version": f"eq.{PIPELINE_VERSION}",
            "model_version": f"eq.{MODEL_VERSION}",
            "status": "eq.completed",
            "limit": "1",
        },
        headers=HEADERS,
        timeout=20,
    )
    response.raise_for_status()
    return bool(response.json())


def detect_qualified_faces(frames: list[tuple[str, float]]) -> list[dict]:
    detections: list[dict] = []
    app = get_app()
    for frame_path, timestamp in frames:
        image = cv2.imread(frame_path)
        if image is None:
            continue
        for face_index, face in enumerate(app.get(image)):
            quality = face_quality(image, face)
            if quality is None:
                continue
            quality_score, _blur_variance, face_size = quality
            detections.append(
                {
                    "embedding": l2_normalize(
                        np.asarray(face.normed_embedding)
                    ),
                    "timestamp": float(timestamp),
                    "timestamp_ms": int(round(float(timestamp) * 1000)),
                    "face_index": face_index,
                    "quality_score": float(quality_score),
                    "detector_score": float(face.det_score),
                    "face_size_px": int(face_size),
                    "bbox_area": float(face_size * face_size),
                }
            )
    return detections


def select_exemplars(detections: list[dict]) -> list[dict]:
    if not detections:
        return []
    clusters = cluster_detections(detections)
    ranked_clusters = sorted(
        clusters,
        key=lambda cluster: (
            len(cluster["members"]),
            max(member["quality_score"] for member in cluster["members"]),
        ),
        reverse=True,
    )
    per_cluster = [
        sorted(
            cluster["members"],
            key=lambda member: member["quality_score"],
            reverse=True,
        )[:MAX_EXEMPLARS_PER_CLUSTER]
        for cluster in ranked_clusters
    ]

    # Round-robin keeps at least one exemplar for brief identities instead of
    # letting the most frequently shown face consume the entire video budget.
    selected: list[dict] = []
    for exemplar_rank in range(MAX_EXEMPLARS_PER_CLUSTER):
        for members in per_cluster:
            if exemplar_rank < len(members):
                selected.append(members[exemplar_rank])
                if len(selected) >= MAX_EMBEDDINGS_PER_VIDEO:
                    return selected
    return selected


def insert_embeddings(run_id: int, video_id: int, detections: list[dict]) -> None:
    rows = [
        {
            "run_id": run_id,
            "video_id": video_id,
            "timestamp_ms": item["timestamp_ms"],
            "face_index": item["face_index"],
            "quality_score": round(item["quality_score"], 6),
            "detector_score": round(item["detector_score"], 6),
            "face_size_px": item["face_size_px"],
            "embedding": vector_literal(item["embedding"]),
            "searchable": False,
        }
        for item in detections
    ]
    for offset in range(0, len(rows), 100):
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/video_face_embeddings",
            headers=HEADERS,
            data=json.dumps(rows[offset : offset + 100]),
            timeout=60,
        )
        response.raise_for_status()


def complete_run(
    run_id: int,
    video_id: int,
    frames_sampled: int,
    faces_detected: int,
    embeddings_stored: int,
) -> None:
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/complete_video_face_run",
        headers=HEADERS,
        data=json.dumps(
            {
                "p_run_id": run_id,
                "p_expected_embeddings": embeddings_stored,
                "p_frames_sampled": frames_sampled,
                "p_faces_detected": faces_detected,
            }
        ),
        timeout=60,
    )
    response.raise_for_status()
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/videos",
        params={"id": f"eq.{video_id}"},
        headers=HEADERS,
        data=json.dumps(
            {
                "processed_at": utc_now(),
                "process_error": None,
            }
        ),
        timeout=20,
    ).raise_for_status()


def fail_run(run_id: int | None, video_id: int | None, error: Exception) -> None:
    message = str(error)[:500]
    if run_id is not None:
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/video_face_processing_runs",
            params={"id": f"eq.{run_id}"},
            headers=HEADERS,
            data=json.dumps(
                {
                    "status": "failed",
                    "error_message": message,
                    "updated_at": utc_now(),
                }
            ),
            timeout=20,
        )
    if video_id is not None:
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/videos",
            params={"id": f"eq.{video_id}"},
            headers=HEADERS,
            data=json.dumps(
                {
                    "processed_at": None,
                    "process_error": message,
                }
            ),
            timeout=20,
        )


def process_row(
    session: requests.Session,
    row: dict,
    refresh: bool,
    max_attempts: int,
) -> str:
    video = upsert_video(row)
    video_id = int(video["id"])
    if not refresh and completed_run_exists(video_id):
        print(f"  {row['external_id']}: already completed, skipped", flush=True)
        return "skipped"

    for attempt in range(1, max_attempts + 1):
        run_id: int | None = None
        temp_dir = tempfile.mkdtemp(prefix=f"fbf_supabase_{video_id}_")
        try:
            run_id = start_run(video_id)
            # Resolve again on every attempt; signed HLS URLs are intentionally
            # never reused after a media failure.
            hls_url = resolve_hls(session, row["source_url"])
            frames = extract_frames(
                hls_url,
                temp_dir,
                row.get("duration_seconds"),
                row.get("processing_frame_rate"),
            )
            detections = detect_qualified_faces(frames)
            exemplars = select_exemplars(detections)
            insert_embeddings(run_id, video_id, exemplars)
            complete_run(
                run_id,
                video_id,
                len(frames),
                len(detections),
                len(exemplars),
            )
            print(
                f"  {row['external_id']}: frames={len(frames)} "
                f"faces={len(detections)} stored={len(exemplars)}",
                flush=True,
            )
            return "completed"
        except Exception as error:
            fail_run(run_id, video_id, error)
            if attempt < max_attempts:
                print(
                    f"  {row['external_id']}: attempt {attempt} failed; "
                    "fresh-resolving and retrying",
                    flush=True,
                )
                time.sleep(min(5.0, attempt * 1.5))
            else:
                print(
                    f"  {row['external_id']}: FAILED after "
                    f"{max_attempts} attempts: {error}",
                    flush=True,
                )
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
    return "failed"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog", type=Path, nargs="+")
    parser.add_argument("--limit", type=int)
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="skip this many catalog rows before applying limit/sharding",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="reprocess rows already completed for this pipeline/model version",
    )
    parser.add_argument(
        "--external-id",
        action="append",
        default=[],
        help="process only this external ID; repeat for multiple IDs",
    )
    parser.add_argument("--max-attempts", type=int, default=2)
    parser.add_argument(
        "--shard-count",
        type=int,
        default=1,
        help="split the catalog deterministically across this many workers",
    )
    parser.add_argument(
        "--shard-index",
        type=int,
        default=0,
        help="zero-based worker index within --shard-count",
    )
    args = parser.parse_args()
    if not 1 <= args.max_attempts <= 5:
        parser.error("--max-attempts must be between 1 and 5")
    if args.shard_count < 1:
        parser.error("--shard-count must be at least 1")
    if not 0 <= args.shard_index < args.shard_count:
        parser.error("--shard-index must be between 0 and shard-count - 1")
    if args.offset < 0:
        parser.error("--offset must be zero or greater")

    check_schema()
    rows = load_catalogs(args.catalog)
    if args.external_id:
        requested_ids = set(args.external_id)
        rows = [row for row in rows if row["external_id"] in requested_ids]
    rows = rows[args.offset :]
    if args.limit:
        rows = rows[: args.limit]
    rows = rows[args.shard_index :: args.shard_count]
    if not rows:
        raise SystemExit("No usable catalog rows found")

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9",
        }
    )
    counts = {"completed": 0, "skipped": 0, "failed": 0}
    for index, row in enumerate(rows, 1):
        print(f"[{index}/{len(rows)}] {row['external_id']}", flush=True)
        outcome = process_row(
            session,
            row,
            refresh=args.refresh,
            max_attempts=args.max_attempts,
        )
        counts[outcome] += 1
    print(
        f"completed={counts['completed']} skipped={counts['skipped']} "
        f"failed={counts['failed']}",
        flush=True,
    )
    if counts["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
