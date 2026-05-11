import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PIXXI_BASE_URL = Deno.env.get('PIXXI_BASE_URL');
const PIXXI_API_TOKEN = Deno.env.get('PIXXI_API_TOKEN');

async function pixxiFetch(path, authStyle = 'bearer') {
  const headers = { 'Content-Type': 'application/json' };
  let url = `${PIXXI_BASE_URL}${path}`;

  if (authStyle === 'bearer') headers['Authorization'] = `Bearer ${PIXXI_API_TOKEN}`;
  else if (authStyle === 'token') headers['Authorization'] = `Token ${PIXXI_API_TOKEN}`;
  else if (authStyle === 'apikey') headers['X-API-Key'] = PIXXI_API_TOKEN;
  else if (authStyle === 'api-token') headers['api-token'] = PIXXI_API_TOKEN;
  else if (authStyle === 'x-token') headers['X-Token'] = PIXXI_API_TOKEN;
  else if (authStyle === 'query') url += `${path.includes('?') ? '&' : '?'}token=${PIXXI_API_TOKEN}`;
  else if (authStyle === 'query_api') url += `${path.includes('?') ? '&' : '?'}api_token=${PIXXI_API_TOKEN}`;

  const res = await fetch(url, { headers });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 2000) };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const path = body.path || '/';
    const authStyle = body.auth || 'bearer';

    const result = await pixxiFetch(path, authStyle);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});