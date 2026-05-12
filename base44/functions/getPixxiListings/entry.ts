import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { agent_email, status, search, limit = 200 } = body;

    const db = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    let query = db
      .from('pixxi_listings')
      .select('id, pixxi_id, title, listing_type, property_type, status, price, bedrooms, bathrooms, size_sqft, region, community, developer, agent_name, agent_email, furnishing, photos, pixxi_created_at, pixxi_updated_at')
      .order('pixxi_updated_at', { ascending: false })
      .limit(limit);

    if (agent_email) {
      query = query.eq('agent_email', agent_email);
    }
    if (status && status !== 'All') {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,community.ilike.%${search}%,region.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getPixxiListings] Query error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[getPixxiListings] Returned', data?.length, 'listings');
    return Response.json({ listings: data || [] });
  } catch (err) {
    console.error('[getPixxiListings]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});