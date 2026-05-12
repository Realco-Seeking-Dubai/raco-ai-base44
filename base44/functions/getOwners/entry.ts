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

    // Non-admins are forced to their own workspace via v_workspace_assignments
    const effectiveEmail = isAdmin ? (agent_email || null) : user.email;

    const agentDb = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { db: { schema: 'agent' } }
    );

    let q = agentDb
      .from('raco_owner_intelligence')
      .select('id, owner_name, email, mobile, owner_area, property_id, source_system, owner_record_count, linked_project_count')
      .limit(200);

    // For non-admins: scope to areas assigned via v_workspace_assignments
    if (effectiveEmail) {
      // Get assigned zones/areas for this agent
      const { data: wsRows } = await supabase
        .from('v_workspace_assignments')
        .select('zone, project_name, area')
        .eq('user_email', effectiveEmail);

      if (wsRows && wsRows.length > 0) {
        const areas = [...new Set(wsRows.map(r => r.area || r.zone).filter(Boolean))];
        if (areas.length > 0) {
          q = q.in('owner_area', areas);
        } else {
          // No assignments found — return empty for non-admin
          if (!isAdmin) {
            console.log('[getOwners] No workspace assignments found for', effectiveEmail);
            return Response.json({ owners: [], is_global: false });
          }
        }
      } else if (!isAdmin) {
        // Non-admin with no workspace assignments gets empty result
        console.log('[getOwners] No workspace assignments for non-admin', effectiveEmail);
        return Response.json({ owners: [], is_global: false });
      }
    }

    const { data, error } = await q;

    if (error) {
      console.error('[getOwners] Query error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[getOwners] isAdmin:', isAdmin, '| scope:', effectiveEmail || 'GLOBAL', '| count:', data?.length);
    return Response.json({ owners: data || [], is_global: isAdmin && !effectiveEmail });
  } catch (err) {
    console.error('[getOwners]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});