const POST = async ({ request }) => {
  const SUPABASE_URL = "https://sirudrqheimbgpkchtwi.supabase.co"?.replace(/\/+$/, "");
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnVkcnFoZWltYmdwa2NodHdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUxNTk0NiwiZXhwIjoyMDc3MDkxOTQ2fQ.FJmA1ChyHy-rgcVMy5aklDrZjijRc-yfyLRC8tN8XFs";
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500 });
  }
  let access_token;
  try {
    const body = await request.json();
    access_token = body.access_token;
    if (!access_token) throw new Error("No token");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${access_token}`
    }
  });
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
  }
  const user = await resp.json();
  return new Response(JSON.stringify({
    email: user.email,
    name: user.user_metadata?.full_name || user.email,
    avatar: user.user_metadata?.avatar_url || null
  }), {
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
