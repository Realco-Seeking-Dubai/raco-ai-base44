import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function isAdminUser(supabase, userEmail) {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('email', userEmail)
      .limit(1)
      .single();
    return ['admin', 'super_admin'].includes(data?.role);
  } catch (_) {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { agent_email } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const adminByRole = ['admin', 'super_admin'].includes(user.role);
    const adminByTable = await isAdminUser(supabase, user.email);
    const isAdmin = adminByRole || adminByTable;

    const effectiveEmail = isAdmin ? (agent_email || null) : user.email;

    const agentDb = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { db: { schema: 'agent' } }
    );

    // Build scoped queries
    let leadsQ = supabase.from('pixxi_leads').select('id', { count: 'exact', head: true });
    let ownersQ = agentDb.from('raco_owner_intelligence').select('id', { count: 'exact', head: true });

    if (effectiveEmail) {
      leadsQ = leadsQ.eq('pixxi_user_email', effectiveEmail);
      // owners don't have a direct email column — scope skipped for individual agent view
    }

    const [usersRes, leadsRes, ownersRes, auditRes] = await Promise.all([
      // Only admins get the full user list; agents get a single-item summary
      isAdmin
        ? supabase.from('pixxi_users').select('id, name, lifecycle_status, is_active')
        : supabase.from('pixxi_users').select('id, name, lifecycle_status, is_active').eq('email', user.email),
      leadsQ,
      ownersQ,
      agentDb.from('outbound_messages').select('id, compliance_status, created_at')
        .not('compliance_status', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    console.log('[getDashboardStats] isAdmin:', isAdmin, '| scope:', effectiveEmail || 'GLOBAL');
    return Response.json({
      users: usersRes.data || [],
      leads_count: leadsRes.count || 0,
      owners_count: ownersRes.count || 0,
      audit_log: auditRes.data || [],
      is_global: isAdmin && !effectiveEmail,
    });
  } catch (err) {
    console.error('[getDashboardStats]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});