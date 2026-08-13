"""Visual validation: for each hair bucket, build a montage where each
creator avatar is shown with the extractor's actual scan zone outlined,
and below it the stored label + the v12 re-sample label + dominant HSV.
This lets you eyeball whether the ALGORITHM ZONE captures hair correctly,
which is the only ground truth that matters.

Output: logs/audit/v12_<bucket>.png
"""
import os, sys, requests, urllib.parse, random
import numpy as np, cv2, mediapipe as mp
from dotenv import load_dotenv
load_dotenv()
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
import extract_face_metrics as efm

SU=os.environ['SUPABASE_URL']; SK=os.environ['SUPABASE_KEY']
H={'apikey':SK,'Authorization':f'Bearer {SK}'}
UA={"User-Agent":"Mozilla/5.0"}
mpfm = mp.solutions.face_mesh
fm = mpfm.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True)

OUT = 'logs/audit'
os.makedirs(OUT, exist_ok=True)

BUCKETS = ['blonde','black','brown','dark-brown','pink','red','ginger','dirty-blonde','auburn','light-brown','platinum']
N_PER = 16
THUMB = 220
COLS = 4


def proxy(url, w=640):
    no = url.replace('https://','').replace('http://','')
    return f"https://images.weserv.nl/?url={urllib.parse.quote(no)}&w={w}&output=jpg"


def dl(url):
    try:
        r = requests.get(proxy(url), headers=UA, timeout=12)
        if r.status_code != 200: return None
        return cv2.imdecode(np.frombuffer(r.content, np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        return None


def analyze(img_bgr):
    """Returns (label, zone_bbox=(x1,y1,x2,y2), dominant_bgr, hsv_tuple)"""
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    res = fm.process(rgb)
    if not res.multi_face_landmarks:
        return ('no-face', None, None, None)
    lm = res.multi_face_landmarks[0].landmark
    HH, WW = rgb.shape[:2]
    p = {n: np.array([lm[i].x*WW, lm[i].y*HH]) for n,i in efm.LM.items() if i<len(lm)}
    face_h = float(abs(p['chin_pad'][1]-p['forehead_top'][1]))
    label = efm.sample_hair_color(rgb, p, face_h)

    # Recompute zone bboxes with v14 logic for visual overlay
    fy = float(p['forehead_top'][1])
    cl_x = float(p['left_cheek'][0]); cr_x = float(p['right_cheek'][0])
    cl = int(min(cl_x, cr_x)); cr = int(max(cl_x, cr_x))
    face_w = abs(cr_x - cl_x)
    pad = face_w * 0.20
    side_outer = face_w * 0.32
    side_inner = face_w * 0.02
    eye_keys = ('left_eye_top', 'right_eye_top', 'left_eye_outer', 'right_eye_outer')
    eye_ys = [float(p[k][1]) for k in eye_keys if k in p]
    eye_y = float(np.median(eye_ys)) if eye_ys else fy + face_h*0.28
    bboxes = []
    tx0 = int(max(0, cl - pad)); tx1 = int(min(WW-1, cr + pad))
    ty0 = 2; ty1 = int(max(8, fy - face_h*0.10))
    if ty1 - ty0 >= 6: bboxes.append((tx0, ty0, tx1, ty1))
    Lx0 = int(max(0, cl - side_outer)); Lx1 = int(max(0, cl - side_inner))
    if Lx1 - Lx0 >= 6: bboxes.append((Lx0, int(fy), Lx1, int(eye_y)))
    Rx0 = int(min(WW-1, cr + side_inner)); Rx1 = int(min(WW-1, cr + side_outer))
    if Rx1 - Rx0 >= 6: bboxes.append((Rx0, int(fy), Rx1, int(eye_y)))

    return (label, bboxes, None, None)


def make_thumb(img_bgr, label_stored, label_v12, hsv, username):
    h, w = img_bgr.shape[:2]
    scale = THUMB / max(h, w)
    nh, nw = int(h*scale), int(w*scale)
    img = cv2.resize(img_bgr, (nw, nh))

    # draw zones
    res_label, bboxes, _, _ = analyze(img_bgr)
    if bboxes:
        for bb in bboxes:
            x1,y1,x2,y2 = bb
            x1,y1,x2,y2 = int(x1*scale),int(y1*scale),int(x2*scale),int(y2*scale)
            cv2.rectangle(img, (x1,y1), (x2,y2), (0,255,0), 2)

    # canvas with text caption
    cap_h = 56
    canvas = np.full((THUMB+cap_h, THUMB, 3), 32, np.uint8)
    yo = (THUMB-nh)//2; xo = (THUMB-nw)//2
    canvas[yo:yo+nh, xo:xo+nw] = img

    color = (60,255,60) if label_stored == label_v12 else (60,140,255)
    cv2.putText(canvas, f"{username[:18]}", (4, THUMB+14), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (220,220,220), 1, cv2.LINE_AA)
    cv2.putText(canvas, f"v13:{label_stored[:10]}", (4, THUMB+30), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (200,200,200), 1, cv2.LINE_AA)
    cv2.putText(canvas, f"resamp:{label_v12[:10]}", (4, THUMB+44), cv2.FONT_HERSHEY_SIMPLEX, 0.40, color, 1, cv2.LINE_AA)
    return canvas


def montage_for_bucket(bucket):
    rows = requests.get(
        f"{SU}/rest/v1/onlyfans_profiles?select=username,avatar&face_metrics_version=eq.13&face_metrics->>hairColor=eq.{bucket}&order=favoritedcount.desc&limit=120",
        headers=H, timeout=30
    ).json()
    if not rows:
        print(f'  {bucket}: empty'); return
    random.seed(42)
    sample = random.sample(rows, min(N_PER, len(rows)))
    thumbs = []
    n_match = 0
    for r in sample:
        img = dl(r.get('avatar') or '')
        if img is None: continue
        label, _, _, hsv = analyze(img)
        if label == bucket: n_match += 1
        thumbs.append(make_thumb(img, bucket, label, hsv, r['username']))
    if not thumbs: return
    rows_n = (len(thumbs)+COLS-1)//COLS
    cell_h = thumbs[0].shape[0]; cell_w = thumbs[0].shape[1]
    canvas = np.full((rows_n*cell_h+40, COLS*cell_w, 3), 24, np.uint8)
    title = f'v14 resample on v13 stored=[{bucket}] n={len(thumbs)} agreement={n_match}/{len(thumbs)} ({100*n_match//max(1,len(thumbs))}%)'
    cv2.putText(canvas, title, (10, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (240,240,240), 2, cv2.LINE_AA)
    for i, t in enumerate(thumbs):
        r, c = i//COLS, i%COLS
        canvas[40+r*cell_h:40+(r+1)*cell_h, c*cell_w:(c+1)*cell_w] = t
    out = f'{OUT}/v14_resamp_{bucket}.png'
    cv2.imwrite(out, canvas)
    print(f'  wrote {out}  ({n_match}/{len(thumbs)} match)')


for b in BUCKETS:
    print(f'[{b}]')
    montage_for_bucket(b)
print('DONE')
