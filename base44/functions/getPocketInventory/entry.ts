import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

    // Map to consistent shape — align user-requested field names
    const units = (data || []).map(row => ({
      id: row.id,
      title: row.title,
      asking_price_aed: row.price,          // price → asking_price_aed
      community: row.community,
      assigned_agent: row.assigned_agent_id, // assigned_agent_id → assigned_agent
      property_category: row.property_type,  // property_type → property_category
      status: row.status,
      bedrooms: row.bedrooms,
      size_sqft: row.size_sqft,
      listing_purpose: row.listing_purpose,
      is_hot: row.is_hot,
      is_exclusive: row.is_exclusive,
    }));

    console.log('[getPocketInventory] Returned', units.length, 'properties');
    return Response.json({ units });
  } catch (err) {
    console.error('[getPocketInventory]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});