import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { search, limit = 200 } = body;

    const agentDb = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { db: { schema: 'agent' } }
    );

    let query = agentDb
      .from('antigravity_units_master')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`unit_number.ilike.%${search}%,project_name.ilike.%${search}%,community.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getPocketInventory] Query error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[getPocketInventory] Returned', data?.length, 'units');
    return Response.json({ units: data || [] });
  } catch (err) {
    console.error('[getPocketInventory]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});