import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const pub = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );
    const agent = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { db: { schema: 'agent' } }
    );

    // All three sources — v_admin_scope_projects and v_workspace_scopes are in PUBLIC schema
    const [scopeProjectsRes, workspaceScopesRes, projectsRes] = await Promise.all([
      pub.from('v_admin_scope_projects')
        .select('zone, master_project_name, project')
        .limit(5000),

      pub.from('v_workspace_scopes')
        .select('zone, master_project_name, project')
        .limit(5000),

      agent.from('raco_project_intelligence')
        .select('master_project_name, area_name, final_zone_name')
        .not('master_project_name', 'is', null)
        .order('master_project_name', { ascending: true })
        .limit(5000),
    ]);

    // Extract unique zones from v_admin_scope_projects
    const zonesSeen = new Set();
    const zones = (scopeProjectsRes.data || []).filter(r => {
      const key = r.zone;
      if (!key || zonesSeen.has(key)) return false;
      zonesSeen.add(key);
      return true;
    }).map(r => ({ zone: r.zone }));

    // Extract unique master projects from v_admin_scope_projects
    const masterSeen = new Set();
    const masterProjects = (scopeProjectsRes.data || []).filter(r => {
      const key = r.master_project_name;
      if (!key || masterSeen.has(key)) return false;
      masterSeen.add(key);
      return true;
    }).map(r => ({ project_name: r.master_project_name, zone: r.zone }));

    // Extract unique buildings/projects from raco_project_intelligence
    const buildingSeen = new Set();
    const projects = (projectsRes.data || []).filter(r => {
      const key = r.master_project_name;
      if (!key || buildingSeen.has(key)) return false;
      buildingSeen.add(key);
      return true;
    }).map(r => ({ master_project_name: r.master_project_name, zone: r.final_zone_name, area: r.area_name }));

    console.log('[getScopeList] zones:', zones.length, '| masterProjects:', masterProjects.length, '| projects:', projects.length);
    console.log('[getScopeList] scopeProjects error:', scopeProjectsRes.error?.message || 'none');
    console.log('[getScopeList] workspaceScopes error:', workspaceScopesRes.error?.message || 'none');
    console.log('[getScopeList] projects error:', projectsRes.error?.message || 'none');

    return Response.json({ zones, masterProjects, projects });
  } catch (err) {
    console.error('[getScopeList] EXCEPTION:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});