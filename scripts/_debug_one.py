"""Debug: visualize where the extractor's forehead probes land for one creator."""
import os, sys, urllib.parse, requests
import numpy as np, cv2
import mediapipe as mp
from dotenv import load_dotenv
load_dotenv()

# Patch into the extractor
sys.path.insert(0, 'scripts')
from extract_face_metrics import LM as LANDMARKS, sample_hair_color, sample_color, classify_hair

UA = {"User-Agent": "Mozilla/5.0 (debug)"}
mp_mesh = mp.solutions.face_mesh
fm = mp_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True)


def run(username, avatar_url):
    nu = avatar_url.replace('https://','').replace('http://','')
    proxied = f"https://images.weserv.nl/?url={urllib.parse.quote(nu)}&w=640&output=jpg"
    r = requests.get(proxied, headers=UA, timeout=15)
    if r.status_code != 200:
        print(f"download fail {username}"); return
    arr = np.frombuffer(r.content, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    H, W = rgb.shape[:2]
    res = fm.process(rgb)
    if not res.multi_face_landmarks:
        print(f"{username}: NO FACE detected on {W}x{H}"); return
    lm = res.multi_face_landmarks[0].landmark
    p = {name: np.array([lm[idx].x*W, lm[idx].y*H]) for name, idx in LANDMARKS.items()}
    fh = p["forehead_top"]
    face_h = abs(p["chin_pad"][1] - p["forehead_top"][1])
    face_w = abs(p["right_cheek"][0] - p["left_cheek"][0])
    cheek = sample_color(rgb, int(p["left_cheek"][0]), int(p["left_cheek"][1]), 6)
    print(f"\n=== {username} ({W}x{H}) face_h={face_h:.0f} face_w={face_w:.0f} forehead=({fh[0]:.0f},{fh[1]:.0f}) cheek={cheek}")
    # forehead probes
    OFFSETS = [(-.20,-.20),(-.10,-.25),(0,-.28),(.10,-.25),(.20,-.20),(-.15,-.15),(.15,-.15)]
    print("  forehead probes (rel offsets in face_h units):")
    for ox, oy in OFFSETS:
        px = int(fh[0] + ox * face_w)
        py = int(fh[1] + oy * face_h)
        s = sample_color(rgb, px, py, 4)
        in_bounds = 0 <= px < W and 0 <= py < H
        print(f"    ({ox:+.2f},{oy:+.2f}) -> ({px},{py}) inb={in_bounds} HSV={s}")
    # top strip
    strip_y = int(fh[1] * 0.5)
    print(f"  top strip y={strip_y}:")
    cl = int(p["left_cheek"][0]); cr = int(p["right_cheek"][0])
    for x in np.linspace(cl, cr, 5):
        s = sample_color(rgb, int(x), strip_y, 4)
        print(f"    x={int(x)} y={strip_y} HSV={s}")
    # final
    label = sample_hair_color(rgb, p, face_h)
    print(f"  -> sample_hair_color() returns: {label!r}")
    # compare to plain top 30%
    band = bgr[0:int(H*0.30), int(W*0.25):int(W*0.75)]
    hsv = cv2.cvtColor(band, cv2.COLOR_BGR2HSV).reshape(-1,3)
    mask = (hsv[:,2] > 25) & (hsv[:,2] < 245)
    if mask.sum() > 100:
        med = np.median(hsv[mask], axis=0).astype(int)
        print(f"  -> top-30% median HSV: H{med[0]} S{med[1]} V{med[2]}")
    # save annotated
    annotated = bgr.copy()
    cv2.circle(annotated, (int(fh[0]), int(fh[1])), 5, (0, 255, 255), -1)
    for ox, oy in OFFSETS:
        px = int(fh[0] + ox * face_w)
        py = int(fh[1] + oy * face_h)
        if 0 <= px < W and 0 <= py < H:
            cv2.circle(annotated, (px, py), 4, (0, 0, 255), -1)
    for x in np.linspace(cl, cr, 5):
        cv2.circle(annotated, (int(x), strip_y), 4, (0, 255, 0), -1)
    os.makedirs('logs/debug', exist_ok=True)
    cv2.imwrite(f'logs/debug/{username}.jpg', annotated)
    print(f"  saved logs/debug/{username}.jpg")


SU = os.environ['SUPABASE_URL']; SK = os.environ['SUPABASE_KEY']
sh = {'apikey': SK, 'Authorization': f'Bearer {SK}'}

def trace(username, avatar_url):
    """Print each column's first-hair-pixel scan."""
    nu = avatar_url.replace('https://','').replace('http://','')
    proxied = f"https://images.weserv.nl/?url={urllib.parse.quote(nu)}&w=640&output=jpg"
    r = requests.get(proxied, headers=UA, timeout=15)
    arr = np.frombuffer(r.content, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    H, W = rgb.shape[:2]
    res = fm.process(rgb)
    if not res.multi_face_landmarks: return
    lm = res.multi_face_landmarks[0].landmark
    p = {name: np.array([lm[idx].x*W, lm[idx].y*H]) for name, idx in LANDMARKS.items()}
    fy = p["forehead_top"][1]; face_h = abs(p["chin_pad"][1] - p["forehead_top"][1])
    face_w = abs(p["right_cheek"][0] - p["left_cheek"][0])
    cheek_l = sample_color(rgb, int(p["left_cheek"][0]), int(p["left_cheek"][1]), 6)
    cheek_r = sample_color(rgb, int(p["right_cheek"][0]), int(p["right_cheek"][1]), 6)
    print(f"\n--- {username} cheek_l={cheek_l} cheek_r={cheek_r} fy={fy:.0f} face_h={face_h:.0f}")
    cl = int(min(p["left_cheek"][0], p["right_cheek"][0]))
    cr = int(max(p["left_cheek"][0], p["right_cheek"][0]))
    pad = int(face_w * 0.10)
    x0 = max(0, cl - pad); x1 = min(W-1, cr + pad)
    y_top = 2; y_bot = max(y_top+4, int(fy - face_h*0.05))
    skin_h = int(np.median([c[0] for c in (cheek_l, cheek_r) if c]))
    skin_v = int(np.median([c[2] for c in (cheek_l, cheek_r) if c]))
    skin_s = int(np.median([c[1] for c in (cheek_l, cheek_r) if c]))
    print(f"  scan y_top={y_top} y_bot={y_bot} x0={x0} x1={x1} skin=H{skin_h} S{skin_s} V{skin_v}")
    n_cols = 18
    for i in range(n_cols):
        x = x0 + (x1-x0)*(i+1)//(n_cols+1)
        for y in range(y_top, y_bot, 4):
            col = sample_color(rgb, x, y, 3)
            if col is None: continue
            h, s, v = col
            # bg
            if v > 235 or (v > 200 and s < 18) or (90<=h<=130 and s<25 and v>170) or v<10:
                continue
            # skin
            dh = min(abs(h-skin_h), 180-abs(h-skin_h))
            skin = False
            if dh <= 8 and (h<=25 or h>=165):
                if abs(v-skin_v) < 70 and abs(s-skin_s) < 80:
                    skin = True
            elif dh <= 6 and abs(v-skin_v)<=45 and abs(s-skin_s)<=45:
                skin = True
            if skin:
                continue
            print(f"  col{i:2d} x={x} first y={y} HSV=({h},{s},{v})")
            break
        else:
            print(f"  col{i:2d} x={x} NO SURVIVOR")

for un in ['rileyreid', 'laurenjasmine', 'sarameikasaifree']:
    rr = requests.get(f"{SU}/rest/v1/onlyfans_profiles?select=username,avatar&username=eq.{un}", headers=sh, timeout=30).json()
    if rr:
        trace(rr[0]['username'], rr[0]['avatar'])

print("\n\n========= sample_hair_color() final results =========")
for un in ['sarameikasaifree','rileyreid','laurenalexisgold','xxxvanessaxxx','salicerose','brynnwoods','khlo_x','laurenjasmine']:
    rr = requests.get(f"{SU}/rest/v1/onlyfans_profiles?select=username,avatar&username=eq.{un}", headers=sh, timeout=30).json()
    if rr:
        run(rr[0]['username'], rr[0]['avatar'])
