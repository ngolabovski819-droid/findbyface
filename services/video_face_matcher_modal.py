"""Production query-face matcher for the findbyface video index.

Deploy with:
    .venv-modal/Scripts/python.exe -m modal deploy services/video_face_matcher_modal.py

The endpoint accepts raw JPEG, PNG, or WebP bytes. Requests are authenticated
with an HMAC derived from the Supabase key already shared by the Vercel and
Modal runtimes. Query images stay in memory and are never persisted.
"""

import modal

APP_NAME = "findbyface-video-face-matcher"
SECRET_NAME = "findbyface-video-search"
MODEL_NAME = "buffalo_l"

matcher_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "build-essential",
        "libglib2.0-0",
        "libgl1",
        "unzip",
        "wget",
    )
    .pip_install(
        "cython==3.0.11",
        "numpy==1.26.4",
        "opencv-python-headless==4.10.0.84",
        "onnxruntime==1.20.1",
        "insightface==0.7.3",
        "requests==2.32.3",
        "fastapi==0.115.6",
        "pornhub-api==0.4.0",
    )
    .run_commands(
        "mkdir -p /root/.insightface/models/buffalo_l",
        "wget -q https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip -O /tmp/buffalo_l.zip",
        "unzip -q /tmp/buffalo_l.zip -d /root/.insightface/models/buffalo_l",
        "rm /tmp/buffalo_l.zip",
    )
)

app = modal.App(APP_NAME)


@app.function(
    image=matcher_image,
    secrets=[modal.Secret.from_name(SECRET_NAME)],
    cpu=2.0,
    memory=4096,
    timeout=120,
    scaledown_window=300,
    max_containers=20,
)
@modal.concurrent(max_inputs=1)
@modal.asgi_app()
def matcher_api():
    import hashlib
    import hmac
    import os
    import time
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from urllib.parse import quote

    import cv2
    import numpy as np
    import requests
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.responses import JSONResponse
    from insightface.app import FaceAnalysis
    from pornhub_api import PornhubApi

    max_upload_bytes = 8 * 1024 * 1024
    max_image_pixels = 20_000_000
    threshold = 0.324
    result_limit = 50
    thumbnail_cache_limit = 24
    thumbnail_bucket = "video-thumbnails"
    supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
    supabase_key = os.environ["SUPABASE_KEY"]

    face_app = FaceAnalysis(
        name=MODEL_NAME,
        root="/root/.insightface",
        providers=["CPUExecutionProvider"],
    )
    face_app.prepare(ctx_id=-1, det_size=(640, 640))

    api = FastAPI(
        title="findbyface video face matcher",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )

    def authenticated(request: Request, body: bytes) -> bool:
        timestamp = request.headers.get("x-fbf-timestamp", "")
        signature = request.headers.get("x-fbf-signature", "")
        try:
            sent_at = int(timestamp)
        except ValueError:
            return False
        if abs(int(time.time()) - sent_at) > 300:
            return False
        body_hash = hashlib.sha256(body).hexdigest()
        expected = hmac.new(
            supabase_key.encode("utf-8"),
            f"{timestamp}.{body_hash}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(signature, expected)

    def headers() -> dict[str, str]:
        return {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Accept-Profile": "public",
            "Content-Profile": "public",
            "Content-Type": "application/json",
        }

    def vector_literal(vector: np.ndarray) -> str:
        return "[" + ",".join(f"{float(value):.8f}" for value in vector) + "]"

    def stable_thumbnail_url(video_id: int, extension: str) -> str:
        path = quote(f"videos/{video_id}.{extension}", safe="/")
        return (
            f"{supabase_url}/storage/v1/object/public/"
            f"{thumbnail_bucket}/{path}"
        )

    def is_stable_thumbnail(url: str | None) -> bool:
        return bool(
            url
            and f"/storage/v1/object/public/{thumbnail_bucket}/" in url
        )

    def ensure_thumbnail_bucket() -> None:
        storage_headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        }
        response = requests.get(
            f"{supabase_url}/storage/v1/bucket/{thumbnail_bucket}",
            headers=storage_headers,
            timeout=15,
        )
        if response.ok:
            return
        create_response = requests.post(
            f"{supabase_url}/storage/v1/bucket",
            headers={**storage_headers, "Content-Type": "application/json"},
            json={
                "id": thumbnail_bucket,
                "name": thumbnail_bucket,
                "public": True,
                "file_size_limit": 5 * 1024 * 1024,
                "allowed_mime_types": [
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                ],
            },
            timeout=15,
        )
        # A concurrent request may have created the bucket first.
        if not create_response.ok and create_response.status_code != 409:
            create_response.raise_for_status()

    def fresh_thumbnail_source(external_id: str) -> str | None:
        prefix = "pornhub:"
        if not external_id.startswith(prefix):
            return None
        result = PornhubApi().video.get_by_id(external_id.removeprefix(prefix))
        video = getattr(result, "__root__", None)
        if video is None:
            return None
        for value in (
            getattr(video, "thumb", None),
            getattr(video, "default_thumb", None),
        ):
            if value:
                return str(value)
        return None

    def fetch_thumbnail_bytes(url: str | None) -> tuple[bytes, str] | None:
        if not url:
            return None
        response = requests.get(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 Chrome/126.0 Safari/537.36"
                ),
                "Referer": "https://www.pornhub.com/",
                "Accept": "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
            },
            timeout=15,
        )
        content_type = response.headers.get("Content-Type", "").split(";", 1)[0]
        if (
            not response.ok
            or not content_type.startswith("image/")
            or len(response.content) < 512
            or len(response.content) > 5 * 1024 * 1024
        ):
            return None
        extension = {
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        }.get(content_type)
        if not extension:
            return None
        return response.content, extension

    def cache_result_thumbnail(result: dict) -> tuple[int, str] | None:
        if is_stable_thumbnail(result.get("thumbnailUrl")):
            return None

        image = None
        try:
            image = fetch_thumbnail_bytes(result.get("thumbnailUrl"))
        except requests.RequestException:
            pass
        if image is None:
            try:
                source_url = fresh_thumbnail_source(result["externalId"])
                image = fetch_thumbnail_bytes(source_url)
            except Exception:
                return None
        if image is None:
            return None

        content, extension = image
        video_id = int(result["videoId"])
        object_path = quote(f"videos/{video_id}.{extension}", safe="/")
        upload_response = requests.post(
            (
                f"{supabase_url}/storage/v1/object/"
                f"{thumbnail_bucket}/{object_path}"
            ),
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": f"image/{'jpeg' if extension == 'jpg' else extension}",
                "x-upsert": "true",
            },
            data=content,
            timeout=20,
        )
        upload_response.raise_for_status()
        public_url = stable_thumbnail_url(video_id, extension)

        update_response = requests.patch(
            f"{supabase_url}/rest/v1/videos",
            params={"id": f"eq.{video_id}"},
            headers={**headers(), "Prefer": "return=minimal"},
            json={"thumbnail_url": public_url},
            timeout=15,
        )
        update_response.raise_for_status()
        return video_id, public_url

    def cache_result_thumbnails(results: list[dict]) -> None:
        targets = [
            result
            for result in results[:thumbnail_cache_limit]
            if not is_stable_thumbnail(result.get("thumbnailUrl"))
        ]
        if not targets:
            return
        try:
            ensure_thumbnail_bucket()
        except requests.RequestException:
            return

        cached_by_id: dict[int, str] = {}
        with ThreadPoolExecutor(max_workers=min(6, len(targets))) as executor:
            futures = [
                executor.submit(cache_result_thumbnail, result)
                for result in targets
            ]
            for future in as_completed(futures):
                try:
                    cached = future.result()
                except Exception:
                    continue
                if cached:
                    cached_by_id[cached[0]] = cached[1]

        for result in results:
            cached_url = cached_by_id.get(int(result["videoId"]))
            if cached_url:
                result["thumbnailUrl"] = cached_url

    def indexed_video_count(request_headers: dict[str, str]) -> int:
        response = requests.get(
            f"{supabase_url}/rest/v1/video_face_processing_runs",
            params={"select": "id", "status": "eq.completed"},
            headers={**request_headers, "Prefer": "count=exact", "Range": "0-0"},
            timeout=20,
        )
        response.raise_for_status()
        content_range = response.headers.get("Content-Range", "0-0/0")
        try:
            return int(content_range.rsplit("/", 1)[1])
        except (ValueError, IndexError):
            return len(response.json())

    @api.get("/health")
    async def health():
        return {
            "ok": True,
            "revision": 2,
            "model": f"insightface/{MODEL_NAME}",
            "dimensions": 512,
        }

    async def search(request):
        started = time.perf_counter()
        body = await request.body()
        if not authenticated(request, body):
            raise HTTPException(status_code=401, detail="Invalid request signature.")
        if not body or len(body) > max_upload_bytes:
            raise HTTPException(status_code=413, detail="Use an image smaller than 8 MB.")
        content_type = request.headers.get("content-type", "").split(";", 1)[0]
        if content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise HTTPException(status_code=415, detail="Use a JPEG, PNG, or WebP image.")

        encoded = np.frombuffer(body, dtype=np.uint8)
        image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
        if image is None:
            return JSONResponse(
                status_code=422,
                content={
                    "ok": False,
                    "code": "invalid_image",
                    "error": "The uploaded file could not be decoded as an image.",
                },
            )
        height, width = image.shape[:2]
        if height * width > max_image_pixels:
            return JSONResponse(
                status_code=422,
                content={
                    "ok": False,
                    "code": "invalid_image",
                    "error": "The image is too large. Use an image under 20 megapixels.",
                },
            )

        faces = face_app.get(image)
        if not faces:
            return JSONResponse(
                status_code=422,
                content={
                    "ok": False,
                    "code": "invalid_image",
                    "error": "No face was detected. Try a sharper, front-facing photo with good light.",
                },
            )
        if len(faces) > 1:
            return JSONResponse(
                status_code=422,
                content={
                    "ok": False,
                    "code": "invalid_image",
                    "error": "Multiple faces were detected. Crop the image to one performer and try again.",
                },
            )

        query = np.asarray(faces[0].normed_embedding, dtype=np.float32).reshape(-1)
        norm = float(np.linalg.norm(query))
        if query.size != 512 or not np.isfinite(query).all() or norm <= 0:
            raise HTTPException(status_code=500, detail="The model returned an invalid embedding.")
        query /= norm

        request_headers = headers()
        response = requests.post(
            f"{supabase_url}/rest/v1/rpc/match_video_faces",
            headers=request_headers,
            json={
                "query_embedding": vector_literal(query),
                "match_count": result_limit,
                "min_similarity": threshold,
                "candidate_count": 1000,
            },
            timeout=30,
        )
        if not response.ok:
            try:
                detail = response.json().get("message")
            except (ValueError, AttributeError):
                detail = None
            raise HTTPException(
                status_code=502,
                detail=detail or f"Supabase search failed with HTTP {response.status_code}.",
            )

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
        cache_result_thumbnails(results)
        return {
            "ok": True,
            "mode": "modal-supabase-thumbnail-cache",
            "model": f"insightface/{MODEL_NAME}",
            "threshold": threshold,
            "indexedVideos": indexed_video_count(request_headers),
            "facesDetected": 1,
            "elapsedSeconds": round(time.perf_counter() - started, 3),
            "results": results,
        }

    search.__annotations__["request"] = Request
    api.add_api_route("/search", search, methods=["POST"])

    return api
