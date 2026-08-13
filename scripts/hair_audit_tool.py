"""Hair color ground-truth audit tool.

Pulls all v14 rows currently labeled with the requested hair bucket, draws
the v14 sample zones on each avatar, and writes a single self-contained
HTML page you can scroll through.

Each card has a 'Wrong' button — clicking it appends `<id>,<username>,<bucket>`
to ./logs/audit/wrong_<bucket>.csv via a tiny POST endpoint served by this
same script (mode=serve), or via download if mode=static.

Usage:
    .\.venv312\Scripts\python.exe scripts/hair_audit_tool.py blonde --limit 200
    # then open logs/audit/hair_<bucket>.html in your browser

Or live-serve mode (so the Wrong button POSTs straight to a CSV):
    .\.venv312\Scripts\python.exe scripts/hair_audit_tool.py blonde --serve
    # opens http://127.0.0.1:8765/
"""
import os, sys, argparse, requests, urllib.parse, base64, json, csv
from io import BytesIO
import numpy as np, cv2, mediapipe as mp
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

OUT_DIR = 'logs/audit'
os.makedirs(OUT_DIR, exist_ok=True)


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


def annotate(img_bgr):
    """Draw v14 zones on the image. Returns (annotated_bgr, label, zone_count)."""
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    res = fm.process(rgb)
    if not res.multi_face_landmarks:
        return img_bgr, 'no-face', 0
    lm = res.multi_face_landmarks[0].landmark
    HH, WW = rgb.shape[:2]
    p = {n: np.array([lm[i].x * WW, lm[i].y * HH])
         for n, i in efm.LM.items() if i < len(lm)}
    face_h = float(abs(p['chin_pad'][1] - p['forehead_top'][1]))
    label = efm.sample_hair_color(rgb, p, face_h)

    # Replicate v14 zone math
    fy = float(p['forehead_top'][1])
    cl_x = float(p['left_cheek'][0]); cr_x = float(p['right_cheek'][0])
    cl = int(min(cl_x, cr_x)); cr = int(max(cl_x, cr_x))
    face_w = abs(cr_x - cl_x)
    pad = face_w * 0.20
    side_outer = face_w * 0.32
    side_inner = face_w * 0.02
    eye_keys = ('left_eye_top', 'right_eye_top', 'left_eye_outer', 'right_eye_outer')
    eye_ys = [float(p[k][1]) for k in eye_keys if k in p]
    eye_y = float(np.median(eye_ys)) if eye_ys else fy + face_h * 0.28
    bboxes = []
    tx0 = int(max(0, cl - pad)); tx1 = int(min(WW - 1, cr + pad))
    ty0 = 2; ty1 = int(max(8, fy - face_h * 0.10))
    if ty1 - ty0 >= 6:
        bboxes.append((tx0, ty0, tx1, ty1, 'top'))
    Lx0 = int(max(0, cl - side_outer)); Lx1 = int(max(0, cl - side_inner))
    if Lx1 - Lx0 >= 6:
        bboxes.append((Lx0, int(fy), Lx1, int(eye_y), 'L'))
    Rx0 = int(min(WW - 1, cr + side_inner)); Rx1 = int(min(WW - 1, cr + side_outer))
    if Rx1 - Rx0 >= 6:
        bboxes.append((Rx0, int(fy), Rx1, int(eye_y), 'R'))

    out = img_bgr.copy()
    for (x1, y1, x2, y2, name) in bboxes:
        cv2.rectangle(out, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(out, name, (x1 + 4, y1 + 16), cv2.FONT_HERSHEY_SIMPLEX,
                    0.5, (0, 255, 0), 1, cv2.LINE_AA)
    return out, label, len(bboxes)


def img_to_data_uri(img_bgr, max_w=480):
    h, w = img_bgr.shape[:2]
    if w > max_w:
        scale = max_w / w
        img_bgr = cv2.resize(img_bgr, (max_w, int(h * scale)))
    ok, buf = cv2.imencode('.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        return ''
    b64 = base64.b64encode(buf.tobytes()).decode('ascii')
    return f'data:image/jpeg;base64,{b64}'


def fetch_rows(bucket, version, limit):
    url = (f"{SU}/rest/v1/onlyfans_profiles"
           f"?select=id,username,name,avatar,favoritedcount,face_metrics"
           f"&face_metrics_version=eq.{version}"
           f"&face_metrics->>hairColor=eq.{bucket}"
           f"&order=favoritedcount.desc.nullslast"
           f"&limit={limit}")
    r = requests.get(url, headers=HDR, timeout=60)
    r.raise_for_status()
    return r.json()


def build_html(bucket, rows, version):
    cards = []
    n_resamp_match = 0
    n_no_face = 0
    n_dl_fail = 0
    print(f'building {len(rows)} cards...', flush=True)
    for i, r in enumerate(rows):
        if (i + 1) % 25 == 0:
            print(f'  {i+1}/{len(rows)}', flush=True)
        avatar = r.get('avatar') or ''
        img = dl(avatar) if avatar else None
        if img is None:
            n_dl_fail += 1
            continue
        annot, resamp_label, nz = annotate(img)
        if resamp_label == 'no-face':
            n_no_face += 1
        if resamp_label == bucket:
            n_resamp_match += 1
        uri = img_to_data_uri(annot, max_w=480)
        match_class = 'agree' if resamp_label == bucket else 'disagree'
        cards.append(f'''
<div class="card {match_class}" data-id="{r['id']}" data-user="{r['username']}">
  <img src="{uri}" alt="{r['username']}">
  <div class="meta">
    <div class="user"><a href="https://onlyfans.com/{r['username']}" target="_blank" rel="noopener">@{r['username']}</a></div>
    <div class="labels">stored:<b>{bucket}</b> &middot; resample:<b>{resamp_label}</b> &middot; zones:{nz}</div>
    <div class="actions">
      <button class="wrong-btn" onclick="markWrong(this)">❌ Wrong</button>
      <button class="ok-btn" onclick="markOk(this)">✅ Correct</button>
    </div>
  </div>
</div>''')

    summary = (f'Bucket=<b>{bucket}</b> &middot; v={version} &middot; '
               f'pulled={len(rows)} &middot; rendered={len(cards)} &middot; '
               f'resample-agrees={n_resamp_match}/{len(cards)} '
               f'({100*n_resamp_match//max(1,len(cards))}%) &middot; '
               f'no-face={n_no_face} &middot; dl-fail={n_dl_fail}')

    html = f'''<!doctype html>
<html><head><meta charset="utf-8"><title>Hair audit: {bucket}</title>
<style>
body {{ background:#0a0a0f; color:#f0f0f5; font-family: system-ui, sans-serif; margin:0; padding:20px; }}
h1 {{ margin: 0 0 8px; }}
.summary {{ color:#aab; margin-bottom:16px; padding:10px; background:#12121a; border-radius:8px; }}
.controls {{ margin-bottom: 16px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }}
button {{ background:#7c3aed; color:#fff; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:600; }}
button:hover {{ background:#a855f7; }}
.filter-btn {{ background:#1a1a2e; color:#aab; }}
.filter-btn.active {{ background:#7c3aed; color:#fff; }}
.grid {{ display:grid; grid-template-columns: repeat(4, 1fr); gap:14px; }}
@media (max-width:1100px) {{ .grid {{ grid-template-columns: repeat(3,1fr); }} }}
@media (max-width:700px)  {{ .grid {{ grid-template-columns: repeat(2,1fr); }} }}
.card {{ background:#12121a; border-radius:12px; overflow:hidden; border:2px solid transparent; transition:.15s; }}
.card.agree {{ border-color: #22c55e44; }}
.card.disagree {{ border-color: #ef444466; }}
.card.flag-wrong {{ border-color:#ef4444; box-shadow:0 0 0 2px #ef444466; }}
.card.flag-ok {{ border-color:#22c55e; box-shadow:0 0 0 2px #22c55e66; }}
.card img {{ width:100%; display:block; }}
.meta {{ padding: 8px 10px; font-size: 13px; }}
.user a {{ color:#7c3aed; text-decoration:none; font-weight:600; }}
.labels {{ color:#8888aa; margin-top: 4px; font-size: 12px; }}
.actions {{ display:flex; gap:6px; margin-top:8px; }}
.wrong-btn {{ background:#ef4444; padding:6px 10px; font-size:12px; }}
.wrong-btn:hover {{ background:#dc2626; }}
.ok-btn {{ background:#22c55e; padding:6px 10px; font-size:12px; }}
.ok-btn:hover {{ background:#16a34a; }}
.card.hidden {{ display:none; }}
</style>
</head><body>
<h1>Hair audit — {bucket}</h1>
<div class="summary">{summary}</div>
<div class="controls">
  <button class="filter-btn active" data-f="all">All</button>
  <button class="filter-btn" data-f="agree">Resample agrees</button>
  <button class="filter-btn" data-f="disagree">Resample disagrees</button>
  <button class="filter-btn" data-f="unflagged">Unflagged</button>
  <span style="margin-left:auto;color:#aab" id="counter"></span>
  <button onclick="downloadCSV()">⬇ Download wrong CSV</button>
</div>
<div class="grid" id="grid">
{''.join(cards)}
</div>
<script>
const BUCKET = {json.dumps(bucket)};
const wrong = JSON.parse(localStorage.getItem('hair_wrong_'+BUCKET) || '{{}}');
const ok    = JSON.parse(localStorage.getItem('hair_ok_'+BUCKET)    || '{{}}');
function paint() {{
  document.querySelectorAll('.card').forEach(c => {{
    c.classList.remove('flag-wrong','flag-ok');
    const id = c.dataset.id;
    if (wrong[id]) c.classList.add('flag-wrong');
    if (ok[id])    c.classList.add('flag-ok');
  }});
  const w = Object.keys(wrong).length, o = Object.keys(ok).length;
  document.getElementById('counter').textContent = `flagged: wrong=${{w}} correct=${{o}}`;
}}
function markWrong(btn) {{
  const card = btn.closest('.card'); const id = card.dataset.id;
  if (wrong[id]) {{ delete wrong[id]; }} else {{ wrong[id] = card.dataset.user; delete ok[id]; }}
  localStorage.setItem('hair_wrong_'+BUCKET, JSON.stringify(wrong));
  localStorage.setItem('hair_ok_'+BUCKET, JSON.stringify(ok));
  paint();
}}
function markOk(btn) {{
  const card = btn.closest('.card'); const id = card.dataset.id;
  if (ok[id]) {{ delete ok[id]; }} else {{ ok[id] = card.dataset.user; delete wrong[id]; }}
  localStorage.setItem('hair_wrong_'+BUCKET, JSON.stringify(wrong));
  localStorage.setItem('hair_ok_'+BUCKET, JSON.stringify(ok));
  paint();
}}
function downloadCSV() {{
  const lines = ['id,username,bucket,verdict'];
  Object.entries(wrong).forEach(([id,u]) => lines.push(`${{id}},${{u}},${{BUCKET}},wrong`));
  Object.entries(ok).forEach(([id,u]) => lines.push(`${{id}},${{u}},${{BUCKET}},correct`));
  const blob = new Blob([lines.join('\\n')], {{type:'text/csv'}});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `hair_audit_${{BUCKET}}.csv`; a.click();
}}
document.querySelectorAll('.filter-btn').forEach(b => b.addEventListener('click', () => {{
  document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const f = b.dataset.f;
  document.querySelectorAll('.card').forEach(c => {{
    let show = true;
    if (f === 'agree') show = c.classList.contains('agree');
    else if (f === 'disagree') show = c.classList.contains('disagree');
    else if (f === 'unflagged') show = !wrong[c.dataset.id] && !ok[c.dataset.id];
    c.classList.toggle('hidden', !show);
  }});
}}));
paint();
</script>
</body></html>'''
    return html


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('bucket', help='hair color bucket, e.g. blonde')
    ap.add_argument('--version', type=int, default=14, help='face_metrics_version to query')
    ap.add_argument('--limit', type=int, default=200)
    args = ap.parse_args()

    print(f'querying v{args.version} bucket={args.bucket} limit={args.limit}...', flush=True)
    rows = fetch_rows(args.bucket, args.version, args.limit)
    print(f'  got {len(rows)} rows', flush=True)
    if not rows:
        print('No rows. Has v14 extraction reached creators with this label?')
        sys.exit(1)

    html = build_html(args.bucket, rows, args.version)
    out_path = os.path.join(OUT_DIR, f'hair_{args.bucket}.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    abs_path = os.path.abspath(out_path)
    print(f'\nDONE: {abs_path}')
    print(f'open in browser: file:///{abs_path.replace(os.sep, "/")}')


if __name__ == '__main__':
    main()
