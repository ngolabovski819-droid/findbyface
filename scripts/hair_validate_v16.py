"""Re-classify the 123 ground-truth rows using v16 (BiSeNet hair-mask)
sample_hair_color in-process.

Usage: python scripts/hair_validate_v16.py path/to/hair_audit_blonde.csv
"""
from __future__ import annotations
import csv, sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import requests, numpy as np
from PIL import Image
from io import BytesIO
import extract_face_metrics as efm

SU = os.environ['SUPABASE_URL']
SK = os.environ.get('SUPABASE_KEY') or os.environ['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': SK, 'Authorization': f'Bearer {SK}'}


def fetch_avatar(uid):
    r = requests.get(
        f"{SU}/rest/v1/onlyfans_profiles?id=eq.{uid}&select=username,avatar",
        headers=HDR, timeout=20)
    rows = r.json()
    return rows[0] if rows else None


def classify(img_rgb):
    h, w = img_rgb.shape[:2]
    res = efm.FACE_MESH.process(img_rgb)
    if not res.multi_face_landmarks:
        return "no_face"
    lms = res.multi_face_landmarks[0]
    p = {k: efm.pt(lms, idx, w, h) for k, idx in efm.LM.items()}
    face_h = efm.dist(p["forehead_top"], p["chin"])
    if face_h <= 0:
        return "no_face"
    return efm.sample_hair_color(img_rgb, p, face_h)


def main(csv_path: str):
    with open(csv_path, newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    print(f"Loaded {sum(1 for r in rows if r['verdict']=='wrong')} wrong + "
          f"{sum(1 for r in rows if r['verdict']=='correct')} correct", flush=True)

    stats = {'wt': 0, 'wo': 0, 'ct': 0, 'cb': 0}
    detail = []
    for i, r in enumerate(rows):
        print(f"[{i+1}/{len(rows)}] {r['username']} ({r['verdict']})", flush=True, end=' ')
        try:
            row = fetch_avatar(int(r['id']))
            if not row or not row.get('avatar'):
                print("no avatar"); continue
            url = row['avatar']
            proxied = ("https://images.weserv.nl/?url="
                + requests.utils.quote(url.replace('https://', '').replace('http://', ''))
                + "&w=640&output=jpg")
            resp = requests.get(proxied, timeout=20,
                headers={"User-Agent": "Mozilla/5.0 (findbyface metrics extractor)"})
            if resp.status_code != 200:
                print(f"HTTP {resp.status_code}"); continue
            img = Image.open(BytesIO(resp.content)).convert('RGB')
            label = classify(np.array(img))
            print(f"-> {label}", flush=True)
        except Exception as e:
            print(f"ERR {e}"); continue
        if r['verdict'] == 'wrong':
            stats['wt'] += 1
            if label != 'blonde': stats['wo'] += 1
        else:
            stats['ct'] += 1
            if label == 'blonde': stats['cb'] += 1
        detail.append((r['username'], r['verdict'], label))
        time.sleep(0.05)

    print()
    print("=== v16 results ===")
    if stats['wt']:
        print(f"wrong reclassified to non-blonde: {stats['wo']}/{stats['wt']} = {stats['wo']*100//stats['wt']}%")
    if stats['ct']:
        print(f"correct kept as blonde:           {stats['cb']}/{stats['ct']} = {stats['cb']*100//stats['ct']}%")
    print()
    print("=== Reclassified WRONG (good) ===")
    for u, v, l in detail:
        if v == 'wrong' and l != 'blonde':
            print(f"  {u:30s} -> {l}")
    print()
    print("=== Still-WRONG (bad) ===")
    for u, v, l in detail:
        if v == 'wrong' and l == 'blonde':
            print(f"  {u}")
    print()
    print("=== Lost CORRECT (bad) ===")
    for u, v, l in detail:
        if v == 'correct' and l != 'blonde':
            print(f"  {u:30s} -> {l}")


if __name__ == '__main__':
    main(sys.argv[1])
