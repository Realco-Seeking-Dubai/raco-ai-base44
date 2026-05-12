import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const agentDb = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { db: { schema: 'agent' } }
    );

    const { data, error } = await agentDb
      .from('raco_project_intelligence')
      .select('*')
      .limit(100);

    if (error) {
      console.error('[getMarketInsights] Query error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[getMarketInsights] Returned', data?.length, 'records');
    return Response.json({ insights: data || [] });
  } catch (err) {
    console.error('[getMarketInsights]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});