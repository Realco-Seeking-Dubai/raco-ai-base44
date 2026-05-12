import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const agentDb = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { db: { schema: 'agent' } }
    );

    const [usersRes, leadsRes, ownersRes, auditRes] = await Promise.all([
      supabase.from('pixxi_users').select('id, name, lifecycle_status, is_active'),
      supabase.from('pixxi_leads').select('id', { count: 'exact', head: true }),
      agentDb.from('raco_owner_intelligence').select('id', { count: 'exact', head: true }),
      agentDb.from('outbound_messages').select('id, compliance_status, created_at').not('compliance_status', 'is', null).order('created_at', { ascending: false }).limit(10),
    ]);

    return Response.json({
      users: usersRes.data || [],
      leads_count: leadsRes.count || 0,
      owners_count: ownersRes.count || 0,
      audit_log: auditRes.data || [],
    });
  } catch (err) {
    console.error('[getDashboardStats]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});