import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function isAdmin(supabase, email) {
  try {
    const { data } = await supabase.from('user_roles').select('role').eq('email', email).limit(1).single();
    return ['admin', 'super_admin'].includes(data?.role);
  } catch (_) { return false; }
}

async function fetchAll(client, table, columns, filters = {}, textSearch = null) {
  const PAGE = 1000;
  let rows = [], from = 0;
  while (true) {
    let q = client.from(table).select(columns).range(from, from + PAGE - 1);
    for (const [k, v] of Object.entries(filters)) {
      if (Array.isArray(v)) q = q.overlaps(k, v); // for array column containment
      else q = q.eq(k, v);
    }
    if (textSearch) q = q.ilike('search_text', `%${textSearch}%`);
    const { data, error } = await q;
    if (error) { console.error('[getOwnerExplorer] fetchAll error:', error.message); break; }
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function getAllowedZones(supabase, scopeEmail, userIsAdmin, agentEmail) {
  if (userIsAdmin && !agentEmail) return null; // null = no restriction
  const { data } = await supabase.from('v_workspace_assignments').select('zone, area').eq('user_email', scopeEmail);
  if (!data || data.length === 0) return [];
  return [...new Set(data.flatMap(r => [r.zone, r.area]).filter(Boolean))];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, zone, master_project, project, owner_id, search, agent_email } = body;

    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const agentDb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), { db: { schema: 'agent' } });

    const adminByRole = ['admin', 'super_admin'].includes(user.role);
    const adminByTable = await isAdmin(supabase, user.email);
    const userIsAdmin = adminByRole || adminByTable;
    const scopeEmail = userIsAdmin && agent_email ? agent_email : user.email;

    const OWNER_COLS = 'id, owner_id, owner_name, email, mobile, owner_area, source_system, owner_record_count, linked_project_count, linked_projects, linked_master_project_names, linked_zones, linked_areas, property_id, last_approached_at, last_responded_at';
    const SUMMARY_COLS = 'id, owner_id, owner_name, email, mobile, owner_area, source_system, owner_record_count, linked_project_count, linked_zones';

    // ── Action: list zones ──────────────────────────────────────────────────
    if (action === 'zones') {
      const allowed = await getAllowedZones(supabase, scopeEmail, userIsAdmin, agent_email);
      const rows = await fetchAll(agentDb, 'raco_project_intelligence', 'final_zone_name');
      const seen = new Set();
      const zones = [];
      for (const r of rows) {
        const z = r.final_zone_name;
        if (!z || seen.has(z)) continue;
        if (allowed !== null && !allowed.includes(z)) continue;
        seen.add(z);
        zones.push(z);
      }
      zones.sort();
      return Response.json({ zones });
    }

    // ── Action: list master projects for a zone ─────────────────────────────
    if (action === 'master_projects') {
      if (!zone) return Response.json({ error: 'zone required' }, { status: 400 });
      const rows = await fetchAll(agentDb, 'raco_project_intelligence', 'master_project_name', { final_zone_name: zone });
      const seen = new Set();
      const masters = [];
      for (const r of rows) {
        if (!r.master_project_name || seen.has(r.master_project_name)) continue;
        seen.add(r.master_project_name);
        masters.push(r.master_project_name);
      }
      masters.sort();
      return Response.json({ master_projects: masters });
    }

    // ── Action: list projects/buildings for a master project ────────────────
    if (action === 'projects') {
      if (!master_project) return Response.json({ error: 'master_project required' }, { status: 400 });
      const rows = await fetchAll(agentDb, 'raco_project_intelligence', 'project', { master_project_name: master_project });
      const seen = new Set();
      const projects = [];
      for (const r of rows) {
        if (!r.project || seen.has(r.project)) continue;
        seen.add(r.project);
        projects.push(r.project);
      }
      projects.sort();
      return Response.json({ projects });
    }

    // ── Action: owners by project (building) ────────────────────────────────
    // owner_area maps directly to the project/building name in raco_project_intelligence
    if (action === 'owners_by_project') {
      if (!project) return Response.json({ error: 'project required' }, { status: 400 });
      const PAGE = 1000;
      let owners = [], from = 0;
      while (true) {
        const { data, error } = await agentDb
          .from('raco_owner_intelligence')
          .select(SUMMARY_COLS)
          .eq('owner_area', project)
          .range(from, from + PAGE - 1);
        if (error) { console.error('[owners_by_project] error:', error.message); break; }
        if (!data || data.length === 0) break;
        owners = owners.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return Response.json({ owners, count: owners.length });
    }

    // ── Action: owners by master project (community) ─────────────────────────
    // Owners whose owner_area starts with or belongs to any project in the master
    if (action === 'owners_by_master') {
      if (!master_project) return Response.json({ error: 'master_project required' }, { status: 400 });
      // Get all project names under this master
      const projRows = await fetchAll(agentDb, 'raco_project_intelligence', 'project', { master_project_name: master_project });
      const projNames = [...new Set(projRows.map(r => r.project).filter(Boolean))];
      if (projNames.length === 0) return Response.json({ owners: [], count: 0 });
      const PAGE = 1000;
      let owners = [], from = 0;
      while (true) {
        const { data, error } = await agentDb
          .from('raco_owner_intelligence')
          .select(SUMMARY_COLS)
          .in('owner_area', projNames)
          .range(from, from + PAGE - 1);
        if (error) { console.error('[owners_by_master] error:', error.message); break; }
        if (!data || data.length === 0) break;
        owners = owners.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return Response.json({ owners, count: owners.length });
    }

    // ── Action: owner full profile ───────────────────────────────────────────
    if (action === 'owner_profile') {
      if (!owner_id) return Response.json({ error: 'owner_id required' }, { status: 400 });
      const { data: ownerData, error } = await agentDb
        .from('raco_owner_intelligence')
        .select(OWNER_COLS)
        .eq('id', owner_id)
        .limit(1)
        .single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ owner: ownerData });
    }

    // ── Action: global search ────────────────────────────────────────────────
    if (action === 'search') {
      if (!search || search.trim().length < 2) return Response.json({ results: [] });
      const q = search.trim();
      const allowed = await getAllowedZones(supabase, scopeEmail, userIsAdmin, agent_email);

      // Use the pre-built search_text column for full-text style matching
      const { data: bySearchText } = await agentDb
        .from('raco_owner_intelligence')
        .select(SUMMARY_COLS)
        .ilike('search_text', `%${q}%`)
        .limit(60);

      // Also search by mobile directly for phone number searches
      const { data: byMobile } = await agentDb
        .from('raco_owner_intelligence')
        .select(SUMMARY_COLS)
        .ilike('mobile', `%${q}%`)
        .limit(20);

      // Also search by property_id
      const { data: byPropId } = await agentDb
        .from('raco_owner_intelligence')
        .select(SUMMARY_COLS)
        .ilike('property_id', `%${q}%`)
        .limit(20);

      const merged = new Map();
      for (const o of [...(bySearchText || []), ...(byMobile || []), ...(byPropId || [])]) {
        if (merged.has(o.id)) continue;
        if (allowed !== null && o.owner_area && !allowed.includes(o.owner_area)) continue;
        merged.set(o.id, o);
      }

      return Response.json({ results: [...merged.values()].slice(0, 80) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[getOwnerExplorer]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});