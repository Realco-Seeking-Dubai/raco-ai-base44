import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

// manageAssignments — list / create / complete / reassign tasks.
// Creating or reassigning a task fires the DB trigger that queues a
// Base Echo outbox event, which notifies the assignee on WhatsApp.

const VALID_TYPES = ['call', 'whatsapp', 'meeting', 'viewing', 'follow_up', 'outreach', 'send_material', 'reminder', 'crm_update', 'appointment', 'manual'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const isAdmin = ['admin', 'super_admin'].includes(user.role);
    // Admins may view through another agent's lens
    const me = (isAdmin && body.agent_email) ? body.agent_email : user.email;

    // ── LIST ──────────────────────────────────────────────────────────
    if (action === 'list') {
      const [toMe, byMe] = await Promise.all([
        supabase.from('tasks').select('*').eq('assigned_to', me)
          .order('created_at', { ascending: false }).limit(300),
        supabase.from('tasks').select('*').eq('assigned_by', me)
          .order('created_at', { ascending: false }).limit(300),
      ]);
      if (toMe.error) return Response.json({ error: toMe.error.message }, { status: 500 });
      if (byMe.error) return Response.json({ error: byMe.error.message }, { status: 500 });
      return Response.json({
        assigned_to_me: toMe.data || [],
        assigned_by_me: (byMe.data || []).filter(t => t.assigned_to !== me),
      });
    }

    // ── CREATE ────────────────────────────────────────────────────────
    if (action === 'create') {
      const { title, type, assigned_to, due_date, priority, reason } = body;
      if (!title || !assigned_to) {
        return Response.json({ error: 'title and assigned_to are required' }, { status: 400 });
      }
      const taskType = VALID_TYPES.includes(type) ? type : 'manual';
      const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
      const { data, error } = await supabase.from('tasks').insert({
        title,
        type: taskType,
        status: 'new',
        priority: VALID_PRIORITIES.includes(priority) ? priority : 'medium',
        assigned_to,
        assigned_by: user.email,
        due_date: due_date || null,
        reason: reason || null,
        source_type: 'manual',
        source_record_id: `assignments_page:${user.email}`,
        owner_id: user.email,
        created_by_service: 'assignments_page',
        metadata: { route: 'base_echo', source: 'assignments_page' },
      }).select().single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      console.log('[manageAssignments] created', data.id, '→', assigned_to, 'by', user.email);
      return Response.json({ task: data, whatsapp_queued: true });
    }

    // ── COMPLETE ──────────────────────────────────────────────────────
    if (action === 'complete') {
      const { task_id } = body;
      if (!task_id) return Response.json({ error: 'task_id required' }, { status: 400 });
      let q = supabase.from('tasks')
        .update({ status: 'completed', outcome_id: 'done_via_crm' })
        .eq('id', task_id);
      if (!isAdmin) q = q.or(`assigned_to.eq.${user.email},assigned_by.eq.${user.email}`);
      const { data, error } = await q.select();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      if (!data?.length) return Response.json({ error: 'Task not found or not yours' }, { status: 403 });
      return Response.json({ task: data[0] });
    }

    // ── REASSIGN ──────────────────────────────────────────────────────
    if (action === 'reassign') {
      const { task_id, assigned_to } = body;
      if (!task_id || !assigned_to) {
        return Response.json({ error: 'task_id and assigned_to required' }, { status: 400 });
      }
      let q = supabase.from('tasks')
        .update({ assigned_to, assigned_by: user.email, status: 'new' })
        .eq('id', task_id);
      if (!isAdmin) q = q.or(`assigned_to.eq.${user.email},assigned_by.eq.${user.email}`);
      const { data, error } = await q.select();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      if (!data?.length) return Response.json({ error: 'Task not found or not yours' }, { status: 403 });
      return Response.json({ task: data[0], whatsapp_queued: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('[manageAssignments]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
