"""Direct DB audit (skips API). For each hairColor bucket in v11 stored
labels, sample N random rows, download avatar, re-run v12 extractor logic,
compare to ground truth (simple top-band median).
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


def proxy(url, w=640):
    no = url.replace('https://','').replace('http://','')
    return f"https://images.weserv.nl/?url={urllib.parse.quote(no)}&w={w}&output=jpg"


def dl(url, w=640):
    try:
        r = requests.get(proxy(url, w), headers=UA, timeout=12)
        if r.status_code != 200: return None
        return cv2.imdecode(np.frombuffer(r.content, np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        return None


def simple(img_bgr):
    h, w = img_bgr.shape[:2]
    band = img_bgr[0:int(h*0.30), int(w*0.25):int(w*0.75)]
    hsv = cv2.cvtColor(band, cv2.COLOR_BGR2HSV).reshape(-1,3)
    m = (hsv[:,2]>25)&(hsv[:,2]<245)&~((hsv[:,2]>230)&(hsv[:,1]<25))
    if m.sum()<100: return ('?', None)
    Hm,Sm,Vm = np.median(hsv[m], axis=0).astype(int)
    return (efm.classify_hair(int(Hm),int(Sm),int(Vm), skin_v=160), (int(Hm),int(Sm),int(Vm)))


def resample(img_bgr):
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    res = fm.process(rgb)
    if not res.multi_face_landmarks: return 'no-face'
    lm = res.multi_face_landmarks[0].landmark
    HH, WW = rgb.shape[:2]
    p = {n: np.array([lm[i].x*WW, lm[i].y*HH]) for n,i in efm.LM.items() if i<len(lm)}
    face_h = float(abs(p['chin_pad'][1]-p['forehead_top'][1]))
    return efm.sample_hair_color(rgb, p, face_h)


BUCKETS = ['blonde','black','brown','dark-brown','pink','red','ginger','dirty-blonde','auburn']
N_PER = 20

print(f"{'stored':14s} {'n':>3s} {'v12=stored':>10s} {'simple=v12':>10s} {'simple=stored':>14s}")
print('='*90)
grand = {'r12':0,'sim_v12':0,'sim_stor':0,'tot':0}
detail = {}
for bucket in BUCKETS:
    rows = requests.get(
        f"{SU}/rest/v1/onlyfans_profiles?select=username,avatar&face_metrics_version=eq.11&face_metrics->>hairColor=eq.{bucket}&order=favoritedcount.desc&limit=200",
        headers=H, timeout=30
    ).json()
    if not rows: continue
    random.seed(42)
    sample = random.sample(rows, min(N_PER, len(rows)))
    r12=0; sv=0; ss=0; n=0
    bad=[]
    for r in sample:
        img = dl(r.get('avatar') or '', 640)
        if img is None: continue
        n += 1
        v12 = resample(img)
        sm, hsv = simple(img)
        if v12 == bucket: r12 += 1
        if sm == v12: sv += 1
        if sm == bucket: ss += 1
        if v12 != bucket:
            bad.append(f'  {r["username"]:24s} stored={bucket:10s} v12={v12:12s} simple={sm:12s} hsv={hsv}')
    print(f'{bucket:14s} {n:3d}   {r12:3d}/{n}     {sv:3d}/{n}     {ss:3d}/{n}')
    detail[bucket] = bad
    grand['tot']+=n; grand['r12']+=r12; grand['sim_v12']+=sv; grand['sim_stor']+=ss

print('='*90)
t=grand['tot']
print(f"OVERALL  v12=stored {grand['r12']}/{t} ({100*grand['r12']/max(1,t):.0f}%)  "
      f"simple=v12 {grand['sim_v12']}/{t} ({100*grand['sim_v12']/max(1,t):.0f}%)  "
      f"simple=stored {grand['sim_stor']}/{t} ({100*grand['sim_stor']/max(1,t):.0f}%)")
print('\nNon-reproducing rows (v12 disagrees with stored v11):')
for b, rows in detail.items():
    if rows:
        print(f'\n[{b}]')
        for r in rows[:8]: print(r)
