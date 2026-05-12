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

    const agentDb = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { db: { schema: 'agent' } }
    );

    // ADMIN: ALWAYS get global data, no workspace filtering
    if (isAdmin) {
      const { data, error } = await agentDb
        .from('raco_owner_intelligence')
        .select('id, owner_name, email, mobile, owner_area, property_id, source_system, owner_record_count, linked_project_count')
        .limit(2000);

      if (error) {
        console.error('[getOwners] Admin query error:', JSON.stringify(error));
        return Response.json({ error: error.message }, { status: 500 });
      }

      console.log('[getOwners] ADMIN GLOBAL | count:', data?.length);
      return Response.json({ owners: data || [], is_global: true });
    }

    // Non-admin: scope by workspace assignments
    const scopeEmail = user.email;

    // Mandatory: look up v_workspace_assignments
    const { data: wsRows, error: wsError } = await supabase
      .from('v_workspace_assignments')
      .select('zone, area')
      .eq('user_email', scopeEmail);

    if (wsError) {
      console.error('[getOwners] Workspace query error:', JSON.stringify(wsError));
      return Response.json({ owners: [], is_global: false, reason: 'workspace_error' });
    }

    if (!wsRows || wsRows.length === 0) {
      console.log('[getOwners] No assignments for', scopeEmail, '— returning empty');
      return Response.json({ owners: [], is_global: false, reason: 'no_scope' });
    }

    // Collect zones and areas to filter owners
    const assignedZones = [...new Set(wsRows.flatMap(r => [r.zone, r.area]).filter(Boolean))];

    if (assignedZones.length === 0) {
      console.log('[getOwners] Empty assignments for', scopeEmail);
      return Response.json({ owners: [], is_global: false, reason: 'no_scope' });
    }

    // Scope owners by owner_area matching assigned zones OR linked project
    let q = agentDb
      .from('raco_owner_intelligence')
      .select('id, owner_name, email, mobile, owner_area, property_id, source_system, owner_record_count, linked_project_count')
      .limit(2000);

    if (assignedZones.length > 0) {
      q = q.in('owner_area', assignedZones);
    }

    const { data, error } = await q;

    if (error) {
      console.error('[getOwners] Scoped query error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[getOwners] scope:', scopeEmail, '| zones:', assignedZones, '| count:', data?.length);
    return Response.json({ owners: data || [], is_global: false });
  } catch (err) {
    console.error('[getOwners]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});