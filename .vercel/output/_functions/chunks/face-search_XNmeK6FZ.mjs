const POST = async ({ request }) => {
  const SUPABASE_URL = "https://sirudrqheimbgpkchtwi.supabase.co"?.replace(/\/+$/, "");
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnVkcnFoZWltYmdwa2NodHdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUxNTk0NiwiZXhwIjoyMDc3MDkxOTQ2fQ.FJmA1ChyHy-rgcVMy5aklDrZjijRc-yfyLRC8tN8XFs";
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500 });
  }
  let _descriptor = [];
  try {
    const body = await request.json();
    _descriptor = body.descriptor ?? [];
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }
  const params = new URLSearchParams({
    select: "id,username,name,avatar,isverified,subscribeprice,favoritedcount",
    order: "favoritedcount.desc",
    limit: "12"
  });
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Accept-Profile": "public"
    }
  });
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: "Supabase error" }), { status: 502 });
  }
  const raw = await resp.json();
  const results = raw.map((c) => ({
    id: c.id,
    username: c.username,
    name: c.name,
    avatar: c.avatar,
    isVerified: c.isverified,
    subscribePrice: c.subscribeprice,
    favoritedCount: c.favoritedcount,
    matchPct: Math.floor(Math.random() * 22) + 75
    // 75–97% mock
  }));
  return new Response(JSON.stringify({ results }), {
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
