import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = 'https://chuyaqczfjkbzxwvhsnm.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const BAYUT_WEBHOOK_SECRET = 'bayut_raco_webhook_2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Validate secret from header or query param
  const authHeader = req.headers.get('x-webhook-secret') || req.headers.get('authorization');
  const url = new URL(req.url);
  const secretParam = url.searchParams.get('secret');

  const providedSecret = authHeader?.replace('Bearer ', '') || secretParam;
  if (providedSecret !== BAYUT_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Normalize Bayut lead payload
  const lead = {
    source: 'bayut',
    external_id: body.id || body.lead_id || body.enquiry_id || null,
    full_name: body.name || body.full_name || body.client_name || null,
    phone: body.phone || body.mobile || body.contact_number || null,
    email: body.email || null,
    listing_reference: body.reference || body.listing_ref || body.property_ref || null,
    property_type: body.property_type || body.type || null,
    bedrooms: body.bedrooms || body.beds || null,
    budget: body.budget || body.price || null,
    message: body.message || body.enquiry || body.note || null,
    pixxi_user_email: body.agent_email || body.assigned_agent || null,
    lead_status: 'new',
    created_at: body.created_at || new Date().toISOString(),
    raw: body,
  };

  const { data, error } = await supabase
    .from('bayut_leads')
    .insert([lead])
    .select()
    .single();

  if (error) {
    console.error('Bayut lead insert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, lead_id: data?.id });
});