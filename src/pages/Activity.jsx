import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getAgentTasks, getActivityTimeline } from '@/lib/supabase';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { CheckCircle2, Clock, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = ['Today', 'This Week', 'Overdue', 'Done'];

export default function ActivityPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [tab, setTab] = useState('Today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    Promise.all([
      getAgentTasks(user.email),
      getActivityTimeline(user.email),
    ]).then(([t, a]) => {
      setTasks(t || []);
      setTimeline(a || []);
      setLoading(false);
    }).catch(err => {
      console.error('Activity data error:', err);
      setLoading(false);
    });
  }, [user]);

  async function completeTask(taskId) {
    try {
      await base44.functions.invoke('completeTask', { task_id: taskId });
      setTasks(ts => ts.filter(t => t.id !== taskId));
    } catch {}
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 86400000);

  const filtered = tasks.filter(t => {
    const due = t.due_date ? new Date(t.due_date) : null;
    if (tab === 'Today') return !due || due <= new Date(startOfToday.getTime() + 86400000);
    if (tab === 'This Week') return !due || due <= endOfWeek;
    if (tab === 'Overdue') return due && due < startOfToday;
    if (tab === 'Done') return t.status === 'completed';
    return true;
  });

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Activity"
        subtitle="Your tasks and timeline"
        actions={
          <button className="px-3 py-1.5 text-sm rounded-lg border border-hairline bg-card hover:bg-surface transition-colors font-medium text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            New task
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-hairline">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-evergreen text-evergreen'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
            {t === 'Overdue' && tasks.filter(x => x.due_date && new Date(x.due_date) < startOfToday).length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-terracotta-tint text-terracotta font-semibold">
                {tasks.filter(x => x.due_date && new Date(x.due_date) < startOfToday).length}
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
        <EmptyState icon={CheckCircle2} title="No tasks here" body="Tasks assigned to you will appear here." />
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-hairline bg-card hover:bg-surface transition-colors">
              <button
                onClick={() => completeTask(task.id)}
                className="w-5 h-5 rounded-full border-2 border-hairline-strong hover:border-evergreen flex items-center justify-center shrink-0 transition-colors"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{task.task_title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No due date'}
                  {task.task_type && <span className="text-muted-2">· {task.task_type}</span>}
                </div>
              </div>
              <StatusBadge status={task.status} />
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
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
    </div>
  );
}