import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agent_email } = await req.json().catch(() => ({}));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    let q = supabase
      .from('pixxi_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (agent_email) {
      q = q.eq('pixxi_user_email', agent_email);
    }

    const { data, error } = await q;

    if (error) {
      console.error('[getLeads] Query error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[getLeads] Returned', data?.length, 'leads for', agent_email || 'all');
    return Response.json({ leads: data || [] });
  } catch (err) {
    console.error('[getLeads]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});