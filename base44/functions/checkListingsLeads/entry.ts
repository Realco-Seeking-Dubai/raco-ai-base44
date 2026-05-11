import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = 'https://chuyaqczfjkbzxwvhsnm.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req) => {
  try {
    const [listingsRes, leadsRes] = await Promise.all([
      supabase.from('pixxi_listings').select('*', { count: 'exact' }).limit(2),
      supabase.from('pixxi_leads').select('*', { count: 'exact' }).limit(2),
    ]);

    return Response.json({
      pixxi_listings: {
        total_count: listingsRes.count || 0,
        columns: listingsRes.data?.length > 0 ? Object.keys(listingsRes.data[0]) : [],
        sample: listingsRes.data?.[0] || null,
        error: listingsRes.error?.message || null,
      },
      pixxi_leads: {
        total_count: leadsRes.count || 0,
        columns: leadsRes.data?.length > 0 ? Object.keys(leadsRes.data[0]) : [],
        sample: leadsRes.data?.[0] || null,
        error: leadsRes.error?.message || null,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});