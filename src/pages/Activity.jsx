import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLens } from '@/lib/LensContext';
import { getActivityTimeline } from '@/lib/supabase';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, Clock, Phone, MessageCircle, Users, Eye, RotateCcw,
  Plus, X, Send, ArrowRight, ArrowLeft, ListTodo,
} from 'lucide-react';

const TYPE_META = {
  call: { label: 'Call', icon: Phone },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  meeting: { label: 'Meeting', icon: Users },
  appointment: { label: 'Meeting', icon: Users },
  viewing: { label: 'Viewing', icon: Eye },
  follow_up: { label: 'Follow-up', icon: RotateCcw },
};
const TYPE_CHIPS = ['All', 'Call', 'WhatsApp', 'Meeting', 'Viewing', 'Follow-up', 'Other'];
const TIME_TABS = ['Open', 'Today', 'Overdue', 'Done'];

function typeKey(t) {
  const meta = TYPE_META[t?.type];
  if (!meta) return 'Other';
  return meta.label;
}

function TaskRow({ task, view, onComplete }) {
  const meta = TYPE_META[task.type] || { label: task.type || 'Task', icon: ListTodo };
  const Icon = meta.icon;
  const done = task.status === 'completed';
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-hairline bg-card hover:bg-surface transition-colors">
      <button
        onClick={() => !done && onComplete(task.id)}
        disabled={done}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          done ? 'bg-evergreen border-evergreen' : 'border-hairline-strong hover:border-evergreen'
        )}
        title={done ? 'Completed' : 'Mark complete'}
      >
        {done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </button>
      <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-evergreen" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm font-medium truncate', done ? 'text-muted-foreground line-through' : 'text-foreground')}>
          {task.title}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No due date'}
          </span>
          <span className="text-muted-2">· {meta.label}</span>
          {view === 'to_me' && task.assigned_by && (
            <span className="flex items-center gap-1 text-muted-2">
              <ArrowLeft className="w-3 h-3" /> from {task.assigned_by.split('@')[0]}
            </span>
          )}
          {view === 'by_me' && task.assigned_to && (
            <span className="flex items-center gap-1 text-muted-2">
              <ArrowRight className="w-3 h-3" /> to {task.assigned_to.split('@')[0]}
            </span>
          )}
        </div>
      </div>
      {task.priority && !['medium', 'low'].includes(task.priority) && (
        <span className="text-[10px] uppercase font-semibold text-terracotta bg-terracotta-tint px-1.5 py-0.5 rounded shrink-0">
          {task.priority}
        </span>
      )}
      <StatusBadge status={done ? 'approved' : task.status} label={done ? 'Done' : undefined} />
    </div>
  );
}

function NewAssignmentModal({ onClose, onCreated, pixxiUsers, myEmail }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: '', type: 'call', assigned_to: myEmail || '', due_date: '', priority: 'medium', reason: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.title || !form.assigned_to) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('manageAssignments', {
        action: 'create',
        title: form.title,
        type: form.type,
        assigned_to: form.assigned_to,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        priority: form.priority,
        reason: form.reason || null,
      });
      if (res.data?.error) throw new Error(res.data.error);
      const assignee = pixxiUsers.find(u => (u.pixxi_user_email || u.primary_email) === form.assigned_to);
      toast({
        title: 'Assignment created',
        description: `${assignee?.name || form.assigned_to} will be notified on WhatsApp via Base Echo.`,
      });
      onCreated(res.data?.task);
      onClose();
    } catch (err) {
      toast({ title: 'Could not create assignment', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md bg-card border border-hairline rounded-2xl shadow-xl p-5 space-y-4 animate-fade-in"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">New assignment</div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">What needs to be done? *</label>
          <input
            className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-background text-foreground"
            placeholder="e.g. Call Khalid about the Marina listing"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Activity type</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-background text-foreground"
              value={form.type}
              onChange={e => set('type', e.target.value)}
            >
              <option value="call">Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="meeting">Meeting</option>
              <option value="viewing">Viewing</option>
              <option value="follow_up">Follow-up</option>
              <option value="manual">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Priority</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-background text-foreground"
              value={form.priority}
              onChange={e => set('priority', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Normal</option>
              <option value="high">High</option>
              <option value="critical">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Assign to *</label>
          <select
            className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-background text-foreground"
            value={form.assigned_to}
            onChange={e => set('assigned_to', e.target.value)}
          >
            <option value="">Select an agent…</option>
            {myEmail && <option value={myEmail}>Myself ({myEmail})</option>}
            {pixxiUsers
              .filter(u => (u.pixxi_user_email || u.primary_email) && (u.pixxi_user_email || u.primary_email) !== myEmail)
              .map(u => {
                const email = u.pixxi_user_email || u.primary_email;
                return <option key={u.id} value={email}>{u.name || email}</option>;
              })}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Due date</label>
          <input
            type="datetime-local"
            className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-background text-foreground"
            value={form.due_date}
            onChange={e => set('due_date', e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Note (included in the WhatsApp)</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-background text-foreground resize-none"
            placeholder="Context for the assignee…"
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.title || !form.assigned_to}
          className="w-full py-2.5 rounded-lg bg-evergreen text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="w-3.5 h-3.5" />
          {saving ? 'Assigning…' : 'Assign & notify on WhatsApp'}
        </button>
      </form>
    </div>
  );
}

export default function ActivityPage() {
  const { user } = useAuth();
  const { pixxiUsers, lensEmail } = useLens();
  const { toast } = useToast();
  const [toMe, setToMe] = useState([]);
  const [byMe, setByMe] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [view, setView] = useState('to_me');
  const [typeChip, setTypeChip] = useState('All');
  const [timeTab, setTimeTab] = useState('Open');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const myEmail = lensEmail || user?.email;

  const load = useCallback(() => {
    if (!myEmail) return;
    setLoading(true);
    Promise.all([
      base44.functions.invoke('manageAssignments', { action: 'list', agent_email: myEmail }),
      getActivityTimeline(myEmail),
    ]).then(([res, a]) => {
      setToMe(res.data?.assigned_to_me || []);
      setByMe(res.data?.assigned_by_me || []);
      setTimeline(a || []);
      setLoading(false);
    }).catch(err => {
      console.error('Assignments load error:', err);
      setLoading(false);
    });
  }, [myEmail]);

  useEffect(() => { load(); }, [load]);

  async function completeTask(taskId) {
    try {
      const res = await base44.functions.invoke('manageAssignments', { action: 'complete', task_id: taskId });
      if (res.data?.error) throw new Error(res.data.error);
      setToMe(ts => ts.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
      setByMe(ts => ts.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
    } catch (err) {
      toast({ title: 'Could not complete task', description: err.message, variant: 'destructive' });
    }
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000);

  const source = view === 'to_me' ? toMe : byMe;
  const overdueCount = source.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < startOfToday).length;

  const filtered = source.filter(t => {
    if (typeChip !== 'All' && typeKey(t) !== typeChip) return false;
    const due = t.due_date ? new Date(t.due_date) : null;
    const done = t.status === 'completed';
    if (timeTab === 'Open') return !done;
    if (timeTab === 'Today') return !done && due && due >= startOfToday && due < endOfToday;
    if (timeTab === 'Overdue') return !done && due && due < startOfToday;
    if (timeTab === 'Done') return done;
    return true;
  });

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Activity"
        subtitle="Assignments and your activity timeline"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 text-sm rounded-lg bg-evergreen text-white hover:opacity-90 transition-opacity font-medium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New assignment
          </button>
        }
      />

      {/* View toggle */}
      <div className="inline-flex rounded-lg border border-hairline bg-surface p-0.5 mb-4">
        {[['to_me', 'Assigned to me', toMe.filter(t => t.status !== 'completed').length],
          ['by_me', 'Assigned by me', byMe.filter(t => t.status !== 'completed').length]].map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
              view === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
              view === key ? 'bg-evergreen-tint text-evergreen' : 'bg-surface-2 text-muted-2')}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Type chips */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {TYPE_CHIPS.map(c => (
          <button
            key={c}
            onClick={() => setTypeChip(c)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
              typeChip === c
                ? 'bg-evergreen text-white border-evergreen'
                : 'bg-card text-muted-foreground border-hairline hover:text-foreground'
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Time tabs */}
      <div className="flex gap-1 mb-6 border-b border-hairline">
        {TIME_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTimeTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              timeTab === t
                ? 'border-evergreen text-evergreen'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
            {t === 'Overdue' && overdueCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-terracotta-tint text-terracotta font-semibold">
                {overdueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing here"
          body={view === 'to_me' ? 'Activities assigned to you will appear here.' : 'Activities you assign to others will appear here.'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskRow key={task.id} task={task} view={view} onComplete={completeTask} />
          ))}
        </div>
      )}

      {/* Recent Activity timeline */}
      {timeline.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
          <div className="space-y-0 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-hairline">
            {timeline.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-start gap-4 py-2.5 relative">
                <div className="w-5 h-5 rounded-full bg-card border border-hairline flex items-center justify-center shrink-0 relative z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-evergreen" />
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="text-sm text-foreground">{a.description || a.event_type}</div>
                  <div className="text-xs text-muted-2 mt-0.5 font-mono">
                    {a.event_at ? new Date(a.event_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <NewAssignmentModal
          onClose={() => setShowModal(false)}
          onCreated={() => load()}
          pixxiUsers={pixxiUsers}
          myEmail={user?.email}
        />
      )}
    </div>
  );
}
