import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Column mapping: normalize Excel table rows → standard owner shape ────────
// Excel columns seen: name, phone, mobile, secondary_mobile, email, area,
//   flat_number, floor, building_name, project, master_project, p_number, usage
function normalizeExcelRow(row, tableName) {
  const displayName = tableName
    .replace(/^excel_/, '')
    .replace(/_special_2025$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();

  return {
    id: `${tableName}_${row.id}`,
    owner_id: row.id,
    owner_name: row.name || row.nameen || row.owner_name || null,
    email: row.email || null,
    mobile: row.mobile || row.mobile_1 || row.phone || row.secondary_mobile || null,
    owner_area: row.area || row.project || null,
    building_name: row.building_name || null,
    flat_number: row.flat_number || row.unit_number || null,
    floor: row.floor || null,
    master_project: row.master_project || null,
    property_id: row.p_number || row.registration_number || null,
    nationality: row.nationality || null,
    gender: row.gender || null,
    source_system: 'excel',
    source_table: tableName,
    source_label: `Excel: ${displayName}`,
    owner_record_count: null,
    linked_project_count: null,
    linked_zones: [],
  };
}

// ── Discover all excel_ tables via OpenAPI spec ──────────────────────────────
async function discoverExcelTables(supabaseUrl, serviceKey) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`, {
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Accept': 'application/openapi+json', 'Accept-Profile': 'agent' }
    });
    const spec = await res.json();
    return Object.keys(spec.paths || {})
      .map(p => p.replace(/^\//, ''))
      .filter(t => t.startsWith('excel_'))
      .sort();
  } catch (_) { return []; }
}

// ── Convert project name → likely excel table slug ───────────────────────────
function projectToSlug(projectName) {
  return 'excel_' + projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ── Admin check ──────────────────────────────────────────────────────────────
async function isAdmin(supabase, email) {
  try {
    const { data } = await supabase.from('user_roles').select('role').eq('email', email).limit(1).single();
    return ['admin', 'super_admin'].includes(data?.role);
  } catch (_) { return false; }
}

// ── Paginated fetch helper ───────────────────────────────────────────────────
async function fetchAll(client, table, columns, filters = {}) {
  const PAGE = 1000;
  let rows = [], from = 0;
  while (true) {
    let q = client.from(table).select(columns).range(from, from + PAGE - 1);
    for (const [k, v] of Object.entries(filters)) {
      if (Array.isArray(v)) q = q.overlaps(k, v);
      else q = q.eq(k, v);
    }
    const { data, error } = await q;
    if (error) { console.error('[fetchAll]', table, error.message); break; }
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function getAllowedZones(supabase, scopeEmail, userIsAdmin, agentEmail) {
  if (userIsAdmin && !agentEmail) return null;
  const { data } = await supabase.from('v_workspace_assignments').select('zone, area').eq('user_email', scopeEmail);
  if (!data || data.length === 0) return [];
  return [...new Set(data.flatMap(r => [r.zone, r.area]).filter(Boolean))];
}

// ── Fetch owners from a single excel table, returns normalized rows ──────────
async function fetchExcelOwners(agentDb, tableName, limit = 2000) {
  const { data, error } = await agentDb.from(tableName).select('*').limit(limit);
  if (error || !data) return [];
  return data.map(row => normalizeExcelRow(row, tableName));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, zone, master_project, project, owner_id, search, agent_email } = body;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const agentDb = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'agent' } });

    const adminByRole = ['admin', 'super_admin'].includes(user.role);
    const adminByTable = await isAdmin(supabase, user.email);
    const userIsAdmin = adminByRole || adminByTable;
    const scopeEmail = userIsAdmin && agent_email ? agent_email : user.email;

    const SUMMARY_COLS = 'id, owner_id, owner_name, email, mobile, owner_area, source_system, owner_record_count, linked_project_count, linked_zones';
    const OWNER_COLS = 'id, owner_id, owner_name, email, mobile, owner_area, source_system, owner_record_count, linked_project_count, linked_projects, linked_master_project_names, linked_zones, linked_areas, property_id, last_approached_at, last_responded_at';

    // Discover all Excel table slugs once (cached in memory during the request)
    const allExcelTables = await discoverExcelTables(SUPABASE_URL, SERVICE_KEY);
    const excelTableSet = new Set(allExcelTables);

    // ── Action: list zones ────────────────────────────────────────────────────
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

    // ── Action: list master projects for a zone ───────────────────────────────
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

    // ── Action: list buildings for a master project ───────────────────────────
    if (action === 'projects') {
      if (!master_project) return Response.json({ error: 'master_project required' }, { status: 400 });
      const rows = await fetchAll(agentDb, 'raco_project_intelligence', 'project', { master_project_name: master_project });
      const seen = new Set();
      const projects = [];
      for (const r of rows) {
        if (!r.project || seen.has(r.project)) continue;
        seen.add(r.project);
        // Mark if an Excel table exists for this project
        const slug = projectToSlug(r.project);
        const hasExcel = excelTableSet.has(slug) ||
          allExcelTables.some(t => t.includes(slug.replace('excel_', '')));
        projects.push({ name: r.project, has_excel: hasExcel });
      }
      projects.sort((a, b) => a.name.localeCompare(b.name));
      return Response.json({ projects });
    }

    // ── Action: owners by project — merge master DB + excel ──────────────────
    if (action === 'owners_by_project') {
      if (!project) return Response.json({ error: 'project required' }, { status: 400 });

      // 1. Master DB owners
      const masterOwners = [];
      let from = 0;
      while (true) {
        const { data, error } = await agentDb
          .from('raco_owner_intelligence')
          .select(SUMMARY_COLS)
          .eq('owner_area', project)
          .range(from, from + 999);
        if (error || !data || data.length === 0) break;
        masterOwners.push(...data.map(o => ({ ...o, source_label: 'Master DB', source_system: 'master_db' })));
        if (data.length < 1000) break;
        from += 1000;
      }

      // 2. Find matching Excel tables for this project
      const slug = projectToSlug(project);
      const matchingExcelTables = allExcelTables.filter(t => {
        const tClean = t.replace(/^excel_/, '');
        const pClean = slug.replace(/^excel_/, '');
        return tClean === pClean || tClean.startsWith(pClean) || tClean.includes(pClean);
      });

      const excelOwners = [];
      for (const tbl of matchingExcelTables) {
        const rows = await fetchExcelOwners(agentDb, tbl);
        excelOwners.push(...rows);
      }

      const allOwners = [...masterOwners, ...excelOwners];
      return Response.json({
        owners: allOwners,
        count: allOwners.length,
        master_count: masterOwners.length,
        excel_count: excelOwners.length,
        excel_tables_used: matchingExcelTables,
      });
    }

    // ── Action: owner full profile ────────────────────────────────────────────
    if (action === 'owner_profile') {
      if (!owner_id) return Response.json({ error: 'owner_id required' }, { status: 400 });

      // If it's an Excel owner (id format: {tableName}_{rowId}, e.g. excel_business_bay_42)
      const ownerIdStr = String(owner_id);
      if (ownerIdStr.startsWith('excel_')) {
        const parts = ownerIdStr.split('_');
        const rowId = parts[parts.length - 1];
        const tableName = parts.slice(0, -1).join('_'); // e.g. excel_business_bay
        const { data, error } = await agentDb.from(tableName).select('*').eq('id', rowId).limit(1).single();
        if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({ owner: normalizeExcelRow(data, tableName) });
      }

      // Master DB owner
      const { data: ownerData, error } = await agentDb
        .from('raco_owner_intelligence')
        .select(OWNER_COLS)
        .eq('id', owner_id)
        .limit(1)
        .single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ owner: { ...ownerData, source_label: 'Master DB' } });
    }

    // ── Action: global search — master DB + all Excel tables ─────────────────
    if (action === 'search') {
      if (!search || search.trim().length < 2) return Response.json({ results: [] });
      const q = search.trim().toLowerCase();
      const allowed = await getAllowedZones(supabase, scopeEmail, userIsAdmin, agent_email);

      // 1. Search master DB
      const [byText, byMobile, byPropId] = await Promise.all([
        agentDb.from('raco_owner_intelligence').select(SUMMARY_COLS).ilike('search_text', `%${q}%`).limit(50),
        agentDb.from('raco_owner_intelligence').select(SUMMARY_COLS).ilike('mobile', `%${q}%`).limit(20),
        agentDb.from('raco_owner_intelligence').select(SUMMARY_COLS).ilike('property_id', `%${q}%`).limit(20),
      ]);

      const merged = new Map();
      for (const o of [...(byText.data || []), ...(byMobile.data || []), ...(byPropId.data || [])]) {
        if (merged.has(o.id)) continue;
        if (allowed !== null && o.owner_area && !allowed.includes(o.owner_area)) continue;
        merged.set(o.id, { ...o, source_label: 'Master DB', source_system: 'master_db' });
      }

      // 2. Search Excel tables — smart routing:
      // - If query matches a table slug (area-based search), only scan those tables
      // - For name/phone searches, scan a curated "priority" set of the most important tables
      //   (the _special_2025 tables + large known tables), capped at 20 for speed
      const qSlug = q.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const areaMatchingTables = allExcelTables.filter(t =>
        t.replace(/^excel_/, '').includes(qSlug)
      );

      // Priority tables: special_2025 datasets are the most relevant new data
      const specialTables = allExcelTables.filter(t => t.includes('_special_2025') || t.includes('_2025'));
      const largeTables = allExcelTables.filter(t =>
        ['excel_business_bay', 'excel_downtown_dubai', 'excel_palm_jumeirah', 'excel_marina',
         'excel_jvc', 'excel_al_furjan', 'excel_bluewaters', 'excel_city_walk',
         'excel_damac_hills', 'excel_arabian_ranches'].some(k => t.startsWith(k))
      );

      const tablesToSearch = areaMatchingTables.length > 0
        ? areaMatchingTables.slice(0, 15)
        : [...new Set([...specialTables, ...largeTables])].slice(0, 20);

      // Search all selected tables in parallel
      const batchResults = await Promise.all(tablesToSearch.map(async (tbl) => {
        const [byName, byMob] = await Promise.all([
          agentDb.from(tbl).select('*').ilike('name', `%${q}%`).limit(8),
          agentDb.from(tbl).select('*').ilike('mobile', `%${q}%`).limit(5),
        ]);
        const combined = [...(byName.data || []), ...(byMob.data || [])];
        return combined.map(row => normalizeExcelRow(row, tbl));
      }));

      for (const rows of batchResults) {
        for (const o of rows) {
          if (!merged.has(o.id)) merged.set(o.id, o);
        }
      }

      return Response.json({ results: [...merged.values()].slice(0, 100) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[getOwnerExplorer]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});