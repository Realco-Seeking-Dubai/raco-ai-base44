import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getAiSuggestions, getAgentTasks, getActivityTimeline } from '@/lib/supabase';
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Users, TrendingUp, Building2, Star, Clock, CheckCircle2, AlertTriangle, Zap, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    Promise.all([
      getAiSuggestions(user.email),
      getAgentTasks(user.email),
      getActivityTimeline(user.email),
    ]).then(([s, t, a]) => {
      setSuggestions(s);
      setTasks(t);
      setActivity(a);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const firstName = user?.full_name?.split(' ')[0] || 'Agent';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Hero */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-evergreen to-evergreen-mid text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, hsl(var(--brass)) 0%, transparent 60%)' }} />
        <div className="relative z-10">
          <div className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1">{today}</div>
          <h1 className="text-2xl font-semibold">{getGreeting()}, {firstName}</h1>
          <p className="text-white/70 mt-1 text-sm">Here's what needs your attention today.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <KpiCard label="Active Network" value={loading ? '…' : '—'} icon={Users} color="evergreen" className="border-l-4 border-l-evergreen" />
        <KpiCard label="Open Tasks" value={loading ? '…' : tasks.length} icon={CheckCircle2} color="brass" className="border-l-4 border-l-brass" />
        <KpiCard label="AI Suggestions" value={loading ? '…' : suggestions.length} icon={Zap} color="sky" className="border-l-4 border-l-sky" />
        <KpiCard label="Hot Opportunities" value={loading ? '…' : suggestions.filter(s => s.priority_score > 0.8).length} icon={Star} color="terracotta" className="border-l-4 border-l-terracotta" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* AI Suggestion Strip */}
        <div className="bg-card border border-hairline rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-gradient-to-r from-brass-tint to-transparent">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-brass" />
              <span className="text-sm font-medium text-brass">Raco Suggestions</span>
            </div>
            <Link to="/activity" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              See all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-surface rounded-lg animate-pulse" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No suggestions yet — Raco is analysing your data.
            </div>
          ) : (
            <div className="divide-y divide-hairline">
              {suggestions.slice(0, 4).map(s => (
                <div key={s.id} className="px-4 py-3 flex items-start gap-3 hover:bg-surface transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${s.priority_score > 0.85 ? 'bg-terracotta' : s.priority_score > 0.7 ? 'bg-brass' : 'bg-muted-2'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.body}</div>
                  </div>
                  <div className="text-xs text-muted-2 shrink-0">
                    {Math.round(s.priority_score * 100)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Priorities */}
        <div className="bg-card border border-hairline rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-gradient-to-r from-evergreen-tint to-transparent">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-evergreen" />
              <span className="text-sm font-medium text-evergreen">Today's Priorities</span>
            </div>
            <Link to="/activity" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              All tasks <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No pending tasks — you're all caught up.
            </div>
          ) : (
            <div className="divide-y divide-hairline">
              {tasks.slice(0, 5).map(t => (
                <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-muted-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{t.task_title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.task_type}</div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {activity.length > 0 && (
        <div className="mt-6 bg-card border border-hairline rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-hairline bg-gradient-to-r from-sky-tint to-transparent">
            <span className="text-sm font-medium text-sky">Recent Activity</span>
          </div>
          <div className="divide-y divide-hairline">
            {activity.slice(0, 5).map((a, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-evergreen shrink-0" />
                <div className="flex-1 text-sm text-foreground">{a.description || a.event_type}</div>
                <div className="text-xs text-muted-2 shrink-0 font-mono">
                  {a.event_at ? new Date(a.event_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}