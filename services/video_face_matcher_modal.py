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

    import cv2
    import numpy as np
    import requests
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.responses import JSONResponse
    from insightface.app import FaceAnalysis

    max_upload_bytes = 8 * 1024 * 1024
    max_image_pixels = 20_000_000
    threshold = 0.324
    result_limit = 50
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
        return {
            "ok": True,
            "mode": "modal-supabase-direct",
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
