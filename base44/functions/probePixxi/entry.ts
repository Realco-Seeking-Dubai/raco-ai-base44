import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PIXXI_BASE_URL = Deno.env.get('PIXXI_BASE_URL');
const PIXXI_API_TOKEN = Deno.env.get('PIXXI_API_TOKEN');

async function tryAuth(url, headers) {
  try {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...headers } });
    const text = await res.text();
    return { status: res.status, body: text.slice(0, 500) };
  } catch (e) {
    return { status: 'error', body: e.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const path = body.path || '/users';

    // If a specific auth style is requested, use it
    if (body.auth) {
      const headers = {};
      let url = `${PIXXI_BASE_URL}${path}`;
      if (body.auth === 'bearer') headers['Authorization'] = `Bearer ${PIXXI_API_TOKEN}`;
      else if (body.auth === 'token') headers['Authorization'] = `Token ${PIXXI_API_TOKEN}`;
      else if (body.auth === 'apikey') headers['X-API-Key'] = PIXXI_API_TOKEN;
      else if (body.auth === 'api-token') headers['api-token'] = PIXXI_API_TOKEN;
      else if (body.auth === 'x-token') headers['X-Token'] = PIXXI_API_TOKEN;
      else if (body.auth === 'query') url += `${path.includes('?') ? '&' : '?'}token=${PIXXI_API_TOKEN}`;
      else if (body.auth === 'query_api') url += `${path.includes('?') ? '&' : '?'}api_token=${PIXXI_API_TOKEN}`;
      else if (body.auth === 'none') { /* no auth */ }
      const result = await tryAuth(url, headers);
      return Response.json({ auth: body.auth, url, token_preview: PIXXI_API_TOKEN?.slice(0,8) + '...', ...result });
    }

    // Scan mode: try all auth styles
    const baseUrl = `${PIXXI_BASE_URL}${path}`;
    const results = await Promise.all([
      tryAuth(baseUrl, { 'Authorization': `Bearer ${PIXXI_API_TOKEN}` }).then(r => ({ auth: 'bearer', ...r })),
      tryAuth(baseUrl, { 'Authorization': `Token ${PIXXI_API_TOKEN}` }).then(r => ({ auth: 'token', ...r })),
      tryAuth(baseUrl, { 'X-API-Key': PIXXI_API_TOKEN }).then(r => ({ auth: 'apikey', ...r })),
      tryAuth(baseUrl, { 'api-token': PIXXI_API_TOKEN }).then(r => ({ auth: 'api-token', ...r })),
      tryAuth(baseUrl, { 'X-Token': PIXXI_API_TOKEN }).then(r => ({ auth: 'x-token', ...r })),
      tryAuth(`${baseUrl}${path.includes('?') ? '&' : '?'}token=${PIXXI_API_TOKEN}`, {}).then(r => ({ auth: 'query-token', ...r })),
      tryAuth(`${baseUrl}${path.includes('?') ? '&' : '?'}api_token=${PIXXI_API_TOKEN}`, {}).then(r => ({ auth: 'query-api_token', ...r })),
      tryAuth(baseUrl, {}).then(r => ({ auth: 'no-auth', ...r })),
    ]);

    return Response.json({
      base_url: PIXXI_BASE_URL,
      token_preview: PIXXI_API_TOKEN?.slice(0, 8) + '...',
      token_length: PIXXI_API_TOKEN?.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});