import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const publicDb = createClient(SUPABASE_URL, SERVICE_KEY);
    const agentDb  = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'agent' } });

    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 5;

    // Tables to probe: [schema, table]
    const tables = [
      // agent schema
      ['agent', 'raco_owner_intelligence'],
      ['agent', 'raco_owner_directory'],
      ['agent', 'raco_owner_area_intelligence'],
      ['agent', 'raco_project_intelligence'],
      ['agent', 'owner_master_summary'],
      ['agent', 'monday_contact_owners'],
      // public schema
      ['public', 'raco_owners'],
      ['public', 'raco_owner_projects'],
      ['public', 'raco_owner_notes'],
      ['public', 'pm_transactions'],
    ];

    // Views
    const views = [
      ['public', 'v_owner_summary'],
      ['public', 'v_owner_pipeline'],
      ['public', 'v_priority_owners'],
      ['public', 'v_master_project_owner_counts'],
      ['agent',  'v_owners_by_project'],
    ];

    const results = {};

    async function probeTable(schema, table) {
      const db = schema === 'agent' ? agentDb : publicDb;
      const { data, error, count } = await db
        .from(table)
        .select('*', { count: 'exact' })
        .limit(limit);

      if (error) return { error: error.message, fields: [], rows: [], total: 0 };

      const fields = data && data.length > 0 ? Object.keys(data[0]) : [];
      return {
        fields,
        total_count: count,
        sample_rows: data || [],
      };
    }

    // Run all probes in parallel
    const allTables = [...tables, ...views];
    const probeResults = await Promise.all(
      allTables.map(([schema, table]) =>
        probeTable(schema, table).then(result => ({ schema, table, ...result }))
      )
    );

    for (const r of probeResults) {
      results[`${r.schema}.${r.table}`] = {
        fields: r.fields,
        total_count: r.total_count,
        sample_rows: r.sample_rows,
        error: r.error,
      };
    }

    return Response.json({ tables: results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});