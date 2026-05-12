import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Admin check: look up user in user_roles table
async function isAdmin(supabase, email) {
  try {
    const { data } = await supabase.from('user_roles').select('role').eq('email', email).limit(1).single();
    return ['admin', 'super_admin'].includes(data?.role);
  } catch (_) { return false; }
}

// Get allowed zones for a user based on workspace assignments
async function getAllowedZones(supabase, scopeEmail, userIsAdmin) {
  if (userIsAdmin) return null; // null = no restrictions
  const { data } = await supabase.from('v_workspace_assignments').select('zone').eq('user_email', scopeEmail);
  if (!data || data.length === 0) return [];
  return [...new Set(data.map(r => r.zone).filter(Boolean))];
}

// Paginated fetch
async function fetchAll(client, table, columns, filters = {}) {
  const PAGE = 1000;
  let rows = [];
  let from = 0;
  while (true) {
    let q = client.from(table).select(columns).range(from, from + PAGE - 1);
    for (const [k, v] of Object.entries(filters)) {
      if (Array.isArray(v)) q = q.in(k, v);
      else q = q.eq(k, v);
    }
    const { data, error } = await q;
    if (error) { console.error(`[getMarketHierarchy] fetchAll ${table}:`, error.message); break; }
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, zone, master_project, building } = body;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const agent = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'agent' } });

    const adminByRole = ['admin', 'super_admin'].includes(user.role);
    const adminByTable = await isAdmin(supabase, user.email);
    const userIsAdmin = adminByRole || adminByTable;
    const allowedZones = await getAllowedZones(supabase, user.email, userIsAdmin);

    // ── Action: list zones ────────────────────────────────────────────────────
    if (action === 'zones') {
      const rows = await fetchAll(agent, 'raco_project_intelligence', 'final_zone_name');
      const seen = new Set();
      const zones = [];
      for (const r of rows) {
        const z = r.final_zone_name;
        if (!z || seen.has(z)) continue;
        if (allowedZones !== null && !allowedZones.includes(z)) continue;
        seen.add(z);
        zones.push({ zone: z });
      }
      zones.sort((a, b) => a.zone.localeCompare(b.zone));
      return Response.json({ zones });
    }

    // ── Action: master projects for a zone ────────────────────────────────────
    if (action === 'master_projects') {
      if (!zone) return Response.json({ error: 'zone required' }, { status: 400 });
      const rows = await fetchAll(agent, 'raco_project_intelligence', 'master_project_name, final_zone_name');
      const seen = new Set();
      const masters = [];
      for (const r of rows) {
        if (!r.master_project_name || r.final_zone_name !== zone) continue;
        if (seen.has(r.master_project_name)) continue;
        seen.add(r.master_project_name);
        masters.push({ master_project: r.master_project_name });
      }
      masters.sort((a, b) => a.master_project.localeCompare(b.master_project));
      return Response.json({ master_projects: masters });
    }

    // ── Action: buildings for a master project ────────────────────────────────
    if (action === 'buildings') {
      if (!master_project) return Response.json({ error: 'master_project required' }, { status: 400 });
      const rows = await fetchAll(agent, 'raco_project_intelligence', 'project, final_zone_name, master_project_name');
      const seen = new Set();
      const buildings = [];
      for (const r of rows) {
        if (!r.project || r.master_project_name !== master_project) continue;
        if (seen.has(r.project)) continue;
        seen.add(r.project);
        buildings.push({ building: r.project, zone: r.final_zone_name });
      }
      buildings.sort((a, b) => a.building.localeCompare(b.building));
      return Response.json({ buildings });
    }

    // ── Action: building detail (full KPIs + charts) ────────────────────────────
    if (action === 'building_detail') {
      if (!building) return Response.json({ error: 'building required' }, { status: 400 });
      const { data, error } = await agent
        .from('raco_project_intelligence')
        .select('*')
        .eq('project', building)
        .limit(1)
        .single();
      if (error || !data) return Response.json({ error: 'Building not found' }, { status: 404 });
      return Response.json({ building: data });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[getMarketHierarchy]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});