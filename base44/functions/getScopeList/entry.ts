import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function fetchAll(client, tableName, columns) {
  const PAGE_SIZE = 1000;
  let allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from(tableName)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`[getScopeList] fetchAll error on ${tableName}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  console.log(`[getScopeList] fetchAll ${tableName}: ${allRows.length} rows`);
  return allRows;
}

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

    // Paginate all three sources in parallel
    const [scopeRows, projectRows] = await Promise.all([
      fetchAll(pub, 'v_admin_scope_projects', 'zone, master_project_name, project'),
      fetchAll(agent, 'raco_project_intelligence', 'master_project_name, area_name, final_zone_name'),
    ]);

    // Extract unique zones
    const zonesSeen = new Set();
    const zones = [];
    for (const r of scopeRows) {
      if (r.zone && !zonesSeen.has(r.zone)) {
        zonesSeen.add(r.zone);
        zones.push({ zone: r.zone });
      }
    }
    zones.sort((a, b) => a.zone.localeCompare(b.zone));

    // Extract unique master projects, grouped by zone
    const masterSeen = new Set();
    const masterProjects = [];
    for (const r of scopeRows) {
      if (r.master_project_name && !masterSeen.has(r.master_project_name)) {
        masterSeen.add(r.master_project_name);
        masterProjects.push({ project_name: r.master_project_name, zone: r.zone });
      }
    }
    masterProjects.sort((a, b) => a.project_name.localeCompare(b.project_name));

    // Extract unique buildings from raco_project_intelligence
    const buildingSeen = new Set();
    const projects = [];
    for (const r of projectRows) {
      if (r.master_project_name && !buildingSeen.has(r.master_project_name)) {
        buildingSeen.add(r.master_project_name);
        projects.push({
          master_project_name: r.master_project_name,
          zone: r.final_zone_name,
          area: r.area_name,
        });
      }
    }
    projects.sort((a, b) => a.master_project_name.localeCompare(b.master_project_name));

    console.log(`[getScopeList] FINAL — zones: ${zones.length} | masterProjects: ${masterProjects.length} | projects: ${projects.length}`);
    return Response.json({ zones, masterProjects, projects });
  } catch (err) {
    console.error('[getScopeList] EXCEPTION:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});