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

    const agent = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { db: { schema: 'agent' } }
    );

    // Fetch ALL rows from raco_project_intelligence with the 3 hierarchy columns
    const rows = await fetchAll(
      agent,
      'raco_project_intelligence',
      'final_zone_name, master_project_name, project'
    );

    // Tier 1: distinct zones
    const zonesSeen = new Set();
    const zones = [];
    for (const r of rows) {
      if (r.final_zone_name && !zonesSeen.has(r.final_zone_name)) {
        zonesSeen.add(r.final_zone_name);
        zones.push({ zone: r.final_zone_name });
      }
    }
    zones.sort((a, b) => a.zone.localeCompare(b.zone));

    // Tier 2: distinct master_project_name per zone
    // Build a map: zone -> Set<master_project_name>
    const masterByZone = {};
    for (const r of rows) {
      if (!r.final_zone_name || !r.master_project_name) continue;
      if (!masterByZone[r.final_zone_name]) masterByZone[r.final_zone_name] = new Set();
      masterByZone[r.final_zone_name].add(r.master_project_name);
    }
    // Flatten into array with zone context
    const masterProjects = [];
    for (const [zone, names] of Object.entries(masterByZone)) {
      for (const name of names) {
        masterProjects.push({ project_name: name, zone });
      }
    }
    masterProjects.sort((a, b) => a.project_name.localeCompare(b.project_name));

    // Tier 3: distinct project per master_project_name
    // Build a map: master_project_name -> { zone, projects: Set<project> }
    const projectByMaster = {};
    for (const r of rows) {
      if (!r.master_project_name || !r.project) continue;
      if (!projectByMaster[r.master_project_name]) {
        projectByMaster[r.master_project_name] = { zone: r.final_zone_name, projects: new Set() };
      }
      projectByMaster[r.master_project_name].projects.add(r.project);
    }
    const projects = [];
    for (const [master, { zone, projects: pSet }] of Object.entries(projectByMaster)) {
      for (const proj of pSet) {
        projects.push({ project: proj, master_project_name: master, zone });
      }
    }
    projects.sort((a, b) => a.project.localeCompare(b.project));

    console.log(`[getScopeList] FINAL — zones: ${zones.length} | masterProjects: ${masterProjects.length} | projects: ${projects.length}`);
    return Response.json({ zones, masterProjects, projects });
  } catch (err) {
    console.error('[getScopeList] EXCEPTION:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});