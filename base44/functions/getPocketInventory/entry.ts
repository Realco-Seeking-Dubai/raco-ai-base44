import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Returns true if value looks like a UUID
const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { limit = 200 } = body;

    const db = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const { data, error } = await db
      .from('properties')
      .select('id, title, price, community, assigned_agent_id, property_type, status, bedrooms, size_sqft, listing_purpose, is_hot, is_exclusive')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getPocketInventory] Query error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Collect all unique assigned_agent_id values that look like UUIDs
    const agentIds = [...new Set(
      (data || [])
        .map(r => r.assigned_agent_id)
        .filter(v => v && isUUID(v))
    )];

    // Build a UUID → display label map by querying pixxi_users (or any users table)
    const agentMap = {};
    if (agentIds.length > 0) {
      // Try public.pixxi_users first, fall back silently
      const { data: agentRows } = await db
        .from('pixxi_users')
        .select('id, pixxi_email, full_name, display_name')
        .in('id', agentIds);

      (agentRows || []).forEach(a => {
        agentMap[a.id] = a.display_name || a.full_name || a.pixxi_email || a.id;
      });
    }

    // Resolve assigned_agent: if it's a UUID look it up; if it's already an email/name use as-is
    const resolveAgent = (val) => {
      if (!val) return null;
      if (isUUID(val)) return agentMap[val] || val; // UUID → resolved label or fallback to raw UUID
      return val; // already an email or name
    };

    const units = (data || []).map(row => ({
      id: row.id,
      title: row.title,
      asking_price_aed: row.price,
      community: row.community,
      assigned_agent: resolveAgent(row.assigned_agent_id),
      property_category: row.property_type,
      status: row.status,
      bedrooms: row.bedrooms,
      size_sqft: row.size_sqft,
      listing_purpose: row.listing_purpose,
      is_hot: row.is_hot,
      is_exclusive: row.is_exclusive,
    }));

    console.log('[getPocketInventory] Returned', units.length, 'properties,', agentIds.length, 'agent IDs resolved');
    return Response.json({ units });
  } catch (err) {
    console.error('[getPocketInventory]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});