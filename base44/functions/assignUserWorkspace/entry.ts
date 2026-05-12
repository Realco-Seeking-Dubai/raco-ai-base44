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

    // workspace_scope_assignments columns:
    // user_email, scope_label, zone, master_project_name, project, assigned_by, is_active
    const rows = [
      ...zones.map(z => ({
        user_email,
        scope_label: z,
        zone: z,
        master_project_name: null,
        project: null,
        assigned_by: user.email,
        is_active: true,
      })),
      ...masterProjects.map(m => ({
        user_email,
        scope_label: m,
        zone: null,
        master_project_name: m,
        project: null,
        assigned_by: user.email,
        is_active: true,
      })),
      ...projects.map(p => ({
        user_email,
        scope_label: p,
        zone: null,
        master_project_name: null,
        project: p,
        assigned_by: user.email,
        is_active: true,
      })),
    ];

    if (rows.length === 0) return Response.json({ ok: true, inserted: 0 });

    const { error } = await supabase
      .from('workspace_scope_assignments')
      .upsert(rows, { onConflict: 'user_email,scope_label', ignoreDuplicates: true });

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