from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
PIPELINE_VERSION = "video-face-v2-skip-20s-edges"
MODEL_VERSION = "insightface-buffalo_l-w600k_r50"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Accept-Profile": "public",
}


def get_rows(table: str, params: dict[str, str]) -> list[dict]:
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        params=params,
        headers=HEADERS,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def chunks(values: list, size: int = 50):
    for index in range(0, len(values), size):
        yield values[index : index + size]


catalog_path = Path(sys.argv[1])
catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
wanted = {row["external_id"] for row in catalog}

batch_videos = []
for external_ids in chunks(sorted(wanted)):
    batch_videos.extend(
        get_rows(
            "videos",
            {
                "select": "id,external_id",
                "external_id": f"in.({','.join(external_ids)})",
            },
        )
    )
batch_video_ids = {row["id"] for row in batch_videos}

batch_runs = []
for video_ids in chunks(sorted(batch_video_ids)):
    batch_runs.extend(
        get_rows(
            "video_face_processing_runs",
            {
                "select": (
                    "video_id,status,skip_intro_seconds,skip_outro_seconds,"
                    "frames_sampled,faces_detected,embeddings_stored,"
                    "started_at,completed_at"
                ),
                "video_id": f"in.({','.join(str(value) for value in video_ids)})",
                "pipeline_version": f"eq.{PIPELINE_VERSION}",
                "model_version": f"eq.{MODEL_VERSION}",
            },
        )
    )
completed = [row for row in batch_runs if row["status"] == "completed"]
started = [
    datetime.fromisoformat(row["started_at"].replace("Z", "+00:00"))
    for row in batch_runs
    if row["started_at"]
]
finished = [
    datetime.fromisoformat(row["completed_at"].replace("Z", "+00:00"))
    for row in completed
    if row["completed_at"]
]

print(
    json.dumps(
        {
            "catalog_videos": len(wanted),
            "database_videos": len(batch_videos),
            "batch_runs": len(batch_runs),
            "completed": len(completed),
            "failed": sum(row["status"] == "failed" for row in batch_runs),
            "searchable_videos": sum(
                (row["embeddings_stored"] or 0) > 0 for row in completed
            ),
            "zero_embedding_videos": sum(
                (row["embeddings_stored"] or 0) == 0 for row in completed
            ),
            "frames_sampled": sum(row["frames_sampled"] or 0 for row in completed),
            "faces_detected": sum(row["faces_detected"] or 0 for row in completed),
            "embeddings_stored": sum(
                row["embeddings_stored"] or 0 for row in completed
            ),
            "all_skip_20_20": all(
                row["skip_intro_seconds"] == 20
                and row["skip_outro_seconds"] == 20
                for row in batch_runs
            ),
            "batch_wall_seconds": (
                round((max(finished) - min(started)).total_seconds(), 1)
                if started and finished
                else None
            ),
        },
        indent=2,
    )
)
