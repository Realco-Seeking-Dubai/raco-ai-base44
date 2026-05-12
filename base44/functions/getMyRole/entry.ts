import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Check user_roles table
    let isAdmin = ['admin', 'super_admin'].includes(user.role);

    if (!isAdmin) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('email', user.email)
        .limit(1)
        .single();
      isAdmin = ['admin', 'super_admin'].includes(data?.role);
    }

    return Response.json({ role: user.role, is_admin: isAdmin, email: user.email });
  } catch (err) {
    console.error('[getMyRole]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});