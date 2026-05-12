import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://chuyaqczfjkbzxwvhsnm.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const agentDb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { db: { schema: 'agent' } });

Deno.serve(async (req) => {
  try {
    const [usersRes, listingsRes, leadsRes, ownersRes] = await Promise.all([
      supabase.from('pixxi_users').select('*', { count: 'exact' }).limit(3),
      supabase.from('pixxi_listings').select('*', { count: 'exact' }).limit(3),
      supabase.from('pixxi_leads').select('*', { count: 'exact' }).limit(3),
      agentDb.from('raco_owner_intelligence').select('*', { count: 'exact' }).limit(3),
    ]);

    return Response.json({
      pixxi_users: {
        total_count: usersRes.count || 0,
        columns: usersRes.data?.length > 0 ? Object.keys(usersRes.data[0]) : [],
        error: usersRes.error?.message || null,
      },
      pixxi_listings: {
        total_count: listingsRes.count || 0,
        columns: listingsRes.data?.length > 0 ? Object.keys(listingsRes.data[0]) : [],
        error: listingsRes.error?.message || null,
      },
      pixxi_leads: {
        total_count: leadsRes.count || 0,
        columns: leadsRes.data?.length > 0 ? Object.keys(leadsRes.data[0]) : [],
        error: leadsRes.error?.message || null,
      },
      raco_owner_intelligence: {
        total_count: ownersRes.count || 0,
        columns: ownersRes.data?.length > 0 ? Object.keys(ownersRes.data[0]) : [],
        samples: ownersRes.data || [],
        error: ownersRes.error?.message || null,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});