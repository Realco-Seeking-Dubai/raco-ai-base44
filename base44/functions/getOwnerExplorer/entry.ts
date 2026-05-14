import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Normalize Excel table rows → standard owner shape ───────────────────────
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

// ── Project name normalizations ──────────────────────────────────────────────
const PROJECT_NORMALIZATIONS = {
  'Murooj Al Furjan 1': 'Murooj Al Furjan',
  'Murooj Al Furjan 2': 'Murooj Al Furjan',
  'Murooj Al Furjan West': 'Murooj Al Furjan',
  'Murooj 1': 'Murooj Al Furjan',
  'Murooj 2': 'Murooj Al Furjan',
  'Tilal Al Furjan 1': 'Tilal Al Furjan',
  'Tilal Al Furjan 2': 'Tilal Al Furjan',
};

function normalizeProject(projectName) {
  if (!projectName) return projectName;
  const trimmed = projectName.trim();
  return PROJECT_NORMALIZATIONS[trimmed] || trimmed;
}

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

// ── Allowed zones for scoped users ───────────────────────────────────────────
async function getAllowedZones(supabase, scopeEmail) {
  const { data } = await supabase.from('v_workspace_assignments').select('zone, area').eq('user_email', scopeEmail);
  if (!data || data.length === 0) return [];
  return [...new Set(data.flatMap(r => [r.zone, r.area]).filter(Boolean))];
}

// ── Fetch excel owners from one table ────────────────────────────────────────
async function fetchExcelOwners(agentDb, tableName, limit = 2000) {
  const { data, error } = await agentDb.from(tableName).select('*').limit(limit);
  if (error || !data) return [];
  return data.map(row => normalizeExcelRow(row, tableName));
}

// ── Column sets ──────────────────────────────────────────────────────────────
const SUMMARY_COLS = 'id, owner_id, owner_name, normalized_owner_name, email, mobile, owner_area, source_system, owner_record_count, linked_project_count, linked_zones, linked_areas, owner_confidence, reconnect_due_at, property_id';
const OWNER_COLS   = 'id, owner_id, owner_name, normalized_owner_name, identity_key, email, mobile, owner_area, source_system, owner_record_count, linked_project_count, linked_projects, linked_master_project_names, linked_zones, linked_areas, property_id, owner_confidence, last_approached_at, last_responded_at, reconnect_due_at, project_match_methods';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, zone, master_project, project, owner_id, search, agent_email } = body;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase  = createClient(SUPABASE_URL, SERVICE_KEY);
    const agentDb   = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'agent' } });
    const publicDb  = createClient(SUPABASE_URL, SERVICE_KEY); // public schema

    const adminByRole  = ['admin', 'super_admin'].includes(user.role);
    const adminByTable = await isAdmin(supabase, user.email);
    const userIsAdmin  = adminByRole || adminByTable;
    const scopeEmail   = userIsAdmin && agent_email ? agent_email : user.email;

    // Discover Excel tables once per request
    const allExcelTables = await discoverExcelTables(SUPABASE_URL, SERVICE_KEY);
    const excelTableSet  = new Set(allExcelTables);

    // ── TIER 1: Zones with owner counts ──────────────────────────────────────
    // Uses SQL-level aggregation via RPC if available, else JS aggregation.
    // Fetches all pages to avoid under-counting.
    if (action === 'zones') {
      const PAGE = 1000;
      const zoneCountMap = new Map();
      let from = 0;

      // Paginate through ALL owner intelligence rows to get accurate counts
      while (true) {
        const { data, error } = await agentDb
          .from('raco_owner_intelligence')
          .select('linked_zones')
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        for (const row of data) {
          const zones = Array.isArray(row.linked_zones) ? row.linked_zones : [];
          for (const z of zones) {
            if (z) zoneCountMap.set(z, (zoneCountMap.get(z) || 0) + 1);
          }
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }

      // Supplement with zones from project intelligence (zero-count zones still appear)
      const { data: projZones } = await agentDb
        .from('raco_project_intelligence')
        .select('final_zone_name')
        .not('final_zone_name', 'is', null)
        .limit(2000);
      for (const p of (projZones || [])) {
        if (p.final_zone_name && !zoneCountMap.has(p.final_zone_name)) {
          zoneCountMap.set(p.final_zone_name, 0);
        }
      }

      const zone_stats = [...zoneCountMap.entries()]
        .map(([zone, owner_count]) => ({ zone, owner_count }))
        .sort((a, b) => b.owner_count - a.owner_count || a.zone.localeCompare(b.zone));

      console.log(`[getOwnerExplorer] zones | total: ${zone_stats.length} | top: ${zone_stats[0]?.zone} (${zone_stats[0]?.owner_count})`);
      return Response.json({ zones: zone_stats.map(z => z.zone), zone_stats });
    }

    // ── TIER 2: Master projects in a zone, with owner counts ─────────────────
    // Owner counts come from public.v_master_project_owner_counts (pre-calculated,
    // handles case normalization). Project counts from raco_project_intelligence.
    if (action === 'master_projects') {
      if (!zone) return Response.json({ error: 'zone required' }, { status: 400 });

      // Fetch both sources in parallel
      const [projRes, countsRes] = await Promise.all([
        agentDb
          .from('raco_project_intelligence')
          .select('master_project_name, project')
          .eq('final_zone_name', zone)
          .limit(2000),
        // v_master_project_owner_counts is in public schema, filter by zone_name
        publicDb
          .from('v_master_project_owner_counts')
          .select('master_project_name, owner_count, zone_name')
          .eq('zone_name', zone)
          .limit(500)
          .then(r => r)
          .catch(() => ({ data: null })), // view may not exist yet
      ]);

      if (projRes.error || !projRes.data) return Response.json({ master_projects: [] });

      // Build project_count per master from raco_project_intelligence
      const masterMap = new Map(); // master_name → { name, project_count }
      for (const p of projRes.data) {
        if (!p.master_project_name) continue;
        const entry = masterMap.get(p.master_project_name) || { name: p.master_project_name, project_count: 0, owner_count: 0 };
        if (p.project) entry.project_count++;
        masterMap.set(p.master_project_name, entry);
      }

      // Merge owner counts from view (case-insensitive by doing a map keyed on lower-case)
      if (countsRes.data) {
        // Build a lowercase lookup from view results
        const viewCounts = new Map(); // lower_name → owner_count
        for (const row of countsRes.data) {
          if (row.master_project_name) {
            viewCounts.set(row.master_project_name.toLowerCase(), row.owner_count || 0);
          }
        }
        // Apply to masterMap entries using case-insensitive match
        for (const [key, entry] of masterMap) {
          const viewCount = viewCounts.get(key.toLowerCase());
          if (viewCount != null) entry.owner_count = viewCount;
        }
      }

      const result = [...masterMap.values()]
        .sort((a, b) => b.owner_count - a.owner_count || a.name.localeCompare(b.name));

      console.log(`[getOwnerExplorer] master_projects | zone: ${zone} | count: ${result.length} | top: ${result[0]?.name} (${result[0]?.owner_count})`);
      return Response.json({ master_projects: result });
    }

    // ── TIER 3: Projects (buildings) in a master project ─────────────────────
    if (action === 'projects') {
      if (!master_project) return Response.json({ error: 'master_project required' }, { status: 400 });

      const { data: projRows, error } = await agentDb
        .from('raco_project_intelligence')
        .select('project, master_project_name')
        .eq('master_project_name', master_project)
        .limit(1000);

      if (error || !projRows) return Response.json({ projects: [] });

      const projectMap = new Map(); // normalized → { name, has_excel, owner_count }

      // Collect unique normalized project names
      for (const p of projRows) {
        if (!p.project) continue;
        const normalized = normalizeProject(p.project);
        if (!projectMap.has(normalized)) {
          const slug = projectToSlug(normalized);
          const hasExcel = excelTableSet.has(slug) || allExcelTables.some(t => t.includes(slug.replace('excel_', '')));
          projectMap.set(normalized, { name: normalized, has_excel: hasExcel, owner_count: 0 });
        }
      }

      // Get owner counts per project — try .contains first (exact), fall back to owner_area ilike
      await Promise.all([...projectMap.keys()].map(async (pName) => {
        const { count: exactCount } = await agentDb
          .from('raco_owner_intelligence')
          .select('id', { count: 'exact', head: true })
          .contains('linked_projects', [pName]);

        if (exactCount && exactCount > 0) {
          projectMap.get(pName).owner_count = exactCount;
          return;
        }

        // Fallback: count by owner_area case-insensitive
        const { count: areaCount } = await agentDb
          .from('raco_owner_intelligence')
          .select('id', { count: 'exact', head: true })
          .ilike('owner_area', pName);
        projectMap.get(pName).owner_count = areaCount || 0;
      }));

      const projectList = [...projectMap.values()]
        .sort((a, b) => b.owner_count - a.owner_count || a.name.localeCompare(b.name));

      console.log(`[getOwnerExplorer] projects | master: ${master_project} | count: ${projectList.length}`);
      return Response.json({ projects: projectList });
    }

    // ── TIER 4: Owners in a project ───────────────────────────────────────────
    // Uses .contains('linked_projects', [project]) per spec — the correct deduped approach
    if (action === 'owners_by_project') {
      if (!project) return Response.json({ error: 'project required' }, { status: 400 });

      const normalized = normalizeProject(project);
      // Build all name variants (original + normalized + all known fragments)
      const variants = new Set([project, normalized]);
      for (const [k, v] of Object.entries(PROJECT_NORMALIZATIONS)) {
        if (v === normalized) variants.add(k);
      }

      console.log(`[owners_by_project] variants: ${[...variants].join(', ')}`);

      // Primary: query via linked_projects array containment for each variant
      const masterOwners = new Map();
      await Promise.all([...variants].map(async (variant) => {
        const { data } = await agentDb
          .from('raco_owner_intelligence')
          .select(SUMMARY_COLS)
          .contains('linked_projects', [variant])
          .limit(500);
        for (const o of (data || [])) {
          if (!masterOwners.has(o.id)) {
            masterOwners.set(o.id, { ...o, source_label: 'Master DB', source_system: 'master_db' });
          }
        }
      }));

      // Fallback: also try owner_area match (catches owners not yet linked)
      await Promise.all([...variants].map(async (variant) => {
        const { data } = await agentDb
          .from('raco_owner_intelligence')
          .select(SUMMARY_COLS)
          .eq('owner_area', variant)
          .limit(200);
        for (const o of (data || [])) {
          if (!masterOwners.has(o.id)) {
            masterOwners.set(o.id, { ...o, source_label: 'Master DB', source_system: 'master_db' });
          }
        }
      }));

      // Excel supplement
      const matchingExcelTables = new Set();
      for (const variant of variants) {
        const slug = projectToSlug(variant);
        allExcelTables
          .filter(t => {
            const tc = t.replace(/^excel_/, '');
            const pc = slug.replace(/^excel_/, '');
            return tc === pc || tc.startsWith(pc) || tc.includes(pc);
          })
          .forEach(t => matchingExcelTables.add(t));
      }

      const excelOwners = [];
      for (const tbl of matchingExcelTables) {
        const rows = await fetchExcelOwners(agentDb, tbl);
        excelOwners.push(...rows);
      }

      const allOwners = [...masterOwners.values(), ...excelOwners];
      return Response.json({
        owners: allOwners,
        count: allOwners.length,
        master_count: masterOwners.size,
        excel_count: excelOwners.length,
        excel_tables_used: [...matchingExcelTables],
      });
    }

    // ── TIER 5: Full owner profile with notes + transactions ─────────────────
    if (action === 'owner_profile') {
      if (!owner_id) return Response.json({ error: 'owner_id required' }, { status: 400 });

      // Excel owner shortcut
      const ownerIdStr = String(owner_id);
      if (ownerIdStr.startsWith('excel_')) {
        const parts    = ownerIdStr.split('_');
        const rowId    = parts[parts.length - 1];
        const tblName  = parts.slice(0, -1).join('_');
        const { data, error } = await agentDb.from(tblName).select('*').eq('id', rowId).limit(1).single();
        if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({ owner: normalizeExcelRow(data, tblName), notes: [], transactions: [] });
      }

      // Fetch core + notes + transactions in parallel
      const [ownerRes, notesRes, txRes] = await Promise.all([
        agentDb.from('raco_owner_intelligence').select(OWNER_COLS).eq('id', owner_id).limit(1).single(),
        // CRM notes — table may not exist yet; graceful fallback
        publicDb.from('raco_owner_notes')
          .select('id, note, note_type, created_at, created_by, follow_up_date')
          .eq('owner_id', owner_id)
          .order('created_at', { ascending: false })
          .limit(50)
          .then(r => r)
          .catch(() => ({ data: null, error: 'table_missing' })),
        // Transaction history — match by owner_id or identity_key
        publicDb.from('pm_transactions')
          .select('id, transaction_date, transaction_type, amount, property_id, project_name, area_name, seller_name, buyer_name')
          .or(`seller_owner_id.eq.${owner_id},buyer_owner_id.eq.${owner_id}`)
          .order('transaction_date', { ascending: false })
          .limit(20)
          .then(r => r)
          .catch(() => ({ data: null, error: 'table_missing' })),
      ]);

      if (ownerRes.error) return Response.json({ error: ownerRes.error.message }, { status: 500 });

      return Response.json({
        owner: { ...ownerRes.data, source_label: 'Master DB' },
        notes: notesRes.data || [],
        transactions: txRes.data || [],
      });
    }

    // ── Global search ─────────────────────────────────────────────────────────
    if (action === 'search') {
      if (!search || search.trim().length < 2) return Response.json({ results: [] });
      const q = search.trim().toLowerCase();

      let allowed = null;
      if (!userIsAdmin) {
        allowed = await getAllowedZones(supabase, scopeEmail);
      }

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

      // Sample key Excel tables
      const keyTables = allExcelTables.filter(t =>
        t.includes('_special_2025') || t.includes('business_bay') || t.includes('marina') || t.includes('downtown')
      ).slice(0, 15);

      const batchResults = await Promise.all(keyTables.map(async (tbl) => {
        const { data: byName } = await agentDb.from(tbl).select('*').ilike('name', `%${q}%`).limit(10);
        return (byName || []).map(row => normalizeExcelRow(row, tbl));
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