import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PIXXI_BASE_URL = Deno.env.get('PIXXI_BASE_URL') || 'https://pixxicrm.ae';
const PIXXI_API_TOKEN = Deno.env.get('PIXXI_API_TOKEN');
const PIXXI_PF_SECRET = Deno.env.get('PIXXI_PF_SECRET');
const PIXXI_BAYUT_TOKEN = Deno.env.get('PIXXI_BAYUT_TOKEN');

async function tryFetch(url, headers = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    const text = await res.text();
    return { status: res.status, body: text.slice(0, 800) };
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
    const path = body.path || '/api/sync/propertyFinder/Realco';
    const auth = body.auth || 'bearer';

    const url = `${PIXXI_BASE_URL}${path}`;
    let headers = {};

    if (auth === 'bearer') headers['Authorization'] = `Bearer ${PIXXI_API_TOKEN}`;
    else if (auth === 'pf') headers['Authorization'] = `Bearer ${PIXXI_API_TOKEN}`;
    else if (auth === 'pf-secret') headers['Authorization'] = `Bearer ${PIXXI_PF_SECRET}`;
    else if (auth === 'bayut') headers['Authorization'] = `Bearer ${PIXXI_BAYUT_TOKEN}`;
    else if (auth === 'token-header') headers['token'] = PIXXI_API_TOKEN;
    else if (auth === 'x-api-key') headers['X-API-Key'] = PIXXI_API_TOKEN;
    else if (auth === 'none') headers = {};

    const result = await tryFetch(url, headers);

    return Response.json({
      url,
      auth,
      env: {
        base_url: PIXXI_BASE_URL,
        pf_token_preview: PIXXI_API_TOKEN?.slice(0, 10) + '...',
        pf_secret_preview: PIXXI_PF_SECRET?.slice(0, 8) + '...',
        bayut_token_preview: PIXXI_BAYUT_TOKEN?.slice(0, 8) + '...',
      },
      ...result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});