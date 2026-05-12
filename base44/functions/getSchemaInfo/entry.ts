import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const pub = createClient(SUPABASE_URL, SUPABASE_KEY);
    const agent = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'agent' } });

    // List all tables/views in public schema
    const { data: pubTables } = await pub
      .from('information_schema.tables')
      .select('table_name, table_type, table_schema')
      .eq('table_schema', 'public')
      .order('table_name');

    // List all tables/views in agent schema
    const { data: agentTables } = await pub
      .from('information_schema.tables')
      .select('table_name, table_type, table_schema')
      .eq('table_schema', 'agent')
      .order('table_name');

    // Probe the known scope-related views
    const probes = await Promise.all([
      pub.from('v_admin_scope_projects').select('*', { count: 'exact' }).limit(1),
      pub.from('v_workspace_scopes').select('*', { count: 'exact' }).limit(1),
      agent.from('v_admin_scope_projects').select('*', { count: 'exact' }).limit(1),
      agent.from('v_workspace_scopes').select('*', { count: 'exact' }).limit(1),
      agent.from('raco_project_intelligence').select('*', { count: 'exact' }).limit(1),
      pub.from('workspace_scope_assignments').select('*', { count: 'exact' }).limit(1),
    ]);

    const probeNames = [
      'public.v_admin_scope_projects',
      'public.v_workspace_scopes',
      'agent.v_admin_scope_projects',
      'agent.v_workspace_scopes',
      'agent.raco_project_intelligence',
      'public.workspace_scope_assignments',
    ];

    const probeResults = {};
    probeNames.forEach((name, i) => {
      probeResults[name] = {
        count: probes[i].count,
        error: probes[i].error ? probes[i].error.message : null,
        sample_columns: probes[i].data?.[0] ? Object.keys(probes[i].data[0]) : [],
      };
    });

    return Response.json({
      public_tables: pubTables?.map(t => `${t.table_type}:${t.table_name}`) || [],
      agent_tables: agentTables?.map(t => `${t.table_type}:${t.table_name}`) || [],
      probes: probeResults,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});