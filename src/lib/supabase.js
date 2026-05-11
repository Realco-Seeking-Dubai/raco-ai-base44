import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chuyaqczfjkbzxwvhsnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Am8DfqZNOJWfvuYU1DV1Hg_l2RVuCAX';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const agentDb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { db: { schema: 'agent' } });

// ─── Network & Contacts ────────────────────────────────────────────────────

export async function getNetworkContacts({ search } = {}) {
  let q = agentDb.from('network_of_contacts').select('*').limit(100).order('last_contact_at', { ascending: false, nullsFirst: false });
  if (search) q = q.ilike('full_name', `%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// ─── Leads ────────────────────────────────────────────────────────────────

export async function getLeads(lensEmail) {
  let q = supabase.from('pixxi_leads').select('*').limit(200).order('created_at', { ascending: false });
  if (lensEmail) q = q.eq('pixxi_user_email', lensEmail);
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

// ─── Deals ────────────────────────────────────────────────────────────────

export async function getDeals() {
  const { data, error } = await agentDb.from('deals').select('*').limit(200).order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ─── Owners ───────────────────────────────────────────────────────────────

export async function getOwners() {
  const { data, error } = await supabase.from('raco_owners').select('id,full_name,email,phone,total_properties').limit(200);
  if (error) return [];
  return data || [];
}

export async function getOwnerStatus(userEmail) {
  const { data, error } = await agentDb.from('owner_status').select('*').eq('agent_email', userEmail).limit(200);
  if (error) return [];
  return data || [];
}

// ─── AI Suggestions ───────────────────────────────────────────────────────

export async function getAiSuggestions(userEmail) {
  const { data, error } = await agentDb
    .from('ai_suggestions')
    .select('*')
    .eq('target_agent_email', userEmail)
    .eq('status', 'open')
    .order('priority_score', { ascending: false })
    .limit(10);
  if (error) return [];
  return data || [];
}

// ─── Tasks ────────────────────────────────────────────────────────────────

export async function getAgentTasks(userEmail) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_to', userEmail)
    .neq('status', 'completed')
    .order('priority_score', { ascending: false, nullsFirst: false })
    .limit(20);
  if (error) return [];
  return data || [];
}

// ─── Activity Timeline ────────────────────────────────────────────────────

export async function getActivityTimeline(userEmail) {
  const { data, error } = await agentDb
    .from('v_activity_timeline')
    .select('*')
    .eq('agent_email', userEmail)
    .order('event_at', { ascending: false })
    .limit(30);
  if (error) return [];
  return data || [];
}

// ─── Market ───────────────────────────────────────────────────────────────

export async function getMarketSummary() {
  const { data, error } = await agentDb.from('mv_master_project_summary').select('*').limit(50);
  if (error) return [];
  return data || [];
}

// ─── Admin ────────────────────────────────────────────────────────────────

export async function getPixxiUsers() {
  const { data, error } = await supabase
    .from('pixxi_users')
    .select('id,full_name,email,pixxi_email,primary_email,role,lifecycle_status,is_active')
    .order('full_name', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function updatePixxiUserLifecycle(userId, lifecycle_status) {
  const is_active = lifecycle_status === 'active';
  const { error } = await supabase
    .from('pixxi_users')
    .update({ lifecycle_status, is_active })
    .eq('id', userId);
  if (error) throw error;
}

// ─── Pixxi Listings ──────────────────────────────────────────────────────

export async function getPixxiListings(userEmail, { filterByAgent = true } = {}) {
  let q = supabase.from('pixxi_listings').select('*').limit(200).order('created_at', { ascending: false });
  if (userEmail && filterByAgent) q = q.eq('pixxi_user_email', userEmail);
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

// ─── Portal Leads (Bayut / Dubizzle) ─────────────────────────────────────

export async function getPortalLeads(userEmail) {
  let q = supabase
    .from('pixxi_leads')
    .select('*')
    .in('source', ['bayut', 'dubizzle', 'Bayut', 'Dubizzle'])
    .limit(200)
    .order('created_at', { ascending: false });
  if (userEmail) q = q.eq('pixxi_user_email', userEmail);
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

// ─── Campaigns ───────────────────────────────────────────────────────────

export async function getCampaigns(userEmail) {
  const { data, error } = await agentDb
    .from('campaigns')
    .select('*')
    .eq('created_by', userEmail)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return data || [];
}

// ─── Compliance / Outbound Messages ───────────────────────────────────────────────

export async function getAuditLog() {
  const { data, error } = await agentDb
    .from('outbound_messages')
    .select('*')
    .not('compliance_status', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return [];
  return data || [];
}

// ─── Owner Status Update ─────────────────────────────────────────────────

export async function updateOwnerStatus(ownerId, agentEmail, status, note) {
  const { error } = await agentDb.from('owner_status').upsert({
    owner_id: ownerId,
    agent_email: agentEmail,
    status,
    last_updated: new Date().toISOString(),
  });
  if (error) throw error;
  if (note) {
    await agentDb.from('owner_notes').insert({
      owner_id: ownerId,
      agent_email: agentEmail,
      note,
      created_at: new Date().toISOString(),
    });
  }
}