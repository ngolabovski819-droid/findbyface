"""Deep audit of /api/visual-search:
   - call API for each filter
   - download every avatar via weserv
   - sample dominant hair-region pixels (top 30% of image)
   - sample dominant eye-region pixels (around landmarks)
   - flag mismatches against the user's filter
   Produces a ground-truth report so we can quantify the *actual* error rate.
"""
import os, sys, json, requests, urllib.parse, time, collections
import numpy as np
import cv2
import mediapipe as mp
from dotenv import load_dotenv

load_dotenv()
SUPA_U = os.environ['SUPABASE_URL']; SUPA_K = os.environ['SUPABASE_KEY']
SUPA_H = {'apikey': SUPA_K, 'Authorization': f'Bearer {SUPA_K}'}
API = "http://localhost:4321/api/visual-search"
UA = {"User-Agent": "Mozilla/5.0 (findbyface audit)"}

mp_face_mesh = mp.solutions.face_mesh
fm = mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True)


def proxy(url, w=320):
    no = url.replace('https://','').replace('http://','')
    return f"https://images.weserv.nl/?url={urllib.parse.quote(no)}&w={w}"


def download_img(url, w=320):
    try:
        r = requests.get(proxy(url, w), headers=UA, timeout=10)
        if r.status_code != 200: return None
        arr = np.frombuffer(r.content, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def hsv_to_hair_label(H, S, V):
    """Looser ground-truth label than the extractor uses."""
    if V < 50: return 'black'
    if V < 90 and S < 80: return 'dark-brown'
    # dyed colors
    if S >= 60:
        if 130 <= H <= 168: return 'pink'
        if 110 <= H <= 130: return 'purple'
        if 90 <= H <= 110:  return 'blue'
        if 60 <= H <= 90:   return 'green'
    # red/ginger: warm hue + high S, bright
    if (H <= 12 or H >= 168) and S >= 130:
        if V >= 130: return 'ginger/red'
        return 'auburn'
    # natural warm
    if H <= 28 or H >= 165:
        if V >= 180 and S < 80: return 'blonde'
        if V >= 140 and S < 70: return 'light-brown'
        if V >= 100: return 'brown'
        return 'dark-brown'
    if V >= 200 and S < 30: return 'platinum'
    return 'unknown'


def sample_hair(img):
    """Median HSV of top center band, excluding sky/skin."""
    h, w = img.shape[:2]
    band = img[int(h*0.0):int(h*0.30), int(w*0.25):int(w*0.75)]
    hsv = cv2.cvtColor(band, cv2.COLOR_BGR2HSV)
    flat = hsv.reshape(-1, 3)
    # drop near-white background and pure black
    mask = (flat[:,2] > 25) & (flat[:,2] < 245) & ~((flat[:,2] > 230) & (flat[:,1] < 20))
    if mask.sum() < 100: return None, None
    return tuple(np.median(flat[mask], axis=0).astype(int)), hsv_to_hair_label(*np.median(flat[mask], axis=0).astype(int))


def sample_eye(img):
    """Iris HSV via mediapipe landmarks."""
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    res = fm.process(rgb)
    if not res.multi_face_landmarks: return None, None
    lm = res.multi_face_landmarks[0].landmark
    h, w = img.shape[:2]
    # iris landmarks: 468 (left center) and 473 (right center) when refine_landmarks=True
    if len(lm) <= 473: return None, None
    pts = [lm[468], lm[473]]
    samples = []
    for p in pts:
        cx, cy = int(p.x*w), int(p.y*h)
        roi = img[max(0,cy-3):cy+3, max(0,cx-3):cx+3]
        if roi.size == 0: continue
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV).reshape(-1,3)
        samples.extend(hsv.tolist())
    if not samples: return None, None
    H,S,V = np.median(samples, axis=0).astype(int)
    # crude label
    if S < 25:
        if V < 60: return (H,S,V), 'black/dark'
        if V < 110: return (H,S,V), 'gray'
        return (H,S,V), 'gray/blue?'
    if 90 <= H <= 130: return (H,S,V), 'blue'
    if 60 <= H <= 90:  return (H,S,V), 'green'
    if 15 <= H <= 30:  return (H,S,V), 'brown' if V<140 else 'light-brown/hazel'
    if H <= 15 or H >= 165: return (H,S,V), 'brown/red'
    return (H,S,V), 'unknown'


def call_api(label, body):
    t0 = time.time()
    r = requests.post(API, json=body, timeout=60)
    dt = (time.time()-t0)*1000
    return r.json(), dt


def audit(filter_label, filter_dict, expected_hair=None, expected_eye=None, n=12):
    body = {"target": filter_dict, "weights": {}, "filters": filter_dict, "limit": n}
    data, dt = call_api(filter_label, body)
    results = data.get('results', [])
    print(f"\n{'='*78}\n{filter_label}  ({len(results)} results in {dt:.0f}ms)  pool={data.get('pool_size','-')}")
    if not results: 
        print("  (empty)")
        return
    bad_hair = 0; bad_eye = 0; nochecked=0
    for i, c in enumerate(results):
        url = c.get('avatar')
        if not url: continue
        img = download_img(url, 320)
        if img is None: 
            print(f"  {i+1:2d}. {c['username']:25s}  match={c['matchPct']}%  [DOWNLOAD FAIL]")
            continue
        nochecked += 1
        h_hsv, h_lbl = sample_hair(img)
        e_hsv, e_lbl = sample_eye(img)
        flag = ''
        if expected_hair and h_lbl and expected_hair not in h_lbl and h_lbl not in expected_hair:
            # fuzzy: "blonde" matches "blonde", "brown" matches "dark-brown"/"light-brown"
            if not (expected_hair == 'brown' and 'brown' in h_lbl):
                if not (expected_hair == 'blonde' and h_lbl in ('blonde','platinum')):
                    if not (expected_hair == 'black' and h_lbl in ('black','dark-brown')):
                        flag += f' HAIR_BAD(want={expected_hair} got={h_lbl})'
                        bad_hair += 1
        if expected_eye and e_lbl:
            if expected_eye not in e_lbl and e_lbl not in expected_eye:
                if not (expected_eye == 'brown' and 'brown' in e_lbl):
                    if not (expected_eye == 'blue' and 'blue' in e_lbl):
                        flag += f' EYE_BAD(want={expected_eye} got={e_lbl})'
                        bad_eye += 1
        h_str = f"H{h_hsv[0]:3d},S{h_hsv[1]:3d},V{h_hsv[2]:3d}->{h_lbl}" if h_hsv else "no-hair"
        e_str = f"H{e_hsv[0]:3d},S{e_hsv[1]:3d},V{e_hsv[2]:3d}->{e_lbl}" if e_hsv else "no-eye"
        print(f"  {i+1:2d}. {c['username']:25s} match={c['matchPct']:3d}%  hair[{h_str}]  eye[{e_str}]{flag}")
    print(f"  --- accuracy: hair {nochecked-bad_hair}/{nochecked} ({100*(nochecked-bad_hair)//max(1,nochecked)}%)  eye {nochecked-bad_eye}/{nochecked} ({100*(nochecked-bad_eye)//max(1,nochecked)}%)")

# ---- Run audits ----
audit("hairColor=blonde", {"hairColor":"blonde"}, expected_hair='blonde')
audit("hairColor=black",  {"hairColor":"black"},  expected_hair='black')
audit("hairColor=brown",  {"hairColor":"brown"},  expected_hair='brown')
audit("hairColor=red",    {"hairColor":"red"},    expected_hair='ginger/red')
audit("eyeColor=blue",    {"eyeColor":"blue"},    expected_eye='blue')
audit("eyeColor=brown",   {"eyeColor":"brown"},   expected_eye='brown')
audit("eyeColor=green",   {"eyeColor":"green"},   expected_eye='green')
audit("blonde+blue",      {"hairColor":"blonde","eyeColor":"blue"}, expected_hair='blonde', expected_eye='blue')
