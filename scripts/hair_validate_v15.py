"""Re-classify the 125 ground-truth rows using v15 classify_hair() in-process,
without re-extracting from network. Uses the per-row HSV the diagnose script
prints, fetched fresh via hair_diagnose.diagnose() so it picks up v15.

Usage:
  python scripts/hair_validate_v15.py path/to/hair_audit_blonde.csv
"""
from __future__ import annotations
import csv, sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import requests, cv2, numpy as np
from PIL import Image
from io import BytesIO
import extract_face_metrics as efm
from hair_diagnose import sample_hair_with_trace, fetch_avatar, SU, HDR  # type: ignore


def diagnose(img_rgb):
    h, w = img_rgb.shape[:2]
    res = efm.FACE_MESH.process(img_rgb)
    if not res.multi_face_landmarks:
        return "no_face", {}
    lms = res.multi_face_landmarks[0]
    p = {k: efm.pt(lms, idx, w, h) for k, idx in efm.LM.items()}
    face_h = efm.dist(p["forehead_top"], p["chin"])
    if face_h <= 0:
        return "no_face", {}
    return sample_hair_with_trace(img_rgb, p, face_h)


def main(csv_path: str):
    rows = []
    with open(csv_path, newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            rows.append(r)

    wrong_rows = [r for r in rows if r['verdict'] == 'wrong']
    correct_rows = [r for r in rows if r['verdict'] == 'correct']
    print(f"Loaded {len(wrong_rows)} wrong + {len(correct_rows)} correct")

    stats = {
        'wrong_total': 0, 'wrong_now_blonde': 0, 'wrong_now_other': 0,
        'correct_total': 0, 'correct_now_blonde': 0, 'correct_now_other': 0,
    }
    detail = []
    for i, r in enumerate(rows):
        print(f"[{i+1}/{len(rows)}] {r['username']} ({r['verdict']})", flush=True)
        try:
            row = fetch_avatar(int(r['id']))
            if not row or not row.get('avatar'):
                print("  no avatar", flush=True)
                continue
            url = row['avatar']
            proxied = (
                "https://images.weserv.nl/?url="
                + requests.utils.quote(url.replace('https://', '').replace('http://', ''))
                + "&w=640&output=jpg"
            )
            resp = requests.get(proxied, timeout=20,
                headers={"User-Agent": "Mozilla/5.0 (findbyface metrics extractor)"})
            if resp.status_code != 200:
                print(f"  HTTP {resp.status_code}", flush=True)
                continue
            img = Image.open(BytesIO(resp.content)).convert('RGB')
            img_rgb = np.array(img)
            label, trace = diagnose(img_rgb)
            print(f"  -> {label}", flush=True)
        except Exception as e:
            detail.append((r['username'], r['verdict'], 'error', str(e)))
            print(f"ERR {r['username']}: {e}")
            continue
        verdict = r['verdict']
        if verdict == 'wrong':
            stats['wrong_total'] += 1
            if label == 'blonde': stats['wrong_now_blonde'] += 1
            else: stats['wrong_now_other'] += 1
        elif verdict == 'correct':
            stats['correct_total'] += 1
            if label == 'blonde': stats['correct_now_blonde'] += 1
            else: stats['correct_now_other'] += 1
        detail.append((r['username'], verdict, label, ''))
        time.sleep(0.05)

    print()
    print("=== v15 results ===")
    wt = stats['wrong_total']; ct = stats['correct_total']
    if wt:
        print(f"wrong  rows reclassified: {stats['wrong_now_other']}/{wt} = "
              f"{stats['wrong_now_other']*100//max(wt,1)}% fixed")
    if ct:
        print(f"correct rows still blonde: {stats['correct_now_blonde']}/{ct} = "
              f"{stats['correct_now_blonde']*100//max(ct,1)}% kept")
    print()
    print("=== Reclassified WRONG rows (no longer blonde - GOOD) ===")
    for u, v, lbl, err in detail:
        if v == 'wrong' and lbl != 'blonde':
            print(f"  {u:30s} -> {lbl} {err}")
    print()
    print("=== Still-WRONG rows (still blonde - BAD) ===")
    for u, v, lbl, err in detail:
        if v == 'wrong' and lbl == 'blonde':
            print(f"  {u:30s} -> blonde")
    print()
    print("=== Lost CORRECT rows (no longer blonde - BAD) ===")
    for u, v, lbl, err in detail:
        if v == 'correct' and lbl != 'blonde':
            print(f"  {u:30s} -> {lbl}")


if __name__ == '__main__':
    main(sys.argv[1])
