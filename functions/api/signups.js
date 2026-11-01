// GET /api/signups?key=...  – zoznam e-mailov pre správcu (kľúč je premenná prostredia ADMIN_KEY)
const cors = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };

export async function onRequestGet({ request, env }) {
  const key = new URL(request.url).searchParams.get('key');
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    return Response.json({ error: 'Zlý kľúč' }, { status: 401, headers: cors });
  }
  const emails = [];
  let cursor;
  do {
    const page = await env.SIGNUPS.list({ cursor });
    const rows = await Promise.all(page.keys.map((k) => env.SIGNUPS.get(k.name, 'json')));
    emails.push(...rows.filter(Boolean));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  emails.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return Response.json({ emails }, { headers: cors });
}
