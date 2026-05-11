import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PIXXI_BASE_URL = Deno.env.get('PIXXI_BASE_URL');
const PIXXI_API_TOKEN = Deno.env.get('PIXXI_API_TOKEN');
const SUPABASE_URL = 'https://chuyaqczfjkbzxwvhsnm.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function pixxiFetch(path) {
  const res = await fetch(`${PIXXI_BASE_URL}${path}`, {
    headers: {
      'Authorization': `Bearer ${PIXXI_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pixxi API error ${res.status} for ${path}: ${text}`);
  }
  return res.json();
}

async function syncUsers() {
  const data = await pixxiFetch('/users');
  const users = Array.isArray(data) ? data : (data.users || data.data || []);

  const rows = users.map(u => ({
    id: u.id || u.userId || u.user_id,
    full_name: u.name || u.full_name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    email: u.email,
    pixxi_email: u.email,
    role: u.role || 'agent',
    lifecycle_status: u.status || u.lifecycle_status || 'active',
    is_active: u.isActive ?? u.is_active ?? true,
  })).filter(u => u.id && u.email);

  if (rows.length === 0) return { synced: 0 };

  const { error } = await supabase
    .from('pixxi_users')
    .upsert(rows, { onConflict: 'id' });

  if (error) throw new Error(`Supabase upsert users error: ${error.message}`);
  return { synced: rows.length };
}

async function syncListings() {
  // Try paginated fetch
  let allListings = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const data = await pixxiFetch(`/listings?page=${page}&limit=${pageSize}`);
    const listings = Array.isArray(data) ? data : (data.listings || data.data || []);
    if (listings.length === 0) break;
    allListings = allListings.concat(listings);
    if (listings.length < pageSize) break;
    page++;
    if (page > 20) break; // safety cap at 2000 listings
  }

  if (allListings.length === 0) return { synced: 0 };

  const rows = allListings.map(l => ({
    id: String(l.id || l.listingId || l.listing_id),
    pixxi_user_email: l.agentEmail || l.agent_email || l.assignedTo || l.assigned_to || null,
    title: l.title || l.name || null,
    project_name: l.projectName || l.project_name || l.project || null,
    zone: l.area || l.zone || l.community || null,
    unit_number: l.unitNumber || l.unit_number || l.unit || null,
    property_type: l.propertyType || l.property_type || l.type || null,
    bedrooms: l.bedrooms || l.beds || null,
    bathrooms: l.bathrooms || l.baths || null,
    asking_price: l.price || l.askingPrice || l.asking_price || null,
    status: l.status || 'active',
    created_at: l.createdAt || l.created_at || new Date().toISOString(),
    updated_at: l.updatedAt || l.updated_at || new Date().toISOString(),
  })).filter(l => l.id);

  // Batch upsert in chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('pixxi_listings')
      .upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`Supabase upsert listings error: ${error.message}`);
  }

  return { synced: rows.length };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const target = body.target || 'all'; // 'users' | 'listings' | 'all'

    const result = {};

    if (target === 'users' || target === 'all') {
      result.users = await syncUsers();
    }

    if (target === 'listings' || target === 'all') {
      result.listings = await syncListings();
    }

    return Response.json({ success: true, result });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});