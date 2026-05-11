// Supabase client via fetch — no npm package needed
const SUPABASE_URL = 'https://chuyaqczfjkbzxwvhsnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Am8DfqZNOJWfvuYU1DV1Hg_l2RVuCAX';

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Supabase error ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

function buildQuery(table, params = {}) {
  const qs = new URLSearchParams();
  if (params.select) qs.set('select', params.select);
  if (params.order) qs.set('order', params.order);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.filters) {
    for (const [k, v] of Object.entries(params.filters)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, `eq.${v}`);
    }
  }
  if (params.ilike) {
    for (const [k, v] of Object.entries(params.ilike)) {
      if (v) qs.set(k, `ilike.*${v}*`);
    }
  }
  if (params.neq) {
    for (const [k, v] of Object.entries(params.neq)) {
      qs.set(k, `neq.${v}`);
    }
  }
  if (params.gt) {
    for (const [k, v] of Object.entries(params.gt)) {
      qs.set(k, `gt.${v}`);
    }
  }
  const str = qs.toString();
  return str ? `${table}?${str}` : table;
}

// ─── API ───────────────────────────────────────────────────────────────────

export async function getNetworkContacts(filters = {}) {
  const path = buildQuery('network_of_contacts', {
    select: '*',
    limit: 100,
    order: 'last_contact_at.desc.nullslast',
    ilike: filters.search ? { full_name: filters.search } : undefined,
    filters: filters.current_tag ? { current_tag: filters.current_tag } : undefined,
  });
  return sbFetch(path);
}

export async function getLeads(filters = {}) {
  const path = buildQuery('pixxi_leads', {
    select: '*',
    limit: 200,
    order: 'created_at.desc',
    filters: filters.source ? { source: filters.source } : undefined,
  });
  return sbFetch(path).catch(() => []);
}

export async function getDeals(filters = {}) {
  const path = buildQuery('deals', {
    select: '*',
    limit: 200,
    order: 'created_at.desc',
    filters: filters.stage ? { stage: filters.stage } : undefined,
  });
  return sbFetch(path).catch(() => []);
}

export async function getOwners(filters = {}) {
  const path = buildQuery('raco_owners', {
    select: 'id,full_name,email,phone,total_properties',
    limit: 200,
    ilike: filters.search ? { full_name: filters.search } : undefined,
  });
  return sbFetch(path).catch(() => []);
}

export async function getOwnerStatus(userEmail) {
  const path = buildQuery('owner_status', {
    select: '*',
    limit: 200,
    filters: { agent_email: userEmail },
  });
  return sbFetch(path).catch(() => []);
}

export async function getAiSuggestions(userEmail) {
  const path = buildQuery('ai_suggestions', {
    select: '*',
    limit: 10,
    order: 'priority_score.desc',
    filters: { target_agent_email: userEmail, status: 'open' },
  });
  return sbFetch(path).catch(() => []);
}

export async function getAgentTasks(userEmail) {
  const path = buildQuery('tasks', {
    select: '*',
    limit: 20,
    order: 'priority_score.desc.nullslast',
    filters: { assigned_to: userEmail },
    neq: { status: 'completed' },
  });
  return sbFetch(path).catch(() => []);
}

export async function getActivityTimeline(userEmail) {
  const path = buildQuery('v_activity_timeline', {
    select: '*',
    limit: 30,
    order: 'event_at.desc',
    filters: { agent_email: userEmail },
  });
  return sbFetch(path).catch(() => []);
}

export async function getMarketSummary() {
  const path = buildQuery('project_market_summary', {
    select: '*',
    limit: 50,
  });
  return sbFetch(path).catch(() => []);
}

export async function getPixxiUsers() {
  const path = buildQuery('pixxi_users', {
    select: 'id,full_name,email,role,lifecycle_status',
    order: 'full_name.asc',
  });
  return sbFetch(path).catch(() => []);
}

export async function getCampaigns(userEmail) {
  const path = buildQuery('campaigns', {
    select: '*',
    limit: 50,
    order: 'created_at.desc',
    filters: { created_by: userEmail },
  });
  return sbFetch(path).catch(() => []);
}

export async function getAuditLog() {
  const path = buildQuery('audit_log', {
    select: '*',
    limit: 100,
    order: 'created_at.desc',
  });
  return sbFetch(path).catch(() => []);
}

export async function updateOwnerStatus(ownerId, agentEmail, status, note) {
  await sbFetch('owner_status', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      owner_id: ownerId,
      agent_email: agentEmail,
      status,
      last_updated: new Date().toISOString(),
    }),
  });
  if (note) {
    await sbFetch('owner_notes', {
      method: 'POST',
      body: JSON.stringify({
        owner_id: ownerId,
        agent_email: agentEmail,
        note,
        created_at: new Date().toISOString(),
      }),
    });
  }
}