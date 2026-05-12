import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Public schema client (for views that live in public schema)
    const pub = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Agent schema client (explicit header override)
    const agent = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      {
        global: {
          headers: { 'Accept-Profile': 'agent', 'Content-Profile': 'agent' }
        }
      }
    );

    // Fetch all three tiers in parallel
    const [zonesRes, masterRes, projectsRes] = await Promise.all([
      // Zones — try public schema first (v_admin_scope_projects)
      pub.from('v_admin_scope_projects')
        .select('zone, area')
        .limit(5000),

      // Master projects — v_workspace_scopes
      pub.from('v_workspace_scopes')
        .select('project_name, zone, area')
        .not('project_name', 'is', null)
        .limit(5000),

      // Buildings/specific projects — agent schema
      agent.from('raco_project_intelligence')
        .select('master_project_name, zone, area')
        .not('master_project_name', 'is', null)
        .order('master_project_name', { ascending: true })
        .limit(5000),
    ]);

    // Deduplicate zones
    const zonesSeen = new Set();
    const zones = (zonesRes.data || []).filter(r => {
      const key = r.zone || r.area;
      if (!key || zonesSeen.has(key)) return false;
      zonesSeen.add(key);
      return true;
    });

    // Deduplicate master projects
    const masterSeen = new Set();
    const masterProjects = (masterRes.data || []).filter(r => {
      const key = r.project_name;
      if (!key || masterSeen.has(key)) return false;
      masterSeen.add(key);
      return true;
    });

    // Deduplicate buildings
    const buildingSeen = new Set();
    const projects = (projectsRes.data || []).filter(r => {
      const key = r.master_project_name;
      if (!key || buildingSeen.has(key)) return false;
      buildingSeen.add(key);
      return true;
    });

    console.log('[getScopeList] zones:', zones.length, '| masterProjects:', masterProjects.length, '| projects:', projects.length);
    console.log('[getScopeList] zones error:', zonesRes.error?.message, '| master error:', masterRes.error?.message, '| projects error:', projectsRes.error?.message);

    return Response.json({ zones, masterProjects, projects });
  } catch (err) {
    console.error('[getScopeList]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});