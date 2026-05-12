import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Convert project name → excel table slug pattern
function projectToSlug(projectName) {
  return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Normalize fragmented project names: "Murooj 1", "Murooj 2" → "Murooj Al Furjan"
function normalizeProjectName(projectName) {
  if (!projectName) return projectName;
  const trimmed = projectName.trim();
  
  // Strip numeric suffixes and normalize: "Murooj 1" → "murooj", "Tilal Al Furjan 2" → "tilal_al_furjan"
  const baseSlug = trimmed.toLowerCase()
    .replace(/\s+\d+\s*$/, '') // Remove trailing numbers
    .replace(/[^a-z0-9\s]+/g, ' ') // Normalize special chars
    .trim();
  
  // Define canonical mappings for known fragmented projects
  const CANONICAL_NAMES = {
    'murooj': 'Murooj Al Furjan',
    'tilal': 'Tilal Al Furjan',
    'damac': 'DAMAC Properties',
    'emaar': 'Emaar',
    'mag': 'MAG',
  };
  
  // Check if slug starts with a known base
  for (const [slug, canonical] of Object.entries(CANONICAL_NAMES)) {
    if (baseSlug.startsWith(slug)) return canonical;
  }
  
  // Fallback: return original if no mapping found
  return trimmed;
}

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const agent = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'agent' } });

    // Fetch in parallel:
    // 1. Distinct populated owner_area values from raco_owner_directory
    // 2. Full project intelligence for zone/master cross-referencing
    // 3. Excel table discovery for badge decoration
    const [ownerAreasRes, intelligenceRes, excelTables] = await Promise.all([
      agent.from('raco_owner_directory').select('owner_area').not('owner_area', 'is', null),
      agent.from('raco_project_intelligence').select('final_zone_name, master_project_name, project'),
      discoverExcelTables(SUPABASE_URL, SERVICE_KEY),
    ]);

    if (ownerAreasRes.error) throw new Error(`owner_directory: ${ownerAreasRes.error.message}`);
    if (intelligenceRes.error) throw new Error(`project_intelligence: ${intelligenceRes.error.message}`);

    // Build set of populated project names (from actual owner records)
    const populatedProjects = new Set(
      (ownerAreasRes.data || []).map(r => r.owner_area?.trim()).filter(Boolean)
    );

    console.log(`[getScopeList] Populated projects from owner_directory: ${populatedProjects.size}`);
    console.log(`[getScopeList] Excel tables: ${excelTables.length}`);

    // Build excel slug set for badge detection
    const excelSlugSet = new Set(excelTables.map(t => t.replace(/^excel_/, '')));
    function projectHasExcel(projectName) {
      if (!projectName) return false;
      const slug = projectToSlug(projectName);
      return excelSlugSet.has(slug) || excelTables.some(t => {
        const tSlug = t.replace(/^excel_/, '');
        return tSlug === slug || tSlug.startsWith(slug) || tSlug.includes(slug);
      });
    }

    // Build project → zone/master map from raco_project_intelligence
    // Only keep projects that exist in raco_owner_directory
    const projectMap = new Map(); // project → { project, master_project_name, zone, has_excel }
    for (const r of (intelligenceRes.data || [])) {
      if (!r.project || !r.master_project_name || !r.final_zone_name) continue;
      if (!populatedProjects.has(r.project)) continue; // DATA-DRIVEN FILTER
      if (!projectMap.has(r.project)) {
        projectMap.set(r.project, {
          project: r.project,
          master_project_name: r.master_project_name,
          zone: r.final_zone_name,
          has_excel: projectHasExcel(r.project),
        });
      }
    }

    // Derive master projects and zones purely from the populated projects
    const masterSet = new Map(); // master_project_name → zone
    const zoneSet = new Set();
    
    // Track fragmented projects for consolidation
    const fragmentedMap = new Map(); // canonical_name → [original_names]

    for (const proj of projectMap.values()) {
      zoneSet.add(proj.zone);
      
      // Normalize master project names to consolidate fragments
      const canonicalMaster = normalizeProjectName(proj.master_project_name);
      if (!masterSet.has(canonicalMaster)) {
        masterSet.set(canonicalMaster, proj.zone);
      }
      
      // Track fragmentation for buildings
      if (!fragmentedMap.has(proj.project)) {
        const normalized = normalizeProjectName(proj.project);
        if (!fragmentedMap.has(normalized)) {
          fragmentedMap.set(normalized, []);
        }
        fragmentedMap.get(normalized).push(proj.project);
      }
    }

    const projects = [...projectMap.values()].sort((a, b) => a.project.localeCompare(b.project));

    const masterProjects = [...masterSet.entries()]
      .map(([project_name, zone]) => ({ project_name, zone }))
      .sort((a, b) => a.project_name.localeCompare(b.project_name));

    const zones = [...zoneSet]
      .map(zone => ({ zone }))
      .sort((a, b) => a.zone.localeCompare(b.zone));

    console.log(`[getScopeList] FINAL (data-driven) — zones: ${zones.length} | masterProjects: ${masterProjects.length} | projects: ${projects.length}`);
    console.log(`[getScopeList] Fragmentation map:`, [...fragmentedMap.entries()].slice(0, 5));

    return Response.json({
      zones,
      masterProjects,
      projects,
      fragmented_map: Object.fromEntries(fragmentedMap),
      excel_table_count: excelTables.length,
    });
  } catch (err) {
    console.error('[getScopeList] EXCEPTION:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});