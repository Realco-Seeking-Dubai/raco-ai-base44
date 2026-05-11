import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chuyaqczfjkbzxwvhsnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Am8DfqZNOJWfvuYU1DV1Hg_l2RVuCAX';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Network & Contacts ────────────────────────────────────────────────────

export async function getNetworkContacts({ search } = {}) {
  let q = supabase.from('network_of_contacts').select('*').limit(100).order('last_contact_at', { ascending: false, nullsFirst: false });
  if (search) q = q.ilike('full_name', `%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// ─── Leads ────────────────────────────────────────────────────────────────

export async function getLeads() {
  const { data, error } = await supabase.from('pixxi_leads').select('*').limit(200).order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ─── Deals ────────────────────────────────────────────────────────────────

export async function getDeals() {
  const { data, error } = await supabase.from('deals').select('*').limit(200).order('created_at', { ascending: false });
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
  const { data, error } = await supabase.from('owner_status').select('*').eq('agent_email', userEmail).limit(200);
  if (error) return [];
  return data || [];
}

// ─── AI Suggestions ───────────────────────────────────────────────────────

export async function getAiSuggestions(userEmail) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase.from('project_market_summary').select('*').limit(50);
  if (error) return [];
  return data || [];
}

// ─── Admin ────────────────────────────────────────────────────────────────

export async function getPixxiUsers() {
  const { data, error } = await supabase
    .from('pixxi_users')
    .select('id,full_name,email,role,lifecycle_status')
    .order('full_name', { ascending: true });
  if (error) return [];
  return data || [];
}

// ─── Campaigns ───────────────────────────────────────────────────────────

export async function getCampaigns(userEmail) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('created_by', userEmail)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return data || [];
}

// ─── Compliance / Audit Log ───────────────────────────────────────────────

export async function getAuditLog() {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return [];
  return data || [];
}

// ─── Owner Status Update ─────────────────────────────────────────────────

export async function updateOwnerStatus(ownerId, agentEmail, status, note) {
  const { error } = await supabase.from('owner_status').upsert({
    owner_id: ownerId,
    agent_email: agentEmail,
    status,
    last_updated: new Date().toISOString(),
  });
  if (error) throw error;
  if (note) {
    await supabase.from('owner_notes').insert({
      owner_id: ownerId,
      agent_email: agentEmail,
      note,
      created_at: new Date().toISOString(),
    });
  }
}