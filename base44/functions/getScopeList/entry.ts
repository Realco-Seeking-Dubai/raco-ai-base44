import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Discover all agent.excel_ table names via OpenAPI spec
async function discoverExcelTables(supabaseUrl, serviceKey) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Accept': 'application/openapi+json',
        'Accept-Profile': 'agent',
      }
    });
    const spec = await res.json();
    return Object.keys(spec.paths || {})
      .map(p => p.replace(/^\//, ''))
      .filter(t => t.startsWith('excel_'))
      .sort();
  } catch (_) { return []; }
}

// Convert project name → excel table slug pattern
function projectToSlug(projectName) {
  return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function fetchAll(client, tableName, columns) {
  const PAGE_SIZE = 1000;
  let allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from(tableName)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) { console.error(`[getScopeList] fetchAll error on ${tableName}:`, error.message); break; }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const agent = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'agent' } });

    // 1. Discover excel tables in parallel with fetching project hierarchy
    const [excelTables, rows] = await Promise.all([
      discoverExcelTables(SUPABASE_URL, SERVICE_KEY),
      fetchAll(agent, 'raco_project_intelligence', 'final_zone_name, master_project_name, project'),
    ]);

    console.log(`[getScopeList] Excel tables discovered: ${excelTables.length}`);

    // Build a set of project slugs from excel tables for quick lookup
    const excelSlugSet = new Set(excelTables.map(t => t.replace(/^excel_/, '')));

    // Helper: does a project have any Excel table?
    function projectHasExcel(projectName) {
      if (!projectName) return false;
      const slug = projectToSlug(projectName);
      return excelSlugSet.has(slug) || excelTables.some(t => {
        const tSlug = t.replace(/^excel_/, '');
        return tSlug === slug || tSlug.startsWith(slug) || tSlug.includes(slug);
      });
    }

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
    const masterByZone = {};
    for (const r of rows) {
      if (!r.final_zone_name || !r.master_project_name) continue;
      if (!masterByZone[r.final_zone_name]) masterByZone[r.final_zone_name] = new Set();
      masterByZone[r.final_zone_name].add(r.master_project_name);
    }
    const masterProjects = [];
    for (const [zone, names] of Object.entries(masterByZone)) {
      for (const name of names) {
        masterProjects.push({ project_name: name, zone });
      }
    }
    masterProjects.sort((a, b) => a.project_name.localeCompare(b.project_name));

    // Tier 3: distinct project per master_project_name, with Excel badge
    const projectByMaster = {};
    for (const r of rows) {
      if (!r.master_project_name || !r.project) continue;
      if (!projectByMaster[r.master_project_name]) {
        projectByMaster[r.master_project_name] = { zone: r.final_zone_name, projects: new Map() };
      }
      if (!projectByMaster[r.master_project_name].projects.has(r.project)) {
        projectByMaster[r.master_project_name].projects.set(r.project, {
          project: r.project,
          master_project_name: r.master_project_name,
          zone: r.final_zone_name,
          has_excel: projectHasExcel(r.project),
        });
      }
    }
    const projects = [];
    for (const { projects: pMap } of Object.values(projectByMaster)) {
      for (const proj of pMap.values()) {
        projects.push(proj);
      }
    }
    projects.sort((a, b) => a.project.localeCompare(b.project));

    // Also surface Excel-only areas not in raco_project_intelligence
    // These are tables like excel_business_bay_special_2025 whose slug doesn't map to any project
    const projectSlugs = new Set(projects.map(p => projectToSlug(p.project)));
    const orphanExcelTables = excelTables.filter(t => {
      const slug = t.replace(/^excel_/, '').replace(/_special_2025$/, '').replace(/_\d+$/, '');
      return !projectSlugs.has(slug) && !slug.includes('lead') && !slug.includes('inquiry')
        && !slug.includes('campaign') && !slug.includes('catalog');
    });

    console.log(`[getScopeList] FINAL — zones: ${zones.length} | masterProjects: ${masterProjects.length} | projects: ${projects.length} | orphan_excel: ${orphanExcelTables.length}`);
    return Response.json({ zones, masterProjects, projects, excel_table_count: excelTables.length, orphan_excel_tables: orphanExcelTables });
  } catch (err) {
    console.error('[getScopeList] EXCEPTION:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});