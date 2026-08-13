"""Collect canonical metadata with Derfirm/pornhub-api.

No signed media URLs are resolved or stored here. The Supabase indexer resolves
each watch page just in time.

Example:
  python scripts/collect_pornhub_catalog.py --limit 300 \
    --exclude scripts/_pornhub_100_videos.json \
    --output scripts/_pornhub_300_videos.json
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from pornhub_api import PornhubApi

DEFAULT_OUTPUT = Path(__file__).with_name("_pornhub_300_videos.json")


def parse_duration(value: str | None) -> int | None:
    if not value:
        return None
    try:
        parts = [int(part) for part in value.split(":")]
    except ValueError:
        return None
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return None


def load_excluded_ids(paths: list[Path]) -> set[str]:
    excluded: set[str] = set()
    for path in paths:
        for row in json.loads(path.read_text(encoding="utf-8")):
            if row.get("external_id"):
                excluded.add(row["external_id"])
    return excluded


def collect(
    limit: int,
    max_pages: int,
    excluded: set[str],
    query: str,
    orderings: list[str],
) -> list[dict]:
    api = PornhubApi()
    rows: list[dict] = []
    seen = set(excluded)
    for ordering in orderings:
        stream_started = False
        stale_pages = 0
        previous_page_ids: tuple[str, ...] | None = None
        repeated_source_pages = 0
        for page in range(1, max_pages + 1):
            videos = api.search.search_videos(
                query,
                page=page,
                ordering=ordering,
                thumbsize="medium",
            )
            if videos.size() == 0:
                break
            page_videos = list(videos)
            page_ids = tuple(str(video.video_id) for video in page_videos)
            if page_ids == previous_page_ids:
                repeated_source_pages += 1
            else:
                repeated_source_pages = 0
                previous_page_ids = page_ids
            if repeated_source_pages >= 5:
                print(
                    f"ordering={ordering} stopped after "
                    f"{repeated_source_pages} repeated source pages",
                    flush=True,
                )
                break
            added = 0
            for video in page_videos:
                external_id = f"pornhub:{video.video_id}"
                if external_id in seen:
                    continue
                seen.add(external_id)
                rows.append(
                    {
                        "external_id": external_id,
                        "title": video.title,
                        "source_url": str(video.url),
                        "thumbnail_url": str(video.default_thumb),
                        "duration_seconds": parse_duration(video.duration),
                    }
                )
                added += 1
                if len(rows) >= limit:
                    return rows
            if added:
                stream_started = True
                stale_pages = 0
            elif stream_started:
                stale_pages += 1
            print(
                f"ordering={ordering} page={page} "
                f"added={added} collected={len(rows)}",
                flush=True,
            )
            # Some upstream feeds repeat their final page indefinitely.
            if stream_started and stale_pages >= 5:
                print(
                    f"ordering={ordering} stopped after "
                    f"{stale_pages} repeated pages",
                    flush=True,
                )
                break
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--max-pages", type=int, default=20)
    parser.add_argument("--query", default="")
    parser.add_argument(
        "--ordering",
        choices=["featured", "newest", "mostviewed", "rating"],
        default="newest",
    )
    parser.add_argument(
        "--fallback-ordering",
        action="append",
        choices=["featured", "newest", "mostviewed", "rating"],
        default=[],
        help=(
            "additional feed to scan when the primary ordering reaches its "
            "pagination boundary (repeatable)"
        ),
    )
    parser.add_argument(
        "--exclude",
        action="append",
        type=Path,
        default=[],
        help="catalog whose external IDs must not be collected (repeatable)",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    if not 1 <= args.limit <= 10_000:
        parser.error("--limit must be between 1 and 10000")

    excluded = load_excluded_ids(args.exclude)
    rows = collect(
        args.limit,
        args.max_pages,
        excluded,
        args.query,
        list(dict.fromkeys([args.ordering, *args.fallback_ordering])),
    )
    if len(rows) < args.limit:
        raise SystemExit(
            f"Only collected {len(rows)}/{args.limit} unique videos "
            f"within {args.max_pages} pages"
        )
    args.output.write_text(
        json.dumps(rows, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"wrote={len(rows)} output={args.output}", flush=True)


if __name__ == "__main__":
    main()
