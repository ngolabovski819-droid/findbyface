"""
Benchmark the direct video-face embedding pipeline without database writes.

Each watch page is resolved immediately before processing because its HLS URL
is signed and short-lived. The URL is never persisted in the report.

Example:
  python scripts/benchmark_video_faces.py \
    --catalog scripts/_pornhub_test_videos.json \
    --limit 3 \
    --duration-seconds 180
"""
from __future__ import annotations

import argparse
import json
import shutil
import statistics
import tempfile
import time
from pathlib import Path

import cv2
import numpy as np
import requests

from collect_pornhub_test import (
    USER_AGENT,
    choose_hls,
    extract_media_definitions,
)
from process_video_faces import extract_frames, get_app

DEFAULT_OUTPUT = Path("logs/video-face-benchmark/report.json")


def resolve_hls(
    session: requests.Session,
    watch_url: str,
    quality: int,
) -> str:
    response = session.get(watch_url, timeout=30)
    response.raise_for_status()
    result = choose_hls(extract_media_definitions(response.text), quality)
    if not result:
        raise RuntimeError("watch page did not contain a usable HLS stream")
    return result


def percentile(values: list[float], value: float) -> float:
    return float(np.percentile(np.asarray(values, dtype=np.float64), value))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=3)
    parser.add_argument(
        "--duration-seconds",
        type=int,
        default=180,
        help="benchmark this much timeline per video; 0 uses full duration",
    )
    parser.add_argument("--quality", type=int, default=720)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    rows = json.loads(args.catalog.read_text(encoding="utf-8"))
    rows = [row for row in rows if row.get("source_url")][: args.limit]
    if len(rows) < args.limit:
        parser.error(f"catalog contains only {len(rows)} usable rows")

    model_started = time.perf_counter()
    app = get_app()
    model_load_seconds = time.perf_counter() - model_started
    providers = sorted(
        {
            provider
            for model in app.models.values()
            for provider in model.session.get_providers()
        }
    )

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9",
        }
    )

    samples: list[dict] = []
    for index, row in enumerate(rows, 1):
        started = time.perf_counter()
        resolve_started = time.perf_counter()
        hls_url = resolve_hls(session, row["source_url"], args.quality)
        resolve_seconds = time.perf_counter() - resolve_started

        source_duration = int(row.get("duration_seconds") or 0)
        sampled_duration = source_duration or args.duration_seconds
        if args.duration_seconds > 0:
            sampled_duration = min(
                source_duration or args.duration_seconds,
                args.duration_seconds,
            )

        temp_dir = tempfile.mkdtemp(prefix="fbf_benchmark_")
        try:
            extraction_started = time.perf_counter()
            frames = extract_frames(hls_url, temp_dir, sampled_duration)
            extraction_seconds = time.perf_counter() - extraction_started

            inference_started = time.perf_counter()
            detections = 0
            embedded_faces = 0
            for frame_path, _timestamp in frames:
                image = cv2.imread(frame_path)
                if image is None:
                    continue
                faces = app.get(image)
                detections += len(faces)
                embedded_faces += sum(
                    1
                    for face in faces
                    if getattr(face, "normed_embedding", None) is not None
                )
            inference_seconds = time.perf_counter() - inference_started
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

        total_seconds = time.perf_counter() - started
        sample = {
            "external_id": row.get("external_id"),
            "source_duration_seconds": source_duration or None,
            "sampled_duration_seconds": sampled_duration,
            "frames": len(frames),
            "first_sample_seconds": round(frames[0][1], 3) if frames else None,
            "last_sample_seconds": round(frames[-1][1], 3) if frames else None,
            "detections": detections,
            "embedded_faces": embedded_faces,
            "resolve_seconds": round(resolve_seconds, 3),
            "extraction_seconds": round(extraction_seconds, 3),
            "inference_seconds": round(inference_seconds, 3),
            "total_seconds": round(total_seconds, 3),
        }
        samples.append(sample)
        print(
            f"[{index}/{len(rows)}] {sample['external_id']} "
            f"frames={len(frames)} total={total_seconds:.2f}s "
            f"(resolve={resolve_seconds:.2f}s extract={extraction_seconds:.2f}s "
            f"infer={inference_seconds:.2f}s)"
        )

    totals = [sample["total_seconds"] for sample in samples]
    mean_seconds = statistics.fmean(totals)
    report = {
        "pipeline": "direct-video-face-embedding",
        "model": "insightface/buffalo_l",
        "providers": providers,
        "model_load_seconds": round(model_load_seconds, 3),
        "sample_count": len(samples),
        "duration_cap_seconds": args.duration_seconds or None,
        "samples": samples,
        "summary": {
            "mean_seconds_per_video": round(mean_seconds, 3),
            "p50_seconds_per_video": round(percentile(totals, 50), 3),
            "p95_seconds_per_video": round(percentile(totals, 95), 3),
            "single_worker_hours_100k": round(mean_seconds * 100_000 / 3600, 1),
            "single_worker_hours_1m": round(mean_seconds * 1_000_000 / 3600, 1),
        },
        "notes": [
            "Model load is excluded from per-video timings.",
            "Every sample resolves its signed HLS URL just in time.",
            "Parallel workers scale throughput; long videos remain frame-capped.",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], indent=2))
    print(f"report={args.output}")


if __name__ == "__main__":
    main()
