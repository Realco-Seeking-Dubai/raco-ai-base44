import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    // Get pixxi_users columns
    const { data: users } = await base44.supabase
      .from('pixxi_users')
      .select('*')
      .limit(1);

    // Get pixxi_listings columns
    const { data: listings } = await base44.supabase
      .from('pixxi_listings')
      .select('*')
      .limit(1);

    // Get pixxi_leads columns
    const { data: leads } = await base44.supabase
      .from('pixxi_leads')
      .select('*')
      .limit(1);

    return Response.json({
      pixxi_users_columns: users?.length > 0 ? Object.keys(users[0]) : [],
      pixxi_listings_columns: listings?.length > 0 ? Object.keys(listings[0]) : [],
      pixxi_leads_columns: leads?.length > 0 ? Object.keys(leads[0]) : [],
      sample_user: users?.[0] || null,
      sample_listing: listings?.[0] || null,
      sample_lead: leads?.[0] || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});