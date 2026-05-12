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

    // Admins get global data
    if (isAdmin) {
      const { data, error } = await agentDb
        .from('raco_project_intelligence')
        .select('*')
        .limit(200);

      if (error) {
        console.error('[getMarketInsights] Admin query error:', JSON.stringify(error));
        return Response.json({ error: error.message }, { status: 500 });
      }

      console.log('[getMarketInsights] ADMIN | Returned', data?.length, 'records');
      return Response.json({ insights: data || [], is_global: true });
    }

    // Non-admin: resolve assigned projects from v_workspace_assignments (MANDATORY)
    const { data: wsRows, error: wsError } = await supabase
      .from('v_workspace_assignments')
      .select('project_name, zone, area')
      .eq('user_email', user.email);

    if (wsError) {
      console.error('[getMarketInsights] Workspace query error:', JSON.stringify(wsError));
      return Response.json({ insights: [], is_global: false, reason: 'workspace_error' });
    }

    if (!wsRows || wsRows.length === 0) {
      console.log('[getMarketInsights] No assignments for', user.email, '— returning empty');
      return Response.json({ insights: [], is_global: false, reason: 'no_scope' });
    }

    // Collect all project names and zones assigned to this user
    const assignedProjects = [...new Set(wsRows.map(r => r.project_name).filter(Boolean))];
    const assignedZones = [...new Set(wsRows.map(r => r.zone || r.area).filter(Boolean))];

    if (assignedProjects.length === 0 && assignedZones.length === 0) {
      console.log('[getMarketInsights] Empty assignments for', user.email);
      return Response.json({ insights: [], is_global: false, reason: 'no_scope' });
    }

    // Filter raco_project_intelligence by master_project_name or zone
    let q = agentDb.from('raco_project_intelligence').select('*').limit(200);

    if (assignedProjects.length > 0) {
      q = q.in('master_project_name', assignedProjects);
    } else {
      q = q.in('zone', assignedZones);
    }

    const { data, error } = await q;

    if (error) {
      console.error('[getMarketInsights] Scoped query error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[getMarketInsights] USER', user.email, '| projects:', assignedProjects, '| Returned', data?.length, 'records');
    return Response.json({ insights: data || [], is_global: false });
  } catch (err) {
    console.error('[getMarketInsights]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});