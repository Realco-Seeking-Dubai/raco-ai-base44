import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient as createBase44Client } from 'npm:@base44/sdk@0.8.25';
import { createClient as createSupabaseClient } from 'npm:@supabase/supabase-js@2';

// ── Source app credentials (13.realco.ai) ────────────────────────────────────
const SOURCE_APP_ID  = '69e051cc8adf39a6a0c03c3d';
const SOURCE_API_KEY = '9dfd31e2ccb94d2a9bbd0378b4a6d5ce';

// ── Agent email → display name ───────────────────────────────────────────────
const AGENT_DISPLAY = {
  'ghulam@realco.ai':    'Ghulam Rasool',
  'gibran@realco.ai':    'Gibran Y. Bham',
  'iqra@realco.ai':      'Iqra Ghafoor',
  'irfan@realco.ai':     'Irfan Zafar',
  'shaharyar@realco.ai': 'Shaharyar Sheikh',
};

function buildSourceClient() {
  return createBase44Client({
    appId: SOURCE_APP_ID,
    headers: { api_key: SOURCE_API_KEY },
  });
}

// ── Paginated fetch helper ───────────────────────────────────────────────────
async function fetchAll(sourceClient, entityName, pageSize = 200) {
  let all = [];
  let skip = 0;
  while (true) {
    const page = await sourceClient.entities[entityName].list('-created_date', pageSize, skip);
    if (!page || page.length === 0) break;
    all = all.concat(page);
    if (page.length < pageSize) break;
    skip += pageSize;
    if (skip > 20000) break; // safety cap
  }
  return all;
}

// ── Build lookup maps from source app reference data ────────────────────────
async function buildLookups(sourceClient) {
  // Fetch all Communities and SubProjects in parallel
  const [communities, subProjects, zones] = await Promise.all([
    fetchAll(sourceClient, 'Community', 200),
    fetchAll(sourceClient, 'SubProject', 200),
    // Try Zone entity — may not exist, catch silently
    sourceClient.entities.Zone.list('-created_date', 200).catch(() => []),
  ]);

  // zone_id → zone name
  const zoneById = new Map();
  for (const z of zones) {
    zoneById.set(z.id, z.name || z.zone_name || null);
  }

  // community_id → { name, zone_id, zone_name }
  const communityById = new Map();
  for (const c of communities) {
    communityById.set(c.id, {
      name: c.name,
      zone_id: c.zone_id,
      zone_name: zoneById.get(c.zone_id) || null,
    });
  }

  // sub_project_id → { name, community_id, community_name, zone_name }
  const subProjectById = new Map();
  for (const sp of subProjects) {
    const comm = communityById.get(sp.community_id);
    subProjectById.set(sp.id, {
      name: sp.name,
      community_id: sp.community_id,
      community_name: comm?.name || null,
      zone_name: comm?.zone_name || null,
    });
  }

  console.log(`[syncPocketListings] Lookups: ${communities.length} communities, ${subProjects.length} subprojects, ${zones.length} zones`);
  return { communityById, subProjectById, zoneById };
}

// ── Resolve hierarchy from a single Listing record ──────────────────────────
function resolveHierarchy(listing, communityById, subProjectById) {
  const spId   = listing.sub_project_id;
  const commId = listing.community_id;

  // Prefer sub_project resolution (most specific)
  if (spId) {
    const sp = subProjectById.get(spId);
    if (sp) {
      return {
        building:       sp.name,
        master_project: sp.community_name,
        zone:           sp.zone_name,
      };
    }
  }

  // Fall back to community
  if (commId) {
    const comm = communityById.get(commId);
    if (comm) {
      return {
        building:       null,
        master_project: comm.name,
        zone:           comm.zone_name,
      };
    }
  }

  return { building: null, master_project: null, zone: null };
}

// ── Map source Listing record → Supabase row ─────────────────────────────────
function mapRow(listing, communityById, subProjectById) {
  const agentEmail = listing.assigned_agent || listing.created_by || null;
  const agentName  = AGENT_DISPLAY[agentEmail] || agentEmail || null;
  const { building, master_project, zone } = resolveHierarchy(listing, communityById, subProjectById);

  // Price: use asking_price_aed if set, otherwise rental_amount_aed
  const priceAed = listing.asking_price_aed || listing.rental_amount_aed || listing.original_price_aed || null;

  return {
    source_id:          String(listing.id),
    source_system:      'realco13',
    agent_email:        agentEmail,
    agent_name:         agentName,
    client_id:          listing.client_id || null,
    unit_address:       listing.unit_address || null,
    building:           building,
    master_project:     master_project,
    zone:               zone,
    community_id_src:   listing.community_id || null,
    sub_project_id_src: listing.sub_project_id || null,
    property_category:  listing.property_category || null,
    listing_purpose:    listing.listing_purpose || null,
    pipeline_stage:     listing.pipeline_stage || null,
    pipeline_sub_status: listing.pipeline_sub_status || null,
    bedrooms:           listing.bedrooms != null ? parseInt(listing.bedrooms, 10) || null : null,
    bua_sqft:           listing.bua_sqft || null,
    plot_size_sqft:     listing.plot_size_sqft || null,
    asking_price_aed:   priceAed,
    rental_amount_aed:  listing.rental_amount_aed || null,
    rental_period:      listing.rental_period || null,
    is_hot:             !!listing.is_hot,
    is_exclusive:       !!listing.is_exclusive,
    is_new:             !!listing.is_new,
    viewing_status:     listing.viewing_status || null,
    follow_up_date:     listing.follow_up_date || null,
    source_record_id:   listing.source_record_id || null,
    source_section:     listing.source_section || null,
    notes:              listing.notes || null,
    source_created_at:  listing.created_date || null,
    source_updated_at:  listing.updated_date || null,
    synced_at:          new Date().toISOString(),
  };
}

// ── Resolve Raco CRM hierarchy (match master_project → final_zone_name) ──────
async function enrichWithRacoCRM(rows, agentDb) {
  // Build a name→zone map from raco_project_intelligence
  const { data } = await agentDb
    .from('raco_project_intelligence')
    .select('project, master_project_name, final_zone_name');

  const masterToZone = new Map();
  const projectToInfo = new Map();

  for (const r of (data || [])) {
    if (r.master_project_name && r.final_zone_name) {
      masterToZone.set(r.master_project_name.toLowerCase().trim(), r.final_zone_name);
    }
    if (r.project) {
      projectToInfo.set(r.project.toLowerCase().trim(), {
        master: r.master_project_name,
        zone: r.final_zone_name,
      });
    }
  }

  let enriched = 0;
  for (const row of rows) {
    // If zone is missing, try to resolve from Raco CRM by master_project name
    if (!row.zone && row.master_project) {
      const z = masterToZone.get(row.master_project.toLowerCase().trim());
      if (z) { row.zone = z; enriched++; }
    }
    // Also try building name against project index
    if (!row.zone && row.building) {
      const info = projectToInfo.get(row.building.toLowerCase().trim());
      if (info) {
        if (!row.master_project) row.master_project = info.master;
        row.zone = info.zone;
        enriched++;
      }
    }
  }

  console.log(`[syncPocketListings] Raco CRM enrichment resolved ${enriched} additional zones`);
  return rows;
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const callerClient = createClientFromRequest(req);
    const user = await callerClient.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body   = await req.json().catch(() => ({}));
    const dryRun = !!body.dry_run;

    // ── Connect ───────────────────────────────────────────────────────────
    const sourceClient = buildSourceClient();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const agentDb      = createSupabaseClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'agent' } });

    // ── Fetch everything in parallel ──────────────────────────────────────
    console.log('[syncPocketListings] Fetching listings + lookups from source app...');
    const [listings, lookups] = await Promise.all([
      fetchAll(sourceClient, 'Listing', 200),
      buildLookups(sourceClient),
    ]);

    console.log(`[syncPocketListings] Fetched ${listings.length} listings`);

    if (listings.length === 0) {
      return Response.json({ success: true, synced: 0, message: 'No listings in source app' });
    }

    // ── Map + enrich ──────────────────────────────────────────────────────
    let rows = listings
      .filter(l => !l.is_deleted && !l.is_sample)
      .map(l => mapRow(l, lookups.communityById, lookups.subProjectById));

    rows = await enrichWithRacoCRM(rows, agentDb);

    // ── Stats ─────────────────────────────────────────────────────────────
    const resolvedZone   = rows.filter(r => r.zone).length;
    const resolvedMaster = rows.filter(r => r.master_project).length;
    const byAgent        = rows.reduce((acc, r) => { const k = r.agent_name || 'Unknown'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const byZone         = rows.reduce((acc, r) => { const k = r.zone || '(unresolved)'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const byPurpose      = rows.reduce((acc, r) => { const k = r.listing_purpose || 'unknown'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const byStage        = rows.reduce((acc, r) => { const k = r.pipeline_stage || 'unknown'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});

    if (dryRun) {
      return Response.json({
        success: true,
        dry_run: true,
        total: rows.length,
        resolved_zone: resolvedZone,
        resolved_master_project: resolvedMaster,
        by_agent: byAgent,
        by_zone: byZone,
        by_purpose: byPurpose,
        by_pipeline_stage: byStage,
        sample: rows.slice(0, 5),
      });
    }

    // ── Upsert into agent.realco13_pocket_listings ────────────────────────
    const CHUNK = 100;
    let upsertedTotal = 0;

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await agentDb
        .from('realco13_pocket_listings')
        .upsert(chunk, { onConflict: 'source_id' });

      if (error) {
        console.error(`[syncPocketListings] Upsert error: ${error.message}`);
        if (error.code === '42P01') {
          return Response.json({
            success: false,
            error: 'Table agent.realco13_pocket_listings does not exist. Please run the DDL first.',
            ddl: DDL,
          }, { status: 500 });
        }
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }
      upsertedTotal += chunk.length;
    }

    console.log(`[syncPocketListings] Done. Upserted ${upsertedTotal} rows.`);

    return Response.json({
      success: true,
      synced: upsertedTotal,
      resolved_zone: resolvedZone,
      resolved_master_project: resolvedMaster,
      by_agent: byAgent,
      by_zone: byZone,
      by_purpose: byPurpose,
      by_pipeline_stage: byStage,
    });

  } catch (err) {
    console.error('[syncPocketListings] EXCEPTION:', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// ── DDL for agent.realco13_pocket_listings ───────────────────────────────────
const DDL = `
-- Run this in your Supabase SQL editor first:
CREATE TABLE IF NOT EXISTS agent.realco13_pocket_listings (
  id                  BIGSERIAL PRIMARY KEY,
  source_id           TEXT UNIQUE NOT NULL,         -- Base44 record ID from 13.realco.ai
  source_system       TEXT DEFAULT 'realco13',
  agent_email         TEXT,                         -- assigned_agent email
  agent_name          TEXT,                         -- resolved display name
  client_id           TEXT,                         -- Base44 client_id reference
  unit_address        TEXT,                         -- raw unit address string
  building            TEXT,                         -- SubProject.name
  master_project      TEXT,                         -- Community.name
  zone                TEXT,                         -- Zone.name or Raco CRM match
  community_id_src    TEXT,                         -- raw community_id from source
  sub_project_id_src  TEXT,                         -- raw sub_project_id from source
  property_category   TEXT,                         -- Apartment / Townhouse / Villa etc
  listing_purpose     TEXT,                         -- sale / rent
  pipeline_stage      TEXT,
  pipeline_sub_status TEXT,
  bedrooms            INTEGER,
  bua_sqft            NUMERIC,
  plot_size_sqft      NUMERIC,
  asking_price_aed    NUMERIC,
  rental_amount_aed   NUMERIC,
  rental_period       TEXT,
  is_hot              BOOLEAN DEFAULT FALSE,
  is_exclusive        BOOLEAN DEFAULT FALSE,
  is_new              BOOLEAN DEFAULT FALSE,
  viewing_status      TEXT,
  follow_up_date      DATE,
  source_record_id    TEXT,
  source_section      TEXT,
  notes               TEXT,
  source_created_at   TIMESTAMPTZ,
  source_updated_at   TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_r13pl_zone        ON agent.realco13_pocket_listings(zone);
CREATE INDEX IF NOT EXISTS idx_r13pl_master      ON agent.realco13_pocket_listings(master_project);
CREATE INDEX IF NOT EXISTS idx_r13pl_agent       ON agent.realco13_pocket_listings(agent_email);
CREATE INDEX IF NOT EXISTS idx_r13pl_purpose     ON agent.realco13_pocket_listings(listing_purpose);
CREATE INDEX IF NOT EXISTS idx_r13pl_stage       ON agent.realco13_pocket_listings(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_r13pl_synced      ON agent.realco13_pocket_listings(synced_at);
`;