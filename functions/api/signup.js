// POST /api/signup  (telo: email=...) – uloží e-mail zo sťahovania do KV (väzba SIGNUPS)
export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  const email = String(form?.get('email') || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return Response.json({ ok: false, error: 'Neplatný e-mail' }, { status: 400 });
  }
  await env.SIGNUPS.put(email, JSON.stringify({ email, date: new Date().toISOString() }));
  return Response.json({ ok: true });
}
