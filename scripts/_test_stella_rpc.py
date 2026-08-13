"""Quick diagnostic: test match_faces RPC using Stella's own stored embedding."""
import requests

URL = "https://sirudrqheimbgpkchtwi.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnVkcnFoZWltYmdwa2NodHdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUxNTk0NiwiZXhwIjoyMDc3MDkxOTQ2fQ.FJmA1ChyHy-rgcVMy5aklDrZjijRc-yfyLRC8tN8XFs"
HDRS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Accept-Profile": "public"}

# 1. Fetch Stella's record
r = requests.get(
    f"{URL}/rest/v1/onlyfans_profiles?select=id,username,favoritedcount,face_embedding&username=eq.stellaexclusive",
    headers=HDRS,
).json()
stella = r[0]
print(f"id={stella['id']}  fav={stella['favoritedcount']}")
emb_str = stella["face_embedding"]
vals = [float(x) for x in emb_str.strip("[]").split(",")]
print(f"embedding len={len(vals)}  first3={vals[:3]}")

# 2. Call the RPC with her own embedding — she should be result #1
rpc_hdrs = {**HDRS, "Content-Type": "application/json"}
resp = requests.post(
    f"{URL}/rest/v1/rpc/match_faces",
    json={"query_embedding": emb_str, "match_count": 100},
    headers=rpc_hdrs,
)
print(f"\nRPC status={resp.status_code}")
if not resp.ok:
    print("RPC error:", resp.text[:500])
else:
    results = resp.json()
    print(f"RPC returned {len(results)} results")
    names = [x["username"] for x in results]
    if "stellaexclusive" in names:
        pos = names.index("stellaexclusive")
        sim = results[pos]["similarity"]
        print(f"*** Stella at position {pos+1}, similarity={sim:.4f} ({round(sim*100)}%)")
    else:
        print("!!! Stella NOT found in RPC results")
    print("\nTop 10:")
    for i, x in enumerate(results[:10]):
        print(f"  {i+1}. {x['username']}  sim={x['similarity']:.4f}")
