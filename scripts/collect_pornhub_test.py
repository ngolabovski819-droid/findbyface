"""
Collect a small, explicitly licensed PornHub test catalog.

The upstream ``pornhubapi`` package is used to fetch search result pages, but
its published parser targets old markup. This script parses the current cards
and resolves the page's mediaDefinitions itself.

The output keeps the canonical watch page in ``source_url`` and a short-lived
HLS URL in ``processing_url``. ``import_videos.py`` ignores processing_url;
``process_video_faces.py --source-overrides`` uses it only while embedding.

Usage:
  python scripts/collect_pornhub_test.py --performer lela-star --limit 10
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse

import pornhub
import requests

BASE_URL = "https://www.pornhub.com"
DEFAULT_OUTPUT = Path(__file__).with_name("_pornhub_test_videos.json")
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
)


def load_search_page(client, page: int):
    # PyPI's 0.1.0 release exposes _loadVideosPage; the repository version
    # renamed it to _loadPage. Support both without depending on its broken
    # result-card parser.
    if hasattr(client, "_loadPage"):
        return client._loadPage(page_num=page, sort_by="recent")
    return client._loadVideosPage(page)


def parse_duration(value: str | None) -> int | None:
    if not value:
        return None
    try:
        parts = [int(part) for part in value.strip().split(":")]
    except ValueError:
        return None
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return None


def parse_cards(soup) -> list[dict]:
    cards = soup.find_all("li", class_=re.compile(r".*\bvideoblock\b.*\bvideoBox\b.*"))
    rows: list[dict] = []
    seen: set[str] = set()
    for card in cards:
        anchor = next(
            (
                tag
                for tag in card.find_all("a", href=True)
                if "view_video.php?viewkey=" in tag["href"]
            ),
            None,
        )
        if anchor is None:
            continue
        canonical = urljoin(BASE_URL, anchor["href"])
        viewkey = parse_qs(urlparse(canonical).query).get("viewkey", [None])[0]
        if not viewkey or viewkey in seen:
            continue
        seen.add(viewkey)

        image = card.find("img")
        duration = card.find("var", class_=re.compile(r".*\bduration\b.*"))
        rows.append(
            {
                "viewkey": viewkey,
                "title": anchor.get("title") or anchor.get_text(" ", strip=True) or viewkey,
                "source_url": canonical,
                "thumbnail_url": (
                    image.get("data-mediumthumb") or image.get("src") if image else None
                ),
                "duration_seconds": parse_duration(
                    duration.get_text(" ", strip=True) if duration else None
                ),
            }
        )
    return rows


def extract_media_definitions(html: str) -> list[dict]:
    marker = '"mediaDefinitions":'
    position = html.find(marker)
    if position < 0:
        return []
    start = html.find("[", position + len(marker))
    if start < 0:
        return []
    try:
        value, _ = json.JSONDecoder().raw_decode(html[start:])
    except (json.JSONDecodeError, TypeError):
        return []
    return value if isinstance(value, list) else []


def choose_hls(definitions: list[dict], target_quality: int) -> str | None:
    candidates: list[tuple[int, str]] = []
    for item in definitions:
        if item.get("format") != "hls" or not item.get("videoUrl"):
            continue
        try:
            quality = int(item.get("quality"))
        except (TypeError, ValueError):
            continue
        candidates.append((quality, item["videoUrl"]))
    if not candidates:
        return None
    at_or_below = [item for item in candidates if item[0] <= target_quality]
    return max(at_or_below or candidates, key=lambda item: item[0])[1]


def hls_frame_rate(session: requests.Session, master_url: str) -> float | None:
    try:
        response = session.get(master_url, timeout=20)
        response.raise_for_status()
    except requests.RequestException:
        return None
    match = re.search(r"(?:^|,)FRAME-RATE=([0-9.]+)", response.text, re.MULTILINE)
    return float(match.group(1)) if match else None


def collect(
    performer: str,
    limit: int,
    max_pages: int,
    quality: int,
    exclude_performers: list[str] | None = None,
) -> list[dict]:
    keywords = performer.replace("-", " ").split()
    client = pornhub.PornHub(keywords=keywords)
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"})
    required_profile_path = f"/pornstar/{performer}".lower()
    excluded_profile_paths = [
        f"/pornstar/{slug}".lower() for slug in (exclude_performers or [])
    ]

    output: list[dict] = []
    seen: set[str] = set()
    for page in range(1, max_pages + 1):
        for card in parse_cards(load_search_page(client, page)):
            if card["viewkey"] in seen:
                continue
            seen.add(card["viewkey"])

            response = session.get(card["source_url"], timeout=30)
            response.raise_for_status()
            page_html = response.text.lower()
            if required_profile_path not in page_html:
                continue
            if any(path in page_html for path in excluded_profile_paths):
                continue

            processing_url = choose_hls(
                extract_media_definitions(response.text), target_quality=quality
            )
            if not processing_url:
                continue

            output.append(
                {
                    "external_id": f"pornhub:{card['viewkey']}",
                    "title": card["title"],
                    "source_url": card["source_url"],
                    "processing_url": processing_url,
                    "processing_frame_rate": hls_frame_rate(session, processing_url),
                    "thumbnail_url": card["thumbnail_url"],
                    "duration_seconds": card["duration_seconds"],
                }
            )
            print(f"  [{len(output)}/{limit}] {card['viewkey']} — {card['title']}")
            if len(output) >= limit:
                return output
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--performer", required=True, help="Pornstar URL slug")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--max-pages", type=int, default=5)
    parser.add_argument("--quality", type=int, default=720)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--exclude-performer",
        action="append",
        default=[],
        help="reject pages linked to this pornstar slug (repeatable)",
    )
    args = parser.parse_args()

    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", args.performer):
        parser.error("--performer must be a URL slug such as lela-star")
    if not 1 <= args.limit <= 50:
        parser.error("--limit must be between 1 and 50")

    print(f"Collecting {args.limit} licensed test videos for {args.performer} ...")
    rows = collect(
        args.performer,
        args.limit,
        args.max_pages,
        args.quality,
        args.exclude_performer,
    )
    if len(rows) < args.limit:
        raise SystemExit(
            f"Only found {len(rows)} verified videos with usable HLS streams "
            f"within {args.max_pages} page(s)."
        )

    args.output.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(rows)} records to {args.output}")


if __name__ == "__main__":
    main()
