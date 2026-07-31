"""
process_video_faces.py
=======================
Ingests videos into the performer-identity subsystem ("Corn Performers"):
samples frames with ffmpeg, detects + embeds faces with InsightFace
(buffalo_l: SCRFD detector + ArcFace w600k_r50 recognition, 512-D), clusters
detections within each video into distinct on-screen performers, then
resolves each cluster against the global `performers` gallery via the
match_performers RPC (linking to an existing performer above a similarity
threshold, or creating a new one).

This is a SEPARATE identity subsystem from onlyfans_profiles.face_embedding
(128-D face-api.js descriptor used for lookalike DISCOVERY). Here the goal
is exact re-identification, so it uses a stronger embedding model — see
scripts/migrations/009_performer_video_identity.sql for the reasoning.

Prerequisites (already installed in .venv312):
  pip install insightface imageio-ffmpeg opencv-python-headless requests python-dotenv

Run migration 009 first, then seed some rows into `videos` (see
scripts/import_videos.py) before running this.

Usage:
  python scripts/process_video_faces.py --limit 3 --dry-run   # sanity check, no DB writes
  python scripts/process_video_faces.py --limit 3             # process 3 videos for real
  python scripts/process_video_faces.py --video-id 5 --keep-frames  # debug one video

Tuning note: CLUSTER_SIM_THRESHOLD and IDENTITY_MATCH_THRESHOLD below are
starting points, not validated numbers. Run a small batch with --keep-frames
first, inspect the printed similarity values for known-same vs known-different
performers, and adjust before running the full catalog.
"""
from __future__ import annotations

import argparse
import bisect
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin

import cv2
import numpy as np
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# --- Config ------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

FRAME_INTERVAL_SECONDS = 8     # fixed-interval sampling floor (v1 — no scene detection yet)
MAX_FRAMES_PER_VIDEO   = 120   # hard cap so a very long video can't run away
SKIP_INTRO_SECONDS     = 20    # ignore teaser-only performers in the intro
SKIP_OUTRO_SECONDS     = 20    # ignore credits/recommendations in the outro
MIN_FACE_SIZE_PX       = 60    # skip detections smaller than this (too low quality to trust)
CLUSTER_SIM_THRESHOLD  = 0.35  # within-video: same-person merge threshold
MIN_CLUSTER_DETECTIONS = 2     # ignore one-frame faces/noisy false detections
IDENTITY_MATCH_THRESHOLD = 0.35  # cross-video: link to existing performer
# ^ Calibrated against real footage (2 test videos, 3 people): same-person
# pairs scored 0.57-0.66 across very different shots (headshot vs. casual),
# different-person pairs scored -0.06 to 0.07. 0.35 sits in the middle of
# that gap, biased toward avoiding false merges (worse failure mode here
# than a false split) — see scripts/_test_seed_videos.json test run notes.
# Re-validate as more/varied footage goes through; a wider or noisier
# catalog could narrow this gap.
MAX_EXEMPLARS_PER_PERFORMER = 8  # cap gallery growth per performer
RPC_POOL_SIZE = 20             # candidate pool match_performers pulls before grouping

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: set SUPABASE_URL and SUPABASE_KEY in .env", file=sys.stderr)
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Accept-Profile": "public",
    "Content-Profile": "public",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# --- InsightFace ---------------------------------------------------------------
_APP = None
_DLL_DIR_HANDLES = []


def get_app():
    global _APP
    if _APP is None:
        if os.name == "nt":
            # cuDNN 9 lazily loads sub-libraries which must be discoverable
            # after the main DLL has loaded. The ONNX Runtime pip preloader
            # does not currently add this directory to Windows' DLL search
            # path, so retain the handle for the process lifetime.
            cudnn_bin = (
                Path(sys.prefix)
                / "Lib"
                / "site-packages"
                / "nvidia"
                / "cudnn"
                / "bin"
            )
            if cudnn_bin.is_dir():
                os.environ["PATH"] = f"{cudnn_bin}{os.pathsep}{os.environ['PATH']}"
                _DLL_DIR_HANDLES.append(os.add_dll_directory(str(cudnn_bin)))

        import onnxruntime as ort
        from insightface.app import FaceAnalysis

        # The CUDA wheels can carry their runtime DLLs inside site-packages.
        # Preloading makes those DLLs discoverable on Windows without requiring
        # a separate system-wide CUDA Toolkit installation.
        if hasattr(ort, "preload_dlls"):
            ort.preload_dlls(directory="")
        available = ort.get_available_providers()
        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if "CUDAExecutionProvider" in available
            else ["CPUExecutionProvider"]
        )
        print(f"InsightFace providers: {providers}", file=sys.stderr)
        _APP = FaceAnalysis(
            name="buffalo_l",
            allowed_modules=["detection", "recognition"],
            providers=providers,
        )
        _APP.prepare(ctx_id=0, det_size=(640, 640))
    return _APP


# --- ffmpeg frame extraction ---------------------------------------------------
def get_ffmpeg_path() -> str:
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def _remote_headers() -> dict[str, str]:
    return {
        "Referer": "https://www.pornhub.com/",
        "User-Agent": "Mozilla/5.0",
    }


def _ffmpeg_headers() -> str:
    return "Referer: https://www.pornhub.com/\r\nUser-Agent: Mozilla/5.0\r\n"


def _load_hls_segments(source_url: str) -> list[tuple[float, float, str]]:
    """Return (start_seconds, duration_seconds, absolute_segment_url)."""
    session = requests.Session()
    session.headers.update(_remote_headers())
    playlist_url = source_url
    for _ in range(3):
        response = session.get(playlist_url, timeout=30)
        response.raise_for_status()
        lines = [line.strip() for line in response.text.splitlines() if line.strip()]
        if any(line.startswith("#EXTINF:") for line in lines):
            segments: list[tuple[float, float, str]] = []
            current_time = 0.0
            pending_duration: float | None = None
            for line in lines:
                if line.startswith("#EXTINF:"):
                    pending_duration = float(line.split(":", 1)[1].split(",", 1)[0])
                elif not line.startswith("#") and pending_duration is not None:
                    segments.append(
                        (current_time, pending_duration, urljoin(playlist_url, line))
                    )
                    current_time += pending_duration
                    pending_duration = None
            return segments

        child = next((line for line in lines if not line.startswith("#")), None)
        if not child:
            break
        playlist_url = urljoin(playlist_url, child)
    return []


def _extract_hls_frames(
    source_url: str,
    out_dir: str,
    duration_seconds: int | float | None,
) -> list[tuple[str, float]] | None:
    segments = _load_hls_segments(source_url)
    if not segments:
        return None
    playlist_duration = sum(segment[1] for segment in segments)
    total_duration = float(duration_seconds or playlist_duration)
    total_duration = min(total_duration, playlist_duration)
    sample_start = float(SKIP_INTRO_SECONDS)
    sample_end = total_duration - float(SKIP_OUTRO_SECONDS)
    usable_duration = sample_end - sample_start
    if usable_duration <= 0:
        return []

    desired_count = min(
        MAX_FRAMES_PER_VIDEO,
        max(1, int(usable_duration // FRAME_INTERVAL_SECONDS) + 1),
    )
    if desired_count == 1:
        targets = [sample_start + usable_duration / 2.0]
    else:
        # endpoint=False keeps the final sample before the excluded outro.
        targets = np.linspace(
            sample_start,
            sample_end,
            desired_count,
            endpoint=False,
        )

    segment_starts = [start for start, _duration, _url in segments]
    selected: list[tuple[int, float, str]] = []
    used_segments: set[int] = set()
    for target in targets:
        # Decode the first frame of the next whole segment. Seeking inside
        # isolated CDN segments is unreliable, so only choose segment starts
        # that are themselves inside the eligible middle window.
        index = bisect.bisect_left(segment_starts, float(target))
        if index >= len(segments):
            continue
        if index in used_segments:
            continue
        start, _duration, segment_url = segments[index]
        if start < sample_start or start >= sample_end:
            continue
        used_segments.add(index)
        selected.append((len(selected), start, segment_url))

    # Very short videos can have a positive eligible window but no complete
    # HLS segment whose start falls inside it (for example, 41 seconds with
    # 20-second intro/outro exclusions). That is a valid zero-frame outcome,
    # not incomplete media coverage.
    if not selected:
        return []

    ffmpeg = get_ffmpeg_path()

    def extract_one(item: tuple[int, float, str]) -> tuple[str, float] | None:
        index, timestamp, segment_url = item
        output = os.path.join(out_dir, f"frame_{index + 1:05d}.jpg")
        command = [
            ffmpeg,
            "-y",
            "-v",
            "error",
            "-headers",
            _ffmpeg_headers(),
            "-i",
            segment_url,
            "-frames:v",
            "1",
            "-q:v",
            "2",
            output,
        ]
        result = subprocess.run(command, capture_output=True, text=True, timeout=90)
        if result.returncode != 0 or not os.path.exists(output):
            return None
        return output, timestamp

    frames: list[tuple[str, float]] = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(extract_one, item) for item in selected]
        for future in as_completed(futures):
            frame = future.result()
            if frame:
                frames.append(frame)
    frames.sort(key=lambda item: item[1])

    minimum_acceptable = max(1, int(len(selected) * 0.9))
    if len(frames) < minimum_acceptable:
        raise RuntimeError(
            f"HLS coverage incomplete: extracted {len(frames)}/{len(selected)} "
            "uniformly selected timeline samples"
        )
    return frames


def extract_frames(
    source_url: str,
    out_dir: str,
    duration_seconds: int | float | None = None,
    source_fps: int | float | None = None,
) -> list[tuple[str, float]]:
    """Extract frames at a fixed interval directly from a remote URL.
    Returns [(frame_path, approx_timestamp_seconds), ...]."""
    if duration_seconds and float(duration_seconds) <= (
        SKIP_INTRO_SECONDS + SKIP_OUTRO_SECONDS
    ):
        return []

    if ".m3u8" in source_url.lower():
        hls_frames = _extract_hls_frames(source_url, out_dir, duration_seconds)
        if hls_frames is not None:
            return hls_frames

    if not duration_seconds or float(duration_seconds) <= 0:
        raise RuntimeError(
            "video duration is required to enforce intro/outro exclusion"
        )

    ffmpeg = get_ffmpeg_path()
    pattern = os.path.join(out_dir, "frame_%05d.jpg")
    fps = float(source_fps or 24.0)
    total_duration = float(duration_seconds)
    usable_duration = (
        total_duration - SKIP_INTRO_SECONDS - SKIP_OUTRO_SECONDS
    )
    interval = float(FRAME_INTERVAL_SECONDS)
    # Spread the cap across only the eligible middle of the video.
    interval = max(interval, usable_duration / MAX_FRAMES_PER_VIDEO)
    frame_step = max(1, int(round(fps * interval)))
    cmd = [
        ffmpeg, "-y",
    ]
    if source_url.startswith(("http://", "https://")):
        # Some signed CDNs reject FFmpeg's default request with HTTP 412.
        cmd.extend([
            "-headers",
            _ffmpeg_headers(),
        ])
    cmd.extend([
        "-i", source_url,
        "-vf",
        (
            f"trim=start={SKIP_INTRO_SECONDS}:"
            f"end={total_duration - SKIP_OUTRO_SECONDS},"
            f"select=not(mod(n\\,{frame_step})),setpts=N/TB"
        ),
        "-fps_mode", "vfr",
        "-frames:v", str(MAX_FRAMES_PER_VIDEO),
        "-q:v", "2",
        pattern,
    ])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed ({result.returncode}): {result.stderr[-800:]}")

    frames = sorted(Path(out_dir).glob("frame_*.jpg"))
    return [
        (str(path), SKIP_INTRO_SECONDS + index * interval)
        for index, path in enumerate(frames)
    ]


# --- Detection -------------------------------------------------------------
def detect_faces_in_frame(frame_path: str, timestamp: float) -> list[dict]:
    img = cv2.imread(frame_path)
    if img is None:
        return []
    faces = get_app().get(img)
    out = []
    for f in faces:
        x1, y1, x2, y2 = f.bbox
        if (x2 - x1) < MIN_FACE_SIZE_PX or (y2 - y1) < MIN_FACE_SIZE_PX:
            continue
        out.append({
            "embedding": f.normed_embedding,   # already L2-normalized, cosine = dot product
            "bbox_area": float((x2 - x1) * (y2 - y1)),
            "timestamp": timestamp,
            "frame_path": frame_path,
        })
    return out


# --- Within-video clustering -------------------------------------------------
def cluster_detections(detections: list[dict]) -> list[dict]:
    """Greedy online clustering by cosine similarity. Adequate for the 1-3
    people typically on screen per scene in this content; if a video ever
    has many simultaneous performers, revisit with proper tracklet linking."""
    clusters: list[dict] = []
    for det in detections:
        best_idx, best_sim = None, -1.0
        for i, c in enumerate(clusters):
            # Use the closest exemplar rather than only the centroid. Video
            # footage contains pose transitions; centroid-only matching
            # fragments one identity when an extreme pose arrives late.
            sim = max(
                float(np.dot(member["embedding"], det["embedding"]))
                for member in c["members"]
            )
            if sim > best_sim:
                best_sim, best_idx = sim, i
        if best_idx is not None and best_sim >= CLUSTER_SIM_THRESHOLD:
            c = clusters[best_idx]
            c["members"].append(det)
            mean = np.mean([m["embedding"] for m in c["members"]], axis=0)
            c["centroid"] = mean / np.linalg.norm(mean)
        else:
            clusters.append({"centroid": det["embedding"], "members": [det]})
    return clusters


def best_frame_of(cluster: dict) -> dict:
    return max(cluster["members"], key=lambda m: m["bbox_area"])


# --- Supabase helpers --------------------------------------------------------
def vector_literal(vec) -> str:
    return "[" + ",".join(f"{float(v):.8f}" for v in vec) + "]"


def fetch_unprocessed_videos(
    limit: int,
    video_id: int | None,
    external_ids: list[str] | None = None,
) -> list[dict]:
    params = {
        "select": "id,source_url,title,external_id,duration_seconds",
        "limit": str(limit),
    }
    if video_id is not None:
        params["id"] = f"eq.{video_id}"
    elif external_ids:
        encoded_ids = ",".join(f'"{value}"' for value in external_ids)
        params["external_id"] = f"in.({encoded_ids})"
        params["processed_at"] = "is.null"
    else:
        params["processed_at"] = "is.null"
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/videos",
        params=params,
        headers=HEADERS,
        timeout=20,
    )
    r.raise_for_status()
    return r.json()


def mark_video(video_id: int, error: str | None) -> None:
    # Failed sources remain eligible for a later retry (for example after a
    # signed CDN URL is refreshed). Only successful processing is final.
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/videos?id=eq.{video_id}",
        headers=HEADERS,
        data=json.dumps({
            "processed_at": _now_iso() if error is None else None,
            "process_error": error,
        }),
        timeout=15,
    )
    if r.status_code >= 300:
        print(f"  [warn] failed to mark video {video_id} processed: {r.status_code} {r.text[:200]}")


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def match_performer(embedding) -> tuple[int | None, float]:
    """Returns (performer_id, similarity) of the best gallery match, or
    (None, 0.0) if no performer exists yet / nothing close enough is asked
    for by the caller (caller applies IDENTITY_MATCH_THRESHOLD itself)."""
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/match_performers",
        headers=HEADERS,
        data=json.dumps({
            "query_embedding": vector_literal(embedding),
            "match_count": 1,
            "pool_size": RPC_POOL_SIZE,
        }),
        timeout=20,
    )
    r.raise_for_status()
    rows = r.json()
    if not rows:
        return None, 0.0
    return rows[0]["performer_id"], rows[0]["similarity"]


def create_performer() -> int:
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/performers",
        headers={**HEADERS, "Prefer": "return=representation"},
        data=json.dumps({}),
        timeout=15,
    )
    r.raise_for_status()
    return r.json()[0]["id"]


def insert_exemplar(performer_id: int, embedding, video_id: int, thumbnail_url: str | None) -> None:
    # Cap gallery growth per performer.
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/performer_exemplars?performer_id=eq.{performer_id}&select=id",
        headers=HEADERS, timeout=15,
    )
    r.raise_for_status()
    if len(r.json()) >= MAX_EXEMPLARS_PER_PERFORMER:
        return
    requests.post(
        f"{SUPABASE_URL}/rest/v1/performer_exemplars",
        headers=HEADERS,
        data=json.dumps({
            "performer_id": performer_id,
            "embedding": vector_literal(embedding),
            "video_id": video_id,
            "thumbnail_url": thumbnail_url,
        }),
        timeout=15,
    ).raise_for_status()


def upsert_performer_video(performer_id: int, video_id: int, cluster: dict, confidence: float) -> None:
    members = cluster["members"]
    timestamps = [m["timestamp"] for m in members]
    requests.post(
        f"{SUPABASE_URL}/rest/v1/performer_videos?on_conflict=performer_id,video_id",
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
        data=json.dumps({
            "performer_id": performer_id,
            "video_id": video_id,
            "first_seen_seconds": int(min(timestamps)),
            "screen_time_seconds": len(members) * FRAME_INTERVAL_SECONDS,
            "thumbnail_url": None,  # filled in by caller once thumbnail is uploaded/served
            "match_confidence": confidence,
        }),
        timeout=15,
    ).raise_for_status()


# --- Main per-video pipeline --------------------------------------------------
def process_video(video: dict, keep_frames: bool, dry_run: bool) -> None:
    video_id = video["id"]
    print(f"\nVideo {video_id} — {video.get('title') or video['source_url']}")

    tmp_dir = tempfile.mkdtemp(prefix=f"fbf_video_{video_id}_")
    try:
        print(f"  extracting frames every {FRAME_INTERVAL_SECONDS}s ...")
        frames = extract_frames(
            video["source_url"],
            tmp_dir,
            video.get("duration_seconds"),
            video.get("source_fps"),
        )
        print(f"  {len(frames)} frames extracted")

        detections: list[dict] = []
        for frame_path, ts in frames:
            detections.extend(detect_faces_in_frame(frame_path, ts))
        print(f"  {len(detections)} face detections above quality gate")

        if not detections:
            if not dry_run:
                mark_video(video_id, None)
            return

        clusters = cluster_detections(detections)
        dropped = sum(len(c["members"]) < MIN_CLUSTER_DETECTIONS for c in clusters)
        clusters = [
            c for c in clusters if len(c["members"]) >= MIN_CLUSTER_DETECTIONS
        ]
        print(f"  {len(clusters)} distinct on-screen performer(s) in this video")
        if dropped:
            print(f"  {dropped} one-frame cluster(s) ignored as low-confidence")

        for i, cluster in enumerate(clusters):
            rep = best_frame_of(cluster)
            performer_id, sim = match_performer(rep["embedding"])
            if performer_id is not None and sim >= IDENTITY_MATCH_THRESHOLD:
                print(f"    cluster {i}: matched performer {performer_id} (sim={sim:.3f}, {len(cluster['members'])} frames)")
            else:
                print(f"    cluster {i}: no confident match (best sim={sim:.3f}) — new performer, {len(cluster['members'])} frames")
                if not dry_run:
                    performer_id = create_performer()
                else:
                    performer_id = -1  # placeholder id for dry-run logging only

            if dry_run:
                continue

            insert_exemplar(performer_id, rep["embedding"], video_id, None)
            upsert_performer_video(performer_id, video_id, cluster, sim if sim else 1.0)

        if not dry_run:
            mark_video(video_id, None)

    except Exception as e:
        print(f"  ERROR: {e}")
        if not dry_run:
            mark_video(video_id, str(e)[:500])
    finally:
        if keep_frames:
            print(f"  frames kept at: {tmp_dir}")
        else:
            shutil.rmtree(tmp_dir, ignore_errors=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--video-id", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true", help="run detection/clustering, print results, write nothing")
    ap.add_argument("--keep-frames", action="store_true", help="don't delete extracted frames (debugging)")
    ap.add_argument(
        "--source-overrides",
        help="catalog JSON containing external_id + short-lived processing_url",
    )
    args = ap.parse_args()

    overrides: dict[str, dict] = {}
    if args.source_overrides:
        with open(args.source_overrides, "r", encoding="utf-8") as f:
            catalog = json.load(f)
        overrides = {
            row["external_id"]: row
            for row in catalog
            if row.get("external_id") and row.get("processing_url")
        }
        if not overrides:
            print("ERROR: source override catalog contains no usable rows", file=sys.stderr)
            sys.exit(1)

    videos = fetch_unprocessed_videos(
        args.limit,
        args.video_id,
        list(overrides) if overrides and args.video_id is None else None,
    )
    if not videos:
        print("No unprocessed videos found.")
        return

    for video in videos:
        override = overrides.get(video.get("external_id"))
        if override:
            video["source_url"] = override["processing_url"]
            video["source_fps"] = override.get("processing_frame_rate")

    print(f"Processing {len(videos)} video(s){' [DRY RUN]' if args.dry_run else ''}")
    start = time.time()
    for video in videos:
        process_video(video, args.keep_frames, args.dry_run)
    print(f"\nDone in {time.time() - start:.1f}s")


if __name__ == "__main__":
    main()
