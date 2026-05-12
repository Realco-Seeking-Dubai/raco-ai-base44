import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      {
        global: {
          headers: { 'Accept-Profile': 'agent', 'Content-Profile': 'agent' }
        }
      }
    );

    const { data, error } = await supabase
      .from('raco_project_intelligence')
      .select('master_project_name, zone, area')
      .not('master_project_name', 'is', null)
      .order('master_project_name', { ascending: true })
      .limit(5000);

    if (error) {
      console.error('[getProjectList] Query error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate by master_project_name
    const seen = new Set();
    const projects = (data || []).filter(r => {
      if (!r.master_project_name || seen.has(r.master_project_name)) return false;
      seen.add(r.master_project_name);
      return true;
    });

    console.log('[getProjectList] Returned', projects.length, 'unique projects');
    return Response.json({ projects });
  } catch (err) {
    console.error('[getProjectList]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});