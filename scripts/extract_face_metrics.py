"""
Face Metrics Extractor for findbyface.org /ai-discover/
========================================================
Extracts interpretable geometric + color metrics from each creator's avatar
and stores them as a JSONB blob on onlyfans_profiles.face_metrics.

Schema is the SAME shape that /ai-discover/ slider state uses, so the search
RPC can do a direct weighted Euclidean comparison between user preferences
and creator metrics — no opaque embedding needed.

Prerequisites:
  pip install mediapipe opencv-python-headless numpy requests Pillow tqdm python-dotenv

Usage:
  # Index top 50k by favoritedcount (v1 launch coverage):
  python scripts/extract_face_metrics.py --limit 50000

  # Re-extract everything (bumps version):
  python scripts/extract_face_metrics.py --limit 50000 --force

  # Dry run, no DB writes:
  python scripts/extract_face_metrics.py --limit 100 --dry-run

Run database migration first:
  scripts/migrations/002_face_metrics.sql
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any

import cv2
import numpy as np
import requests
from PIL import Image, UnidentifiedImageError
from tqdm import tqdm

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import mediapipe as mp
except ImportError:
    print("ERROR: pip install mediapipe", file=sys.stderr)
    sys.exit(1)

# --- Config ----------------------------------------------------------------
SCHEMA_VERSION = 16
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
PAGE_SIZE = 100
REQUEST_DELAY = 0.15  # seconds between avatar downloads (be polite to weserv)

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

# --- MediaPipe FaceMesh setup ----------------------------------------------
mp_face = mp.solutions.face_mesh
FACE_MESH = mp_face.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,  # gives us iris landmarks
    min_detection_confidence=0.4,
)

# --- BiSeNet face-parsing (CelebAMask-HQ, 19 classes) ----------------------
# Class 17 = hair. Used to mask the image so the hair-color sampler ONLY
# sees actual hair pixels (no walls, no skin, no clothing). This was the
# fundamental fix in v16 — earlier rule-only classifiers capped near 50%
# precision because zone sampling pulled in too many non-hair pixels.
_FACE_PARSE_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "models",
    "face_parsing_resnet34.onnx",
)
_FACE_PARSE_SESSION = None
_FACE_PARSE_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_FACE_PARSE_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

def _get_face_parse_session():
    global _FACE_PARSE_SESSION
    if _FACE_PARSE_SESSION is None:
        import onnxruntime as ort
        path = os.path.normpath(_FACE_PARSE_PATH)
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"BiSeNet model not found at {path}. Download from "
                "https://github.com/yakhyo/face-parsing/releases/"
                "download/v0.0.1/resnet34.onnx"
            )
        _FACE_PARSE_SESSION = ort.InferenceSession(
            path, providers=["CPUExecutionProvider"]
        )
    return _FACE_PARSE_SESSION


def hair_mask(img_rgb: np.ndarray) -> np.ndarray:
    """Return HxW bool mask where True = hair pixel. Resizes internally to
    512x512 for the network and rescales the output mask back."""
    h, w = img_rgb.shape[:2]
    sess = _get_face_parse_session()
    img512 = cv2.resize(img_rgb, (512, 512), interpolation=cv2.INTER_AREA)
    x = img512.astype(np.float32) / 255.0
    x = (x - _FACE_PARSE_MEAN) / _FACE_PARSE_STD
    x = x.transpose(2, 0, 1)[None, ...].astype(np.float32)
    out = sess.run(None, {"input": x})[0]  # (1, 19, H, W)
    cls = out[0].argmax(axis=0).astype(np.uint8)  # (H, W) class map
    # Resize class map back to original image size (nearest-neighbor)
    if cls.shape != (h, w):
        cls = cv2.resize(cls, (w, h), interpolation=cv2.INTER_NEAREST)
    return cls == 17  # hair class

# Landmark index references (MediaPipe FaceMesh, refined).
# https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
LM = {
    # face contour
    "chin":            152,
    "forehead_top":    10,
    "left_cheek":      234,
    "right_cheek":     454,
    # bizygomatic (cheekbone width landmarks)
    "left_zygo":       127,
    "right_zygo":      356,
    # jaw / gonion (mandible angle)
    "left_gonion":     172,
    "right_gonion":    397,
    "left_jaw":        149,
    "right_jaw":       378,
    # nose
    "nose_tip":        1,
    "nose_bridge":     6,
    "nose_bottom":     2,
    "subnasale":       94,
    # eyes (outer/inner corners + top/bottom)
    "left_eye_outer":  33,
    "left_eye_inner":  133,
    "left_eye_top":    159,
    "left_eye_bottom": 145,
    "right_eye_outer": 263,
    "right_eye_inner": 362,
    "right_eye_top":   386,
    "right_eye_bottom":374,
    # iris (refined landmarks)
    "left_iris":       468,
    "right_iris":      473,
    # brows
    "left_brow_inner": 55,
    "left_brow_outer": 46,
    "left_brow_top":   105,
    "right_brow_inner":285,
    "right_brow_outer":276,
    "right_brow_top":  334,
    # mouth
    # Canonical MediaPipe FaceMesh lip indices:
    #   0  = upper lip top (outermost, just below philtrum)
    #  13  = upper lip inner edge  (top of mouth opening)
    #  14  = lower lip inner edge  (bottom of mouth opening)
    #  17  = lower lip bottom (outermost)
    #  18  = chin pad / mentolabial sulcus  (NOT a lip point)
    "mouth_left":       61,
    "mouth_right":      291,
    "upper_lip_top":     0,   # outer top of upper lip
    "upper_lip_inner":  13,   # inside, top of mouth opening
    "lower_lip_inner":  14,   # inside, bottom of mouth opening
    "lower_lip_bottom": 17,   # outer bottom of lower lip
    "chin_pad":         18,
    "philtrum":        164,
}

# Color buckets (MUST match the swatch palettes in PreferenceSliders.astro)
EYE_COLOR_BUCKETS = [
    # name, target HSV (H 0..180, S 0..255, V 0..255)
    ("blue",         (105, 160, 180)),
    ("light-blue",   (100, 100, 220)),
    ("green",        ( 60, 150, 150)),
    ("hunter-green", ( 50, 180, 100)),
    ("hazel",        ( 25, 140, 140)),
    ("amber",        ( 18, 200, 180)),
    ("light-brown",  ( 15, 140, 130)),
    ("brown",        ( 12, 180,  90)),
    ("dark-brown",   ( 10, 160,  55)),
    ("gray",         (100,  20, 130)),
    ("violet",       (140, 120, 150)),
]
HAIR_COLOR_BUCKETS = [
    ("platinum",      (  0,  10, 230)),
    ("blonde",        ( 25, 130, 210)),
    ("dirty-blonde",  ( 22, 110, 160)),
    ("light-brown",   ( 15, 120, 130)),
    ("brown",         ( 12, 140,  90)),
    ("dark-brown",    ( 10, 130,  55)),
    ("black",         (  0,  20,  20)),
    ("auburn",        (  8, 200, 110)),
    ("red",           (  3, 220, 160)),
    ("ginger",        ( 15, 220, 180)),
    ("gray",          (  0,  10, 150)),
]


# --- Helpers ---------------------------------------------------------------
def fetch_batch(offset: int, limit: int, force: bool, max_creators: int) -> list[dict]:
    """Fetch one page of creators that need extraction."""
    take = min(PAGE_SIZE, max_creators - offset)
    if take <= 0:
        return []
    params = {
        "select": "id,username,avatar",
        "avatar": "not.is.null",
        "order":  "favoritedcount.desc.nullslast",
        "limit":  str(take),
        "offset": str(offset),
    }
    if not force:
        params["or"] = (
            f"(face_metrics_version.is.null,"
            f"face_metrics_version.lt.{SCHEMA_VERSION})"
        )
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/onlyfans_profiles?{qs}",
        headers=HEADERS,
        timeout=20,
    )
    r.raise_for_status()
    return r.json()


def proxy_url(avatar_url: str) -> str:
    clean = avatar_url
    for prefix in ("https://", "http://"):
        if clean.startswith(prefix):
            clean = clean[len(prefix):]
            break
    # IMPORTANT: do NOT use fit=cover here — it center-crops portrait avatars
    # and amputates the hair zone above the face. We need the full image so
    # the hair-color sampler can see the actual hair pixels above the
    # forehead. Resize on long edge only.
    return f"https://images.weserv.nl/?url={clean}&w=640&output=jpg"


def download_image(url: str) -> np.ndarray | None:
    try:
        r = requests.get(
            proxy_url(url),
            timeout=12,
            headers={"User-Agent": "Mozilla/5.0 (findbyface metrics extractor)"},
        )
        if r.status_code != 200:
            return None
        img = Image.open(io.BytesIO(r.content)).convert("RGB")
        return np.array(img)
    except (requests.RequestException, UnidentifiedImageError, OSError):
        return None


def upsert_metrics(rows: list[dict]) -> bool:
    """Bulk update via PATCH per row (PostgREST has no bulk-update with different bodies)."""
    if not rows:
        return True
    ok = True
    for row in rows:
        rid = row.pop("id")
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/onlyfans_profiles?id=eq.{rid}",
            headers=HEADERS,
            data=json.dumps(row),
            timeout=15,
        )
        if r.status_code >= 300:
            print(f"  [warn] update failed id={rid}: {r.status_code} {r.text[:120]}")
            ok = False
    return ok


# --- Geometry ---------------------------------------------------------------
def pt(landmarks, idx, w, h) -> np.ndarray:
    p = landmarks.landmark[idx]
    return np.array([p.x * w, p.y * h], dtype=np.float64)


def dist(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


def normalize(value: float, lo: float, hi: float) -> float:
    """Clamp to [0,1] from a [lo,hi] empirical range."""
    if hi <= lo:
        return 0.5
    return max(0.0, min(1.0, (value - lo) / (hi - lo)))


def angle_deg(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle ABC in degrees."""
    ba = a - b
    bc = c - b
    cos_a = float(np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9))
    return float(np.degrees(np.arccos(max(-1.0, min(1.0, cos_a)))))


def closest_bucket(hsv: tuple[int, int, int], buckets: list[tuple]) -> str:
    """Find nearest named bucket by Euclidean distance in HSV-with-hue-wrap."""
    h, s, v = hsv
    best_name, best_d = buckets[0][0], float("inf")
    for name, (bh, bs, bv) in buckets:
        # hue is circular 0..180
        dh = min(abs(h - bh), 180 - abs(h - bh)) * 2.0
        # saturation/value matter less, weight them down
        ds = (s - bs) * 0.6
        dv = (v - bv) * 0.4
        d = dh * dh + ds * ds + dv * dv
        if d < best_d:
            best_d = d
            best_name = name
    return best_name


def sample_color(img_rgb: np.ndarray, x: int, y: int, r: int) -> tuple[int, int, int] | None:
    """Median HSV in a square ROI of half-side r centred on (x,y)."""
    h, w = img_rgb.shape[:2]
    x0, x1 = max(0, x - r), min(w, x + r)
    y0, y1 = max(0, y - r), min(h, y + r)
    if x1 <= x0 or y1 <= y0:
        return None
    roi = img_rgb[y0:y1, x0:x1]
    if roi.size == 0:
        return None
    hsv = cv2.cvtColor(roi, cv2.COLOR_RGB2HSV)
    med = np.median(hsv.reshape(-1, 3), axis=0).astype(int)
    return int(med[0]), int(med[1]), int(med[2])


def _classify_iris_hsv(h: int, s: int, v: int) -> str | None:
    """Classify a single iris HSV sample. Return None if implausible."""
    # Reject implausible iris pixels:
    #  - too dark (closed eye / shadow)
    #  - too bright (specular highlight / glare)
    #  - magenta/pink range (eyeshadow / mascara bleed)
    if v < 30 or v > 235:
        return None
    if 130 <= h <= 165 and s >= 50:
        return None  # purple/magenta makeup
    # Brown family: warm hue dominates regardless of V
    if (h <= 22 or h >= 168) and s >= 60:
        if v < 70:  return "dark-brown"
        if v < 110: return "brown"
        if v < 150: return "light-brown"
        return "amber"
    # Hazel: warm + medium V + medium S
    if (h <= 35 or h >= 160) and 40 <= s <= 110 and 90 <= v <= 170:
        return "hazel"
    # Blue / light-blue
    if 90 <= h <= 130 and s >= 40:
        if v >= 170 and s < 120: return "light-blue"
        return "blue"
    # Green / hunter-green
    if 35 <= h <= 85 and s >= 40:
        if v < 110: return "hunter-green"
        return "green"
    # Gray = low saturation, mid V
    if s < 25 and 80 <= v <= 200:
        return "gray"
    return None


def sample_eye_color(img_rgb: np.ndarray, p: dict[str, np.ndarray]) -> str:
    """Sample both irises with multiple sub-pixels, reject implausible
    samples, and majority-vote the result. Returns "unknown" if too few
    valid samples."""
    H, W = img_rgb.shape[:2]
    # Estimate iris radius from eye width (eye outer→inner ~ 1.5x iris diameter)
    eye_w = float(abs(p["left_eye_outer"][0] - p["left_eye_inner"][0]))
    r = max(2, min(6, int(eye_w * 0.18)))
    votes: dict[str, int] = {}
    for key in ("left_iris", "right_iris"):
        cx, cy = int(p[key][0]), int(p[key][1])
        # 5 micro-samples: center + 4 quadrant offsets within iris
        for dx, dy in [(0, 0), (-r//2, -r//2), (r//2, -r//2), (-r//2, r//2), (r//2, r//2)]:
            sample = sample_color(img_rgb, cx + dx, cy + dy, max(2, r // 2))
            if not sample:
                continue
            label = _classify_iris_hsv(*sample)
            if label is None:
                continue
            votes[label] = votes.get(label, 0) + 1
    if not votes:
        return "unknown"
    total = sum(votes.values())
    if total < 3:
        return "unknown"
    # Collapse close labels into families for plurality
    family_map = {
        "dark-brown": "brown", "brown": "brown", "light-brown": "brown",
        "amber": "brown", "hazel": "hazel",
        "blue": "blue", "light-blue": "blue",
        "green": "green", "hunter-green": "green",
        "gray": "gray",
    }
    fam_votes: dict[str, int] = {}
    for k, n in votes.items():
        f = family_map.get(k, k)
        fam_votes[f] = fam_votes.get(f, 0) + n
    winner_family = max(fam_votes.items(), key=lambda kv: kv[1])[0]
    # Within winning family, return the most-voted specific label
    best_label, best_n = "unknown", 0
    for k, n in votes.items():
        if family_map.get(k, k) == winner_family and n > best_n:
            best_label, best_n = k, n
    # Require winning family to have a strict plurality
    if fam_votes[winner_family] < max(3, total * 0.5):
        return "unknown"
    return best_label


def sample_hair_color(img_rgb: np.ndarray, p: dict[str, np.ndarray],
                       face_height_total: float) -> str:
    """Hair color sampling — v16, BiSeNet-mask-restricted.

    Earlier versions sampled rectangular zones above and beside the head,
    which routinely captured walls, lights, hairlines, and skin. A
    ground-truth audit on 200 v14 blonde-tagged rows showed 60% false
    positive rate; HSV distributions of true blondes vs background pixels
    overlapped almost entirely.

    v16 uses a BiSeNet face-parsing ONNX (CelebAMask-HQ, class 17 = hair)
    to build a per-pixel hair mask. We sample HSV ONLY from masked pixels.
    A small backup skin/background filter remains as a safety net for the
    rare pixel where the segmentation bleeds.

    Falls back to "unknown" when:
      - face is too tight to image bounds / face_w too small
      - skin anchor cannot be established
      - the hair mask covers <0.5% of image (no detectable hair)
      - surviving hair pixels are too dispersed (multi-color dye job → unknown)
    """
    H, W = img_rgb.shape[:2]
    fy = float(p["forehead_top"][1])
    cl_x = float(p["left_cheek"][0]); cr_x = float(p["right_cheek"][0])
    face_w = float(abs(cr_x - cl_x))
    if face_w < 30:
        return "unknown"

    # Skin anchor (unchanged) — used by classify_hair() for dv calculations.
    skin_candidates: list[tuple[int, int, int]] = []
    for key in ("left_cheek", "right_cheek", "philtrum", "nose_tip", "subnasale"):
        if key not in p:
            continue
        c = sample_color(img_rgb, int(p[key][0]), int(p[key][1]), 5)
        if c is None: continue
        h, s, v = c
        if (h <= 28 or h >= 165) and 60 <= v <= 245 and s <= 200:
            skin_candidates.append((h, s, v))
    if len(skin_candidates) < 2:
        return "unknown"
    skin_arr = np.array(skin_candidates)
    skin_h = int(np.median(skin_arr[:, 0]))
    skin_s = int(np.median(skin_arr[:, 1]))
    skin_v = int(np.median(skin_arr[:, 2]))

    # --- BiSeNet hair mask -----------------------------------------------
    try:
        mask = hair_mask(img_rgb)
    except Exception:
        return "unknown"
    n_hair = int(mask.sum())
    if n_hair < int(0.005 * H * W):  # <0.5% of frame is hair → bald/cropped/missed
        return "unknown"

    # Convert masked region to HSV, then filter the rare segmentation
    # leak (background or skin pixel inside the mask).
    img_hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
    pixels = img_hsv[mask]  # shape (N, 3) [H, S, V]
    if pixels.shape[0] == 0:
        return "unknown"

    # Drop very-bright unsaturated (BG bleed) and skin-hue+skin-V (skin bleed).
    H_arr = pixels[:, 0].astype(np.int32)
    S_arr = pixels[:, 1].astype(np.int32)
    V_arr = pixels[:, 2].astype(np.int32)

    def hue_dist_arr(a: np.ndarray, b: int) -> np.ndarray:
        d = np.abs(a - b)
        return np.minimum(d, 180 - d)

    # Remove pure-white BG bleed.
    bg = ((V_arr >= 248) & (S_arr < 25)) | (V_arr < 8)
    # Remove skin bleed: same-hue family + V close to skin_v.
    skin_dh = hue_dist_arr(H_arr, skin_h)
    skin_bleed = (skin_dh <= 6) & (np.abs(V_arr - skin_v) <= 30) & (np.abs(S_arr - skin_s) <= 30)
    keep = ~(bg | skin_bleed)
    if keep.sum() < 50:
        return "unknown"

    H_arr = H_arr[keep]; S_arr = S_arr[keep]; V_arr = V_arr[keep]

    # Median HSV across all surviving hair pixels.
    h_med = int(np.median(H_arr))
    s_med = int(np.median(S_arr))
    v_med = int(np.median(V_arr))

    # Cohesion check: if mask spans wildly different hues (e.g. half-pink
    # half-blonde dye, or hair + glitter), classify as 'unknown'.
    dh = hue_dist_arr(H_arr, h_med)
    cohesive_frac = float((dh <= 20).mean())
    if cohesive_frac < 0.5:
        return "unknown"

    return classify_hair(h_med, s_med, v_med, skin_v=skin_v)


def classify_hair(h: int, s: int, v: int, skin_v: int = 180) -> str:
    """Hair classifier — v16, designed to run on REAL hair pixels (mask-restricted).

    Earlier versions (v15) layered on aggressive brightness-anchor guards
    to cope with non-hair contamination from rectangular zone sampling.
    With BiSeNet hair-mask sampling those guards are no longer needed and
    were rejecting real edge cases (very light blondes against bright skin,
    natural dv variance in styled hair). v16 reverts to color-first rules.
    """
    dv = v - skin_v
    # --- Dyed / unnatural colors first ---
    is_warm_hue = (h <= 22 or h >= 170)
    if not is_warm_hue and s >= 50:
        if 128 <= h <= 170: return "pink"
        if 108 <= h <= 128 and v < 200: return "purple"
        if 88 <= h <= 108:  return "blue"
        if 55 <= h <= 88:   return "green"
        return "unknown"
    if s >= 80 and h >= 165 and v < 60:
        return "pink"

    # Very dark hair
    if v < 35: return "black"
    if v < 55 and s < 130: return "black"
    if v < 80 and is_warm_hue: return "dark-brown"
    if v < 80: return "unknown"

    # Bright + low saturation -> platinum / gray
    if v >= 215 and s < 22: return "platinum"
    if v >= 180 and s < 12: return "gray"

    # Warm reds / auburns / gingers
    if is_warm_hue and s >= 130:
        if v >= 160 and s >= 170: return "ginger"
        if v >= 130 and s >= 200: return "red"
        if dv < -15 and s >= 150: return "auburn"
        return "unknown"

    # Brown family (mid V)
    if not is_warm_hue:
        return "unknown"
    if v < 110: return "dark-brown"
    if v < 145: return "brown"
    # Mid-bright warm (V 145-175): the BiSeNet-masked median for real
    # blondes commonly lands here. Earlier (v15) we split this into
    # "dirty-blonde" vs "light-brown", but that distinction was rejecting
    # genuine blondes from the user's bucket. Treat warm + moderate sat as
    # blonde when hue is in the natural-blonde band.
    if v < 175:
        if 12 <= h <= 30 and s < 130: return "blonde"
        return "light-brown"

    # Light V (>=175) — natural blonde / platinum
    if s < 22:
        return "platinum" if v >= 210 else "blonde"
    if 12 <= h <= 32 and 22 <= s <= 140:
        return "blonde"
    if 12 <= h <= 32 and s < 22:
        return "platinum"
    if is_warm_hue and s >= 140:
        return "auburn"
    return "unknown"


def classify_eye_shape(width: float, height: float, top_y: float,
                       outer_y: float, inner_y: float) -> str:
    """Heuristic: ratio of palpebral fissure + lid coverage."""
    if width == 0:
        return "almond"
    ratio = height / width
    # canthal tilt: outer corner higher than inner = positive
    if ratio > 0.45:
        return "round"
    # hooded: top eyelid landmark close to brow (not measured here) — fall through
    if outer_y - inner_y > 0.04 * width:
        return "downturned"
    if inner_y - outer_y > 0.04 * width:
        return "upturned"
    return "almond"


# --- The big one ------------------------------------------------------------
def extract_metrics(img_rgb: np.ndarray) -> dict[str, Any] | None:
    """Run FaceMesh and compute the structured metrics dict. Returns None on failure."""
    h, w = img_rgb.shape[:2]
    result = FACE_MESH.process(img_rgb)
    if not result.multi_face_landmarks:
        return None
    lms = result.multi_face_landmarks[0]

    # Cache landmark coords
    p = {k: pt(lms, idx, w, h) for k, idx in LM.items()}

    # Anchor distances
    face_height_total = dist(p["forehead_top"], p["chin"])  # full vertical
    if face_height_total <= 0:
        return None
    bizygomatic = dist(p["left_zygo"], p["right_zygo"])
    bigonial = dist(p["left_gonion"], p["right_gonion"])
    upper_third = dist(p["forehead_top"], p["left_eye_outer"])  # approx
    midface = dist(p["left_eye_outer"], p["subnasale"])
    lower_third = dist(p["subnasale"], p["chin"])
    ipd = dist(p["left_eye_outer"], p["right_eye_outer"])
    intercanthal = dist(p["left_eye_inner"], p["right_eye_inner"])

    # FWHR = bizygomatic / (upper-lip top - brow ridge)
    upper_lip_height = abs(p["upper_lip_top"][1] - p["left_brow_top"][1])
    fwhr_raw = bizygomatic / (upper_lip_height + 1e-6)

    # Gonial angle — angle at gonion between ramus (gonion->ear-area-proxy) and mandible body
    gonial_left = angle_deg(p["left_zygo"], p["left_gonion"], p["chin"])
    gonial_right = angle_deg(p["right_zygo"], p["right_gonion"], p["chin"])
    gonial = (gonial_left + gonial_right) / 2.0

    # Ramus length proxy: vertical from gonion to zygo
    ramus = (abs(p["left_zygo"][1] - p["left_gonion"][1])
             + abs(p["right_zygo"][1] - p["right_gonion"][1])) / 2.0

    # Chin projection: horizontal distance chin tip vs. lip plane
    chin_proj = abs(p["chin"][0] - p["upper_lip_top"][0])

    # Brow ridge projection proxy: vertical drop from brow to eye top
    brow_drop = ((p["left_eye_top"][1] - p["left_brow_top"][1])
                 + (p["right_eye_top"][1] - p["right_brow_top"][1])) / 2.0

    # Frankfurt-plane recession proxy: lateral chin-to-eye-outer offset
    chin_frankfurt = (p["chin"][0] - (p["left_eye_outer"][0] + p["right_eye_outer"][0]) / 2.0)

    # Eye spacing: intercanthal / IPD ratio (canonical avg ≈ 0.32)
    eye_spacing_ratio = intercanthal / (ipd + 1e-6)

    # Canthal tilt: outer-y minus inner-y, normalised by eye width
    eye_width = abs(p["left_eye_outer"][0] - p["left_eye_inner"][0])
    canthal_tilt_left = (p["left_eye_inner"][1] - p["left_eye_outer"][1]) / (eye_width + 1e-6)
    canthal_tilt_right = (p["right_eye_inner"][1] - p["right_eye_outer"][1]) / (eye_width + 1e-6)
    canthal_tilt = (canthal_tilt_left + canthal_tilt_right) / 2.0

    # Eye shape
    eye_h = abs(p["left_eye_top"][1] - p["left_eye_bottom"][1])
    eye_shape = classify_eye_shape(eye_width, eye_h,
                                   p["left_eye_top"][1],
                                   p["left_eye_outer"][1],
                                   p["left_eye_inner"][1])

    # Eyebrow density via edge-density on brow ROI
    brow_density = _eyebrow_density(img_rgb, p)

    # Eyebrow position: brow-to-eye distance / face height
    eyebrow_position = (((p["left_eye_top"][1] - p["left_brow_top"][1])
                         + (p["right_eye_top"][1] - p["right_brow_top"][1])) / 2.0) / face_height_total

    # Eyebrow tilt: outer brow vs inner brow Y
    brow_tilt = ((p["left_brow_inner"][1] - p["left_brow_outer"][1])
                 + (p["right_brow_inner"][1] - p["right_brow_outer"][1])) / 2.0

    # Lips
    # We want LIP FLESH only, ignoring how open the mouth is.
    # Total mouth height (outer top of upper lip -> outer bottom of lower lip)
    # includes any teeth/gum gap when smiling. Subtract the mouth-opening gap
    # (distance between the two inner lip edges) to isolate lip thickness.
    upper_lip = abs(p["upper_lip_top"][1]   - p["upper_lip_inner"][1])   # upper lip flesh
    lower_lip = abs(p["lower_lip_inner"][1] - p["lower_lip_bottom"][1])  # lower lip flesh
    lip_thickness = upper_lip + lower_lip                                # smile-invariant
    lip_fullness_raw = lip_thickness / (lower_third + 1e-6)
    vermillion = upper_lip / (lower_lip + 1e-6)

    # Jaw width / cheekbone prominence
    jaw_width_ratio = bigonial / (bizygomatic + 1e-6)
    cheekbone_prom = bizygomatic / face_height_total

    # Lower-third width (jaw width relative to face height)
    lower_third_width = bigonial / face_height_total

    # Midface ratio (midface / lower-third)
    midface_ratio = midface / (lower_third + 1e-6)

    # Jawline visibility — proxy via local gradient on jaw contour ROI
    jawline_vis = _jawline_visibility(img_rgb, p)

    # ----- Color sampling ---------------------------------------------------
    # Iris: sample BOTH eyes, reject implausible pixels (eyelid skin, glare,
    # mascara, eyeshadow). v7: classify with explicit HSV rules instead of
    # nearest-bucket which over-fires "violet" / "gray" on dim samples.
    eye_color = sample_eye_color(img_rgb, p)

    # Hair: sample multiple points around the top of the head (not just one),
    # filter out skin / background / clothing, then classify by V-then-H rules.
    hair_color = sample_hair_color(img_rgb, p, face_height_total)

    # Hair texture is hard to extract reliably from a single still; default unknown.
    hair_texture = "unknown"

    # Skin tone: sample left cheek
    skin_col = sample_color(img_rgb, int(p["left_cheek"][0]), int(p["left_cheek"][1]), 6)
    if skin_col:
        # Fitzpatrick proxy from V channel: 1=lightest, 6=darkest
        v = skin_col[2]
        skin_tone = max(0.0, min(1.0, 1.0 - (v / 255.0)))
    else:
        skin_tone = 0.5

    metrics: dict[str, Any] = {
        # All 0..1 normalized for direct slider comparison.
        "jawWidth":            normalize(jaw_width_ratio,    0.70, 1.05),
        "cheekboneProminence": normalize(cheekbone_prom,     0.55, 0.85),
        "fwhr":                normalize(fwhr_raw,           1.50, 2.30),
        "midfaceRatio":        normalize(midface_ratio,      0.85, 1.45),
        "lowerThirdWidth":     normalize(lower_third_width,  0.60, 1.00),
        "gonialAngle":         normalize(gonial,             95.0, 130.0),
        "ramusLength":         normalize(ramus / face_height_total, 0.18, 0.36),
        "chinProjection":      normalize(chin_proj / face_height_total, 0.0, 0.10),
        "browRidge":           normalize(brow_drop / face_height_total, 0.01, 0.06),
        "frankfurtRecession":  normalize(abs(chin_frankfurt) / face_height_total, 0.0, 0.08),
        "eyeSpacing":          normalize(eye_spacing_ratio,  0.28, 0.38),
        "canthalTilt":         normalize(canthal_tilt,      -0.15,  0.15),
        "eyebrowDensity":      brow_density,
        "eyebrowPosition":     normalize(eyebrow_position,   0.02, 0.08),
        "eyebrowTilt":         normalize(brow_tilt / face_height_total, -0.04, 0.04),
        "lipFullness":         normalize(lip_fullness_raw,   0.06, 0.18),
        "vermillionRatio":     normalize(vermillion,         0.40, 1.40),
        "skinTone":            skin_tone,
        "jawlineVisibility":   jawline_vis,

        # Categorical
        "eyeColor":   eye_color,
        "hairColor":  hair_color,
        "eyeShape":   eye_shape,
        "hairTexture": hair_texture,
    }
    return metrics


def _eyebrow_density(img_rgb: np.ndarray, p: dict[str, np.ndarray]) -> float:
    """Edge-density in the brow ROI as a 0..1 density proxy."""
    h, w = img_rgb.shape[:2]
    xs = [int(p["left_brow_inner"][0]), int(p["left_brow_outer"][0])]
    ys = [int(p["left_brow_outer"][1]), int(p["left_brow_top"][1])]
    x0, x1 = max(0, min(xs) - 4), min(w, max(xs) + 4)
    y0, y1 = max(0, min(ys) - 4), min(h, max(ys) + 4)
    roi = img_rgb[y0:y1, x0:x1]
    if roi.size == 0:
        return 0.5
    gray = cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    density = float(edges.mean()) / 255.0
    return max(0.0, min(1.0, density * 4.0))


def _jawline_visibility(img_rgb: np.ndarray, p: dict[str, np.ndarray]) -> float:
    """Average gradient magnitude along jawline ROI."""
    h, w = img_rgb.shape[:2]
    xs = [int(p["left_jaw"][0]), int(p["chin"][0]), int(p["right_jaw"][0])]
    ys = [int(p["left_jaw"][1]), int(p["chin"][1]), int(p["right_jaw"][1])]
    x0, x1 = max(0, min(xs) - 8), min(w, max(xs) + 8)
    y0, y1 = max(0, min(ys) - 4), min(h, max(ys) + 12)
    roi = img_rgb[y0:y1, x0:x1]
    if roi.size == 0:
        return 0.5
    gray = cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY)
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    mag = np.sqrt(gx * gx + gy * gy)
    return max(0.0, min(1.0, float(mag.mean()) / 60.0))


# --- Main loop --------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=50000,
                        help="Max creators to process (top by favoritedcount).")
    parser.add_argument("--force", action="store_true",
                        help="Re-extract even if face_metrics_version >= current.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Don't write to Supabase.")
    parser.add_argument("--start-offset", type=int, default=0,
                        help="Resume from this offset.")
    args = parser.parse_args()

    print(f"=== face_metrics extractor v{SCHEMA_VERSION} ===")
    print(f"target: top {args.limit} by favoritedcount")
    print(f"force={args.force} dry_run={args.dry_run} start_offset={args.start_offset}")

    offset = args.start_offset
    total_processed = 0
    total_extracted = 0
    total_no_face = 0
    total_dl_fail = 0
    pbar = tqdm(total=args.limit - offset, unit="creator")

    while offset < args.limit:
        try:
            batch = fetch_batch(offset, PAGE_SIZE, args.force, args.limit)
        except requests.RequestException as e:
            print(f"\n[error] fetch failed at offset {offset}: {e}", file=sys.stderr)
            time.sleep(5)
            continue
        if not batch:
            print("\n[done] no more creators to process.")
            break

        updates: list[dict] = []
        for c in batch:
            avatar = c.get("avatar")
            if not avatar:
                continue
            img = download_image(avatar)
            time.sleep(REQUEST_DELAY)
            if img is None:
                total_dl_fail += 1
                continue
            try:
                metrics = extract_metrics(img)
            except Exception as e:  # pragma: no cover
                print(f"\n[warn] extract error id={c['id']}: {e}", file=sys.stderr)
                metrics = None
            if metrics is None:
                total_no_face += 1
                continue
            updates.append({
                "id": c["id"],
                "face_metrics": metrics,
                "face_metrics_version": SCHEMA_VERSION,
                "face_metrics_at": datetime.now(timezone.utc).isoformat(),
            })
            total_extracted += 1

        total_processed += len(batch)
        pbar.update(len(batch))
        pbar.set_postfix(extracted=total_extracted, no_face=total_no_face,
                         dl_fail=total_dl_fail)

        if updates and not args.dry_run:
            upsert_metrics(updates)

        offset += len(batch)
        # If returned batch < page size and not in force mode, we've hit the tail.
        if len(batch) < PAGE_SIZE:
            break

    pbar.close()
    print(f"\n=== done ===")
    print(f"processed: {total_processed}")
    print(f"extracted: {total_extracted}")
    print(f"no face:   {total_no_face}")
    print(f"dl fail:   {total_dl_fail}")


if __name__ == "__main__":
    main()
