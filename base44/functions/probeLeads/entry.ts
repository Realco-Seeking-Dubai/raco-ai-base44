import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  // Get top agents by lead count
  const { data: leads, error } = await supabase
    .from('pixxi_leads')
    .select('pixxi_user_email')
    .not('pixxi_user_email', 'is', null)
    .limit(5000);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Count by agent
  const counts = {};
  for (const l of leads || []) {
    const e = l.pixxi_user_email || 'unassigned';
    counts[e] = (counts[e] || 0) + 1;
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([email, count]) => ({ email, count }));

  return Response.json({ total: leads.length, top_agents: sorted });
});