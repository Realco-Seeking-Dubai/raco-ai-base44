import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function isAdminUser(supabase, userEmail) {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('email', userEmail)
      .limit(1)
      .single();
    return ['admin', 'super_admin'].includes(data?.role);
  } catch (_) {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { agent_email } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Determine effective agent scope
    const adminByRole = ['admin', 'super_admin'].includes(user.role);
    const adminByTable = await isAdminUser(supabase, user.email);
    const isAdmin = adminByRole || adminByTable;

    // Non-admins are always forced to their own email
    const effectiveEmail = isAdmin ? (agent_email || null) : user.email;

    let q = supabase
      .from('pixxi_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (effectiveEmail) {
      q = q.eq('pixxi_user_email', effectiveEmail);
    }

    const { data, error } = await q;

    if (error) {
      console.error('[getLeads] Query error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[getLeads] isAdmin:', isAdmin, '| scope:', effectiveEmail || 'GLOBAL', '| count:', data?.length);
    return Response.json({ leads: data || [], is_global: isAdmin && !effectiveEmail });
  } catch (err) {
    console.error('[getLeads]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});