"""Repeatability + truth audit:
For each filter, fetch results, re-run the extractor's own sampler on each
avatar, and compare:
  stored_label vs re_sampled_label vs simple_top_band_label

This separates 3 failure modes:
  (a) Extractor non-deterministic / data is stale
  (b) Extractor consistently wrong (algorithm flaw)
  (c) Simple ground truth disagrees with extractor (could be either)
"""
import os, sys, requests, urllib.parse, time, collections
import numpy as np
import cv2
import mediapipe as mp
from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
import extract_face_metrics as efm

SU = os.environ['SUPABASE_URL']; SK = os.environ['SUPABASE_KEY']
H = {'apikey': SK, 'Authorization': f'Bearer {SK}'}
API = "http://localhost:4321/api/visual-search"
UA = {"User-Agent": "Mozilla/5.0"}

mpfm = mp.solutions.face_mesh
fm = mpfm.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True)


def proxy_jpg(url, w=640):
    no = url.replace('https://','').replace('http://','')
    return f"https://images.weserv.nl/?url={urllib.parse.quote(no)}&w={w}&output=jpg"


def dl(url, w=640):
    try:
        r = requests.get(proxy_jpg(url, w), headers=UA, timeout=12)
        if r.status_code != 200: return None
        return cv2.imdecode(np.frombuffer(r.content, np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        return None


def simple_hair(img_bgr):
    """Top 30% center band, drop near-white/near-black, label HSV median."""
    h, w = img_bgr.shape[:2]
    band = img_bgr[0:int(h*0.30), int(w*0.25):int(w*0.75)]
    hsv = cv2.cvtColor(band, cv2.COLOR_BGR2HSV).reshape(-1,3)
    m = (hsv[:,2] > 25) & (hsv[:,2] < 245) & ~((hsv[:,2] > 230) & (hsv[:,1] < 25))
    if m.sum() < 100: return ('?', None)
    H_,S_,V_ = np.median(hsv[m], axis=0).astype(int)
    label = efm.classify_hair(int(H_), int(S_), int(V_), skin_v=160)
    return (label, (int(H_),int(S_),int(V_)))


def extractor_resample(img_bgr):
    """Re-run extractor's exact sampler on this image."""
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    res = fm.process(rgb)
    if not res.multi_face_landmarks: return ('no-face', None)
    lm = res.multi_face_landmarks[0].landmark
    HH, WW = rgb.shape[:2]
    pts = {n: np.array([lm[i].x*WW, lm[i].y*HH]) for n,i in efm.LM.items() if i < len(lm)}
    face_h = float(abs(pts['chin_pad'][1] - pts['forehead_top'][1]))
    return (efm.sample_hair_color(rgb, pts, face_h), None)


def call_api(flt, limit=24):
    return requests.post(API, json={"target": flt, "weights": {}, "filters": flt, "limit": limit}, timeout=60).json()


def fetch_stored(usernames):
    if not usernames: return {}
    quoted = ','.join(f'"{u}"' for u in usernames)
    rows = requests.get(
        f'{SU}/rest/v1/onlyfans_profiles?select=username,face_metrics&username=in.({quoted})',
        headers=H, timeout=30).json()
    return {r['username']: (r.get('face_metrics') or {}).get('hairColor','?') for r in rows}


FILTERS = [
    ('blonde', {'hairColor':'blonde'}),
    ('black',  {'hairColor':'black'}),
    ('brown',  {'hairColor':'brown'}),
    ('red',    {'hairColor':'red'}),
    ('pink',   {'hairColor':'pink'}),
]

print(f"{'filter':10s} {'n':>3s}  reproduce  stored=simple  per-row")
print('='*100)
total_repro = 0; total_truthy = 0; total_n = 0
for fname, flt in FILTERS:
    data = call_api(flt, 24)
    results = data.get('results', [])
    if not results:
        print(f'{fname:10s}    EMPTY')
        continue
    stored = fetch_stored([r['username'] for r in results])
    repro = 0; truthy = 0
    rows = []
    for c in results:
        u = c['username']
        img = dl(c.get('avatar') or '', 640)
        if img is None:
            rows.append(f'  {u:25s} stored={stored.get(u):12s} resample=DOWNLOAD-FAIL')
            continue
        rs, _ = extractor_resample(img)
        sm, hsv = simple_hair(img)
        st = stored.get(u, '?')
        is_repro = (rs == st)
        is_truthy = (sm in (st, 'unknown')) or (st in ('unknown',))
        if is_repro: repro += 1
        if is_truthy: truthy += 1
        flag = ('R' if is_repro else 'r') + ('T' if is_truthy else 't')
        rows.append(f'  [{flag}] {u:25s} stored={st:12s} resample={rs:12s} simple={sm:12s} hsv={hsv}')
    print(f'{fname:10s} {len(results):3d}   {repro:3d}/{len(results)}      {truthy:3d}/{len(results)}')
    for r in rows: print(r)
    print()
    total_n += len(results); total_repro += repro; total_truthy += truthy
print('='*100)
print(f'OVERALL  reproduce={total_repro}/{total_n} ({100*total_repro/max(1,total_n):.0f}%)  ',
      f'simple-agrees={total_truthy}/{total_n} ({100*total_truthy/max(1,total_n):.0f}%)')
