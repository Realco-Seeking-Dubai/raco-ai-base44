import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = 'https://chuyaqczfjkbzxwvhsnm.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req) => {
  try {
    // Get counts and sample data for all three tables
    const [usersRes, listingsRes, leadsRes] = await Promise.all([
      supabase.from('pixxi_users').select('*', { count: 'exact' }).limit(3),
      supabase.from('pixxi_listings').select('*', { count: 'exact' }).limit(3),
      supabase.from('pixxi_leads').select('*', { count: 'exact' }).limit(3),
    ]);

    return Response.json({
      pixxi_users: {
        total_count: usersRes.count || 0,
        columns: usersRes.data?.length > 0 ? Object.keys(usersRes.data[0]) : [],
        samples: usersRes.data || [],
      },
      pixxi_listings: {
        total_count: listingsRes.count || 0,
        columns: listingsRes.data?.length > 0 ? Object.keys(listingsRes.data[0]) : [],
        samples: listingsRes.data || [],
      },
      pixxi_leads: {
        total_count: leadsRes.count || 0,
        columns: leadsRes.data?.length > 0 ? Object.keys(leadsRes.data[0]) : [],
        samples: leadsRes.data || [],
      },
      errors: {
        users: usersRes.error?.message || null,
        listings: listingsRes.error?.message || null,
        leads: leadsRes.error?.message || null,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});