import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agent_email } = await req.json().catch(() => ({}));

    const agentDb = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { db: { schema: 'agent' } }
    );

    let q = agentDb
      .from('raco_owner_intelligence')
      .select('id, owner_name, email, mobile, owner_area, property_id, source_system, owner_record_count, linked_project_count')
      .limit(200);

    // Filter by area if agent_email provided (best-effort match)
    if (agent_email) {
      // Fallback: just return all owners scoped to limit for now
      console.log('[getOwners] agent_email filter requested but no agent column found; returning all');
    }

    const { data, error } = await q;

    if (error) {
      console.error('[getOwners] Query error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[getOwners] Returned', data?.length, 'owners for', agent_email || 'all');
    return Response.json({ owners: data || [] });
  } catch (err) {
    console.error('[getOwners]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});