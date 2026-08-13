"""Visual audit: produce a labeled montage PNG for each filter so we can
visually verify the API results. Saves under logs/audit/{filter}.png.

Each tile shows the avatar + stored label + flag (OK/BAD heuristic).
"""
import os, sys, requests, urllib.parse, time
import numpy as np
import cv2
from dotenv import load_dotenv
load_dotenv()

SU = os.environ['SUPABASE_URL']; SK = os.environ['SUPABASE_KEY']
H = {'apikey': SK, 'Authorization': f'Bearer {SK}'}
API = "http://localhost:4321/api/visual-search"
UA = {"User-Agent": "Mozilla/5.0 (audit)"}

OUT = os.path.join(os.path.dirname(__file__), '..', 'logs', 'audit')
os.makedirs(OUT, exist_ok=True)


def proxy(url, w=240):
    no = url.replace('https://','').replace('http://','')
    return f"https://images.weserv.nl/?url={urllib.parse.quote(no)}&w={w}&output=jpg"


def dl(url, w=240):
    try:
        r = requests.get(proxy(url, w), headers=UA, timeout=10)
        if r.status_code != 200: return None
        arr = np.frombuffer(r.content, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def call_api(filters, limit=24):
    body = {"target": filters, "weights": {}, "filters": filters, "limit": limit}
    return requests.post(API, json=body, timeout=60).json()


def make_montage(label, results, db_metrics_by_user):
    cols = 6
    cell_w, cell_h = 240, 360
    rows = (len(results) + cols - 1) // cols
    canvas = np.full((rows*cell_h + 50, cols*cell_w, 3), 30, np.uint8)
    cv2.putText(canvas, f'FILTER: {label}  ({len(results)} results)',
                (10, 30), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255,255,255), 1)
    for i, c in enumerate(results):
        r, col = divmod(i, cols)
        x0 = col*cell_w; y0 = 50 + r*cell_h
        img = dl(c.get('avatar') or '', cell_w)
        if img is None:
            cv2.rectangle(canvas, (x0, y0), (x0+cell_w, y0+cell_h-60), (0,0,80), -1)
        else:
            ih, iw = img.shape[:2]
            scale = min(cell_w/iw, (cell_h-60)/ih)
            nh, nw = int(ih*scale), int(iw*scale)
            res = cv2.resize(img, (nw, nh))
            ox = x0 + (cell_w - nw)//2; oy = y0 + ((cell_h-60) - nh)//2
            canvas[oy:oy+nh, ox:ox+nw] = res
        m = db_metrics_by_user.get(c.get('username'), {})
        info = [
            c.get('username','')[:24],
            f"hair:{m.get('hairColor','?')} eye:{m.get('eyeColor','?')}",
            f"match:{c.get('matchPct','?')}%",
        ]
        for j, line in enumerate(info):
            cv2.putText(canvas, line, (x0+6, y0+cell_h-44+j*16),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, (220,220,220), 1)
    out_path = os.path.join(OUT, f'{label.replace("=","_").replace("+","_and_")}.png')
    cv2.imwrite(out_path, canvas)
    return out_path


def fetch_db_metrics(usernames):
    if not usernames: return {}
    quoted = ','.join(f'"{u}"' for u in usernames)
    r = requests.get(
        f'{SU}/rest/v1/onlyfans_profiles?select=username,face_metrics,face_metrics_version&username=in.({quoted})',
        headers=H, timeout=30
    ).json()
    return {row['username']: (row.get('face_metrics') or {}) for row in r}


FILTERS = [
    ('hairColor=blonde', {'hairColor':'blonde'}),
    ('hairColor=black',  {'hairColor':'black'}),
    ('hairColor=brown',  {'hairColor':'brown'}),
    ('hairColor=red',    {'hairColor':'red'}),
    ('hairColor=pink',   {'hairColor':'pink'}),
    ('eyeColor=blue',    {'eyeColor':'blue'}),
    ('eyeColor=brown',   {'eyeColor':'brown'}),
    ('eyeColor=green',   {'eyeColor':'green'}),
    ('blonde+blue',      {'hairColor':'blonde','eyeColor':'blue'}),
    ('black+brown',      {'hairColor':'black','eyeColor':'brown'}),
]

for label, flt in FILTERS:
    data = call_api(flt, 24)
    results = data.get('results', [])
    if not results:
        print(f'{label}: EMPTY')
        continue
    metrics = fetch_db_metrics([r['username'] for r in results])
    path = make_montage(label, results, metrics)
    # quick stats
    target_hair = flt.get('hairColor'); target_eye = flt.get('eyeColor')
    h_match = sum(1 for r in results if metrics.get(r['username'],{}).get('hairColor')==target_hair)
    e_match = sum(1 for r in results if metrics.get(r['username'],{}).get('eyeColor')==target_eye)
    parts = []
    if target_hair: parts.append(f'stored hair={h_match}/{len(results)}')
    if target_eye:  parts.append(f'stored eye={e_match}/{len(results)}')
    print(f'{label}: {", ".join(parts)}  -> {os.path.basename(path)}')

print(f'\nMontages written to: {OUT}')
