"""Analyze the HSV ranges that produce blonde labels for wrong vs correct cases."""
import os, sys, csv, requests, urllib.parse
import numpy as np, cv2, mediapipe as mp
from dotenv import load_dotenv
load_dotenv()
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
import extract_face_metrics as efm
from hair_diagnose import sample_hair_with_trace, dl, fetch_avatar

mpfm = mp.solutions.face_mesh
fm = mpfm.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True)

rows = list(csv.DictReader(open(sys.argv[1])))
by = {'wrong': [], 'correct': []}
for i, r in enumerate(rows):
    if (i+1) % 10 == 0: print(f'  {i+1}/{len(rows)}', flush=True)
    prof = fetch_avatar(r['id'])
    if not prof: continue
    img = dl(prof.get('avatar') or '')
    if img is None: continue
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    res = fm.process(rgb)
    if not res.multi_face_landmarks: continue
    lm = res.multi_face_landmarks[0].landmark
    H, W = rgb.shape[:2]
    p = {n: np.array([lm[i].x*W, lm[i].y*H]) for n,i in efm.LM.items() if i<len(lm)}
    face_h = float(abs(p['chin_pad'][1] - p['forehead_top'][1]))
    final, trace = sample_hair_with_trace(rgb, p, face_h)
    if final != 'blonde':  # only inspect what got tagged blonde
        continue
    blonde_zones = [z for z in trace.get('zones',[]) if z.get('label') == 'blonde']
    if not blonde_zones: continue
    medians = [z['median_hsv'] for z in blonde_zones]
    h_avg = np.mean([m[0] for m in medians]); s_avg = np.mean([m[1] for m in medians]); v_avg = np.mean([m[2] for m in medians])
    skin = trace.get('skin') or (0,0,0)
    by[r['verdict']].append({'id': r['id'], 'user': r['username'], 'h': h_avg, 's': s_avg, 'v': v_avg, 'skin_v': skin[2], 'dv': v_avg - skin[2], 'n_zones': len(blonde_zones), 'top_in': any(z['name']=='top' for z in blonde_zones)})

print('\n=== blonde-tagged: WRONG cases ===')
print(f'n={len(by["wrong"])}')
if by['wrong']:
    arr = np.array([(x['h'],x['s'],x['v'],x['skin_v'],x['dv']) for x in by['wrong']])
    print(f'h:  mean={arr[:,0].mean():.1f}  median={np.median(arr[:,0]):.1f}  range={arr[:,0].min():.1f}..{arr[:,0].max():.1f}')
    print(f's:  mean={arr[:,1].mean():.1f}  median={np.median(arr[:,1]):.1f}  range={arr[:,1].min():.1f}..{arr[:,1].max():.1f}')
    print(f'v:  mean={arr[:,2].mean():.1f}  median={np.median(arr[:,2]):.1f}  range={arr[:,2].min():.1f}..{arr[:,2].max():.1f}')
    print(f'skin_v: mean={arr[:,3].mean():.1f}  median={np.median(arr[:,3]):.1f}')
    print(f'dv (hair-skin): mean={arr[:,4].mean():.1f}  median={np.median(arr[:,4]):.1f}  range={arr[:,4].min():.1f}..{arr[:,4].max():.1f}')
    n_with_top = sum(1 for x in by['wrong'] if x['top_in'])
    print(f'has top zone blonde: {n_with_top}/{len(by["wrong"])}')

print('\n=== blonde-tagged: CORRECT cases ===')
print(f'n={len(by["correct"])}')
if by['correct']:
    arr = np.array([(x['h'],x['s'],x['v'],x['skin_v'],x['dv']) for x in by['correct']])
    print(f'h:  mean={arr[:,0].mean():.1f}  median={np.median(arr[:,0]):.1f}  range={arr[:,0].min():.1f}..{arr[:,0].max():.1f}')
    print(f's:  mean={arr[:,1].mean():.1f}  median={np.median(arr[:,1]):.1f}  range={arr[:,1].min():.1f}..{arr[:,1].max():.1f}')
    print(f'v:  mean={arr[:,2].mean():.1f}  median={np.median(arr[:,2]):.1f}  range={arr[:,2].min():.1f}..{arr[:,2].max():.1f}')
    print(f'skin_v: mean={arr[:,3].mean():.1f}  median={np.median(arr[:,3]):.1f}')
    print(f'dv (hair-skin): mean={arr[:,4].mean():.1f}  median={np.median(arr[:,4]):.1f}  range={arr[:,4].min():.1f}..{arr[:,4].max():.1f}')
    n_with_top = sum(1 for x in by['correct'] if x['top_in'])
    print(f'has top zone blonde: {n_with_top}/{len(by["correct"])}')

# Print individual rows so we can spot patterns
print('\n=== WRONG cases (per row) ===')
for x in sorted(by['wrong'], key=lambda y: y['v']):
    print(f"  {x['user']:30s} h={x['h']:5.1f} s={x['s']:5.1f} v={x['v']:5.1f} skin_v={x['skin_v']:3d} dv={x['dv']:+5.1f} zones={x['n_zones']} top={x['top_in']}")
print('\n=== CORRECT cases (per row) ===')
for x in sorted(by['correct'], key=lambda y: y['v']):
    print(f"  {x['user']:30s} h={x['h']:5.1f} s={x['s']:5.1f} v={x['v']:5.1f} skin_v={x['skin_v']:3d} dv={x['dv']:+5.1f} zones={x['n_zones']} top={x['top_in']}")
