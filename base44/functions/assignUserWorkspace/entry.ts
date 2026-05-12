import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { user_email, zones = [], masterProjects = [], projects = [] } = body;

    if (!user_email) return Response.json({ error: 'user_email is required' }, { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Build rows to insert into workspace_scope_assignments
    const rows = [
      ...zones.map(z => ({ user_email, scope_type: 'zone', scope_value: z, assigned_by: user.email })),
      ...masterProjects.map(m => ({ user_email, scope_type: 'master_project', scope_value: m, assigned_by: user.email })),
      ...projects.map(p => ({ user_email, scope_type: 'project', scope_value: p, assigned_by: user.email })),
    ];

    if (rows.length === 0) {
      return Response.json({ ok: true, inserted: 0 });
    }

    // Upsert to avoid duplicates (requires unique constraint on user_email + scope_type + scope_value)
    const { data, error } = await supabase
      .from('workspace_scope_assignments')
      .upsert(rows, { onConflict: 'user_email,scope_type,scope_value', ignoreDuplicates: true });

    if (error) {
      console.error('[assignUserWorkspace] Upsert error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[assignUserWorkspace] Inserted', rows.length, 'rows for', user_email);
    return Response.json({ ok: true, inserted: rows.length });
  } catch (err) {
    console.error('[assignUserWorkspace]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});