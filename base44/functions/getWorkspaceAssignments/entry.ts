import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { user_email } = body; // optional filter

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    let q = supabase
      .from('v_workspace_assignments')
      .select('*')
      .limit(500);

    if (user_email) {
      q = q.eq('user_email', user_email);
    }

    const { data, error } = await q;

    if (error) {
      console.error('[getWorkspaceAssignments] Query error:', JSON.stringify(error));
      // Return empty gracefully — view may not exist in all envs
      return Response.json({ assignments: [] });
    }

    console.log('[getWorkspaceAssignments] Returned', data?.length, 'rows');
    return Response.json({ assignments: data || [] });
  } catch (err) {
    console.error('[getWorkspaceAssignments]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});