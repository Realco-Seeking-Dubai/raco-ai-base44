import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://chuyaqczfjkbzxwvhsnm.supabase.co';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Debug: log first 5 chars so we can verify env vars are loaded
    console.log('[getPixxiUsers] SUPABASE_URL prefix:', supabaseUrl?.slice(0, 5));
    console.log('[getPixxiUsers] SERVICE_KEY prefix:', serviceKey?.slice(0, 5));

    if (!serviceKey) {
      return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase
      .from('pixxi_users')
      .select('id, name, pixxi_user_email, primary_email, lifecycle_status, is_active, avatar_url')
      .order('name', { ascending: true });

    if (error) {
      console.error('[getPixxiUsers] Query error:', JSON.stringify(error));
      return Response.json({ error: error.message, details: error }, { status: 500 });
    }

    console.log('[getPixxiUsers] Returned', data?.length, 'users');
    return Response.json({ users: data || [] });
  } catch (err) {
    console.error('[getPixxiUsers] Unexpected error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});