"""Diagnostic: for each row in a wrong/correct CSV, run v14 sampler with
per-zone instrumentation and dump:
  - zone (top/left/right) bbox
  - per-zone median (h,s,v)
  - per-zone classify_hair() label
  - which zones survived cohesion
  - final voted label
  - skin reference (h,s,v)

Then render one HTML report grouped by failure mode so we can patch.

Usage:
  .\.venv312\Scripts\python.exe scripts/hair_diagnose.py logs/audit/hair_audit_blonde.csv
"""
import os, sys, argparse, csv, requests, urllib.parse, base64, json
import numpy as np, cv2, mediapipe as mp
from collections import Counter, defaultdict
from dotenv import load_dotenv
load_dotenv()
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
import extract_face_metrics as efm

SU = os.environ['SUPABASE_URL']
SK = os.environ['SUPABASE_KEY']
HDR = {'apikey': SK, 'Authorization': f'Bearer {SK}'}
UA = {"User-Agent": "Mozilla/5.0"}

mpfm = mp.solutions.face_mesh
fm = mpfm.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True)


def proxy(url, w=640):
    no = url.replace('https://', '').replace('http://', '')
    return f"https://images.weserv.nl/?url={urllib.parse.quote(no)}&w={w}&output=jpg"


def dl(url):
    try:
        r = requests.get(proxy(url), headers=UA, timeout=12)
        if r.status_code != 200:
            return None
        return cv2.imdecode(np.frombuffer(r.content, np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        return None


def sample_hair_with_trace(img_rgb, p, face_h):
    """Mirror of efm.sample_hair_color but returns (final_label, trace dict)."""
    H, W = img_rgb.shape[:2]
    fy = float(p["forehead_top"][1])
    cl_x = float(p["left_cheek"][0]); cr_x = float(p["right_cheek"][0])
    face_w = float(abs(cr_x - cl_x))
    trace = {'face_w': face_w, 'fy': fy, 'image': (W, H)}
    if face_w < 30:
        return "unknown", trace

    # Skin ref
    skin_candidates = []
    for key in ("left_cheek", "right_cheek", "philtrum", "nose_tip", "subnasale"):
        if key not in p: continue
        c = efm.sample_color(img_rgb, int(p[key][0]), int(p[key][1]), 5)
        if c is None: continue
        h, s, v = c
        if (h <= 28 or h >= 165) and 60 <= v <= 245 and s <= 200:
            skin_candidates.append((h, s, v))
    if len(skin_candidates) < 2:
        trace['skin'] = None
        return "unknown", trace
    sk = np.array(skin_candidates)
    skin_h, skin_s, skin_v = int(np.median(sk[:, 0])), int(np.median(sk[:, 1])), int(np.median(sk[:, 2]))
    trace['skin'] = (skin_h, skin_s, skin_v)

    def hue_dist(a, b):
        d = abs(a - b)
        return min(d, 180 - d)

    def is_skin_like(h, s, v):
        dh = hue_dist(h, skin_h)
        if dh <= 8 and (h <= 25 or h >= 165):
            if abs(v - skin_v) < 70 and abs(s - skin_s) < 80:
                return True
        return dh <= 6 and abs(v - skin_v) <= 45 and abs(s - skin_s) <= 45

    def is_background(h, s, v):
        if v >= 248 and s < 25: return True
        if v > 200 and s < 14: return True
        if 90 <= h <= 130 and s < 22 and v > 180: return True
        if v < 8: return True
        return False

    cl = int(min(cl_x, cr_x)); cr = int(max(cl_x, cr_x))
    pad = int(face_w * 0.20)
    side_outer = int(face_w * 0.32); side_inner = int(face_w * 0.02)
    eye_keys = ("left_eye_top", "right_eye_top", "left_eye_outer", "right_eye_outer")
    eye_ys = [float(p[k][1]) for k in eye_keys if k in p]
    eye_y = float(np.median(eye_ys)) if eye_ys else fy + face_h * 0.28
    y_face_top = int(fy)
    y_side_bot = int(min(H - 1, eye_y))

    zones_def = []
    tx0 = max(0, cl - pad); tx1 = min(W - 1, cr + pad)
    ty0 = 2; ty1 = max(ty0 + 4, int(fy - face_h * 0.10))
    if ty1 - ty0 >= 6 and tx1 - tx0 >= 12:
        zones_def.append((tx0, ty0, tx1, ty1, "top"))
    Lx0 = max(0, cl - side_outer); Lx1 = max(0, cl - side_inner)
    if Lx1 - Lx0 >= 6 and y_side_bot - y_face_top >= 16:
        zones_def.append((Lx0, y_face_top, Lx1, y_side_bot, "left"))
    Rx0 = min(W - 1, cr + side_inner); Rx1 = min(W - 1, cr + side_outer)
    if Rx1 - Rx0 >= 6 and y_side_bot - y_face_top >= 16:
        zones_def.append((Rx0, y_face_top, Rx1, y_side_bot, "right"))

    n_cols = 14
    zone_records = []
    for (zx0, zy0, zx1, zy1, name) in zones_def:
        rec = {'name': name, 'bbox': (zx0, zy0, zx1, zy1)}
        zone_samples = []
        col_data = 0
        n_bg = 0; n_skin = 0; n_kept = 0; n_total = 0
        for i in range(n_cols):
            x = zx0 + (zx1 - zx0) * (i + 1) // (n_cols + 1)
            col_pixels = []
            for y in range(zy0, zy1, 2):
                col = efm.sample_color(img_rgb, x, y, 3)
                if col is None: continue
                n_total += 1
                hh, ss, vv = col
                if is_background(hh, ss, vv): n_bg += 1; continue
                if is_skin_like(hh, ss, vv):  n_skin += 1; continue
                n_kept += 1
                col_pixels.append((hh, ss, vv))
            if col_pixels:
                col_data += 1
                arr = np.array(col_pixels)
                vmed = float(np.median(arr[:, 2]))
                mask = arr[:, 2] >= vmed
                bright = arr[mask] if mask.sum() >= 2 else arr
                zone_samples.append((
                    int(np.median(bright[:, 0])),
                    int(np.median(bright[:, 1])),
                    int(np.median(bright[:, 2])),
                ))
        rec['col_data'] = col_data
        rec['filtering'] = {'total': n_total, 'bg': n_bg, 'skin': n_skin, 'kept': n_kept}
        rec['n_zone_samples'] = len(zone_samples)
        if col_data < max(5, n_cols // 2):
            rec['skipped'] = 'not_enough_columns'
            zone_records.append(rec); continue
        z = np.array(zone_samples)
        zh = int(np.median(z[:, 0])); zs = int(np.median(z[:, 1])); zv = int(np.median(z[:, 2]))
        rec['median_hsv'] = (zh, zs, zv)
        cohesive = sum(1 for (h, s, v) in zone_samples
                       if hue_dist(h, zh) <= 18 and abs(v - zv) <= 50)
        rec['cohesive'] = cohesive
        if cohesive < max(4, int(len(zone_samples) * 0.6)):
            rec['skipped'] = 'not_cohesive'
            zone_records.append(rec); continue
        rec['label'] = efm.classify_hair(zh, zs, zv, skin_v=skin_v)
        rec['contributed'] = True
        zone_records.append(rec)

    contributing = [(r['median_hsv'], r['label'], r['name']) for r in zone_records if r.get('contributed')]
    if not contributing:
        trace['zones'] = zone_records
        trace['voting'] = None
        return "unknown", trace
    cnt = Counter(lbl for (_, lbl, _) in contributing if lbl != 'unknown')
    if not cnt:
        final = 'unknown'
    else:
        top, top_n = cnt.most_common(1)[0]
        if len(contributing) == 1: final = top
        elif top_n >= 2:           final = top
        else:                      final = 'unknown'
    trace['zones'] = zone_records
    trace['voting'] = dict(cnt)
    trace['final'] = final
    return final, trace


def annotate(img_bgr, trace):
    out = img_bgr.copy()
    color_by_state = {True: (0, 255, 0)}  # green = contributed
    for r in trace.get('zones', []):
        x0, y0, x1, y1 = r['bbox']
        col = (0, 255, 0) if r.get('contributed') else (0, 80, 255)  # orange = skipped
        cv2.rectangle(out, (x0, y0), (x1, y1), col, 2)
        lbl_txt = r.get('label') or r.get('skipped', '?')
        med = r.get('median_hsv')
        txt1 = f"{r['name']}:{lbl_txt}"
        cv2.putText(out, txt1, (x0 + 4, y0 + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 1, cv2.LINE_AA)
        if med:
            cv2.putText(out, f"hsv {med}", (x0 + 4, y0 + 32), cv2.FONT_HERSHEY_SIMPLEX, 0.4, col, 1, cv2.LINE_AA)
    return out


def img_to_data_uri(img_bgr, max_w=520):
    h, w = img_bgr.shape[:2]
    if w > max_w:
        s = max_w / w
        img_bgr = cv2.resize(img_bgr, (max_w, int(h * s)))
    ok, buf = cv2.imencode('.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return f'data:image/jpeg;base64,{base64.b64encode(buf.tobytes()).decode()}' if ok else ''


def fetch_avatar(uid):
    r = requests.get(
        f"{SU}/rest/v1/onlyfans_profiles?id=eq.{uid}&select=username,avatar,face_metrics",
        headers=HDR, timeout=20)
    rows = r.json()
    return rows[0] if rows else None


def categorize_failure(verdict, trace):
    """Bucket each row into a failure mode."""
    if verdict != 'wrong':
        return 'agree' if trace.get('final') == 'blonde' else 'true-disagree'
    zones = trace.get('zones', [])
    contributed = [z for z in zones if z.get('contributed')]
    if not contributed:
        return 'no-contributing-zones'  # shouldn't happen if final=blonde
    blonde_zones = [z for z in contributed if z.get('label') == 'blonde']
    if not blonde_zones:
        return 'no-blonde-zone-but-tagged'  # ?

    # Inspect the blonde-emitting zones' median HSV
    medians = [z['median_hsv'] for z in blonde_zones]
    avg_h = np.mean([m[0] for m in medians])
    avg_s = np.mean([m[1] for m in medians])
    avg_v = np.mean([m[2] for m in medians])
    skin = trace.get('skin') or (0, 0, 0)
    skin_h, skin_s, skin_v = skin

    # Failure-mode heuristics
    # 1) sample is essentially the same hue as skin -> hairline/temple skin leaked through
    if abs(avg_v - skin_v) < 28 and abs(avg_h - skin_h) < 6 and abs(avg_s - skin_s) < 30:
        return 'skin-leaked'
    # 2) sample is very desaturated and bright -> probably wall/ceiling/highlight
    if avg_s < 30 and avg_v > 195:
        return 'pale-bg-leaked'
    # 3) bright warm + low S in a single zone only -> ambient warm tint
    if len(contributing := [z for z in blonde_zones]) <= 1 and avg_s < 35:
        return 'single-zone-low-sat'
    # 4) all zones agree blonde but the actual hair is dark — extractor sampled forehead skin
    n_top = sum(1 for z in blonde_zones if z['name'] == 'top')
    n_side = len(blonde_zones) - n_top
    if n_top == 0:
        return 'sides-only-no-top'
    return 'classifier-edge'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('csv_file')
    ap.add_argument('--out', default='logs/audit/hair_diagnose.html')
    ap.add_argument('--include-correct', action='store_true', help='also analyze correct verdicts')
    args = ap.parse_args()

    rows = list(csv.DictReader(open(args.csv_file)))
    if not args.include_correct:
        rows = [r for r in rows if r['verdict'] == 'wrong']
    print(f'analyzing {len(rows)} rows...', flush=True)

    by_mode = defaultdict(list)
    for i, r in enumerate(rows):
        if (i+1) % 10 == 0: print(f'  {i+1}/{len(rows)}', flush=True)
        prof = fetch_avatar(r['id'])
        if not prof:
            continue
        img = dl(prof.get('avatar') or '')
        if img is None:
            by_mode['dl-fail'].append({'row': r, 'prof': prof, 'trace': None, 'uri': ''})
            continue
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        res = fm.process(rgb)
        if not res.multi_face_landmarks:
            by_mode['no-face'].append({'row': r, 'prof': prof, 'trace': None, 'uri': img_to_data_uri(img)})
            continue
        lm = res.multi_face_landmarks[0].landmark
        H, W = rgb.shape[:2]
        p = {n: np.array([lm[i].x*W, lm[i].y*H]) for n, i in efm.LM.items() if i < len(lm)}
        face_h = float(abs(p['chin_pad'][1] - p['forehead_top'][1]))
        final, trace = sample_hair_with_trace(rgb, p, face_h)
        annot = annotate(img, trace)
        uri = img_to_data_uri(annot)
        mode = categorize_failure(r['verdict'], trace)
        by_mode[mode].append({'row': r, 'prof': prof, 'trace': trace, 'uri': uri, 'final': final})

    # Build report
    sections = []
    summary = []
    for mode, entries in sorted(by_mode.items(), key=lambda kv: -len(kv[1])):
        summary.append(f'<li><b>{mode}</b>: {len(entries)}</li>')
        cards = []
        for e in entries:
            r = e['row']; t = e['trace']; final = e.get('final', '?')
            zone_html = ''
            if t and t.get('zones'):
                rows_html = []
                for z in t['zones']:
                    med = z.get('median_hsv', '—')
                    lbl = z.get('label') or z.get('skipped', '—')
                    coh = z.get('cohesive', '—')
                    flt = z.get('filtering', {})
                    rows_html.append(
                        f'<tr><td>{z["name"]}</td><td>{med}</td><td>{lbl}</td>'
                        f'<td>{coh}/{z.get("n_zone_samples","?")}</td>'
                        f'<td>kept {flt.get("kept","?")}/{flt.get("total","?")} '
                        f'(bg {flt.get("bg","?")}, skin {flt.get("skin","?")})</td></tr>'
                    )
                skin = t.get('skin', '—')
                vote = t.get('voting', {})
                zone_html = (
                    f'<div class="trace">'
                    f'<div>skin ref: {skin} &middot; vote: {vote} &middot; final: <b>{final}</b></div>'
                    f'<table><tr><th>zone</th><th>median HSV</th><th>label</th><th>cohesion</th><th>filtering</th></tr>'
                    f'{"".join(rows_html)}</table></div>'
                )
            cards.append(f'''
<div class="card">
  <img src="{e['uri']}" alt="">
  <div class="meta">
    <div class="user"><a href="https://onlyfans.com/{r['username']}" target="_blank">@{r['username']}</a> <span class="id">id={r['id']}</span></div>
    {zone_html}
  </div>
</div>''')
        sections.append(f'<section><h2>{mode} ({len(entries)})</h2><div class="grid">{"".join(cards)}</div></section>')

    html = f'''<!doctype html>
<html><head><meta charset="utf-8"><title>Hair diagnose</title>
<style>
body {{ background:#0a0a0f; color:#f0f0f5; font-family:system-ui; margin:0; padding:20px; }}
h1 {{ margin-top:0; }}
h2 {{ color:#a855f7; border-bottom:1px solid #333; padding-bottom:6px; margin-top:28px; }}
.summary {{ background:#12121a; padding:12px; border-radius:8px; }}
.summary li {{ list-style:none; padding:2px 0; }}
.grid {{ display:grid; grid-template-columns: repeat(auto-fill, minmax(360px,1fr)); gap:12px; }}
.card {{ background:#12121a; border-radius:8px; overflow:hidden; }}
.card img {{ width:100%; display:block; }}
.meta {{ padding:8px; font-size:12px; }}
.user a {{ color:#7c3aed; font-weight:600; text-decoration:none; }}
.id {{ color:#666; font-size:11px; }}
.trace {{ margin-top:6px; color:#aab; }}
table {{ width:100%; border-collapse:collapse; margin-top:4px; font-size:11px; }}
th, td {{ border:1px solid #333; padding:3px 5px; text-align:left; }}
th {{ background:#1a1a2e; color:#aab; }}
</style>
</head><body>
<h1>Hair diagnose — {os.path.basename(args.csv_file)}</h1>
<div class="summary"><b>Failure mode breakdown:</b><ul>{''.join(summary)}</ul></div>
{''.join(sections)}
</body></html>'''
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'\nDONE: {os.path.abspath(args.out)}')
    print('\nSummary:')
    for mode, entries in sorted(by_mode.items(), key=lambda kv: -len(kv[1])):
        print(f'  {mode:30s} {len(entries):3d}')


if __name__ == '__main__':
    main()
