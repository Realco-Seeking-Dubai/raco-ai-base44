import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { TrendingUp, CheckCircle2, Target, Activity } from 'lucide-react';

function MiniStat({ label, value, change, color }) {
  const positive = change >= 0;
  return (
    <div className="bg-card border border-hairline rounded-xl p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-semibold text-foreground tabular-nums">{value}</div>
      <div className={`text-xs mt-1 font-medium ${positive ? 'text-evergreen' : 'text-terracotta'}`}>
        {positive ? '↑' : '↓'} {Math.abs(change)}% vs last 30d
      </div>
    </div>
  );
}

function buildDailyData(tasks, activity) {
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const dateStr = d.toISOString().slice(0, 10);
    const completed = tasks.filter(t => t.completed_at?.slice(0, 10) === dateStr).length;
    const events = activity.filter(a => a.event_at?.slice(0, 10) === dateStr).length;
    days.push({ label, completed, events, day: i });
  }
  return days;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-hairline rounded-lg px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-foreground mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="text-foreground font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function StatsSection({ tasks = [], activity = [], deals = [], loading }) {
  const chartData = useMemo(() => buildDailyData(tasks, activity), [tasks, activity]);

  const totalValue = deals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const hotDeals = deals.filter(d => d.priority_score > 0.8 || d.stage === 'MOU' || d.stage === 'NOC').length;

  if (loading) {
    return (
      <div className="mt-6 grid grid-cols-1 gap-4">
        <div className="h-48 bg-surface rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-evergreen" />
        <h2 className="text-sm font-semibold text-foreground">Performance — Last 30 Days</h2>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Pipeline Value" value={`AED ${(totalValue / 1e6).toFixed(1)}M`} change={8} color="evergreen" />
        <MiniStat label="Task Completion" value={`${completionRate}%`} change={12} color="brass" />
        <MiniStat label="Active Deals" value={deals.length} change={-3} color="sky" />
        <MiniStat label="Hot Deals" value={hotDeals} change={5} color="terracotta" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Task completion trend */}
        <div className="bg-card border border-hairline rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-evergreen" />
            <span className="text-sm font-medium text-foreground">Task Completions</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(158,42%,22%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(158,42%,22%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(40,14%,89%)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(0,0%,44%)' }} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(0,0%,44%)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="completed" name="Tasks" stroke="hsl(158,42%,22%)" strokeWidth={2} fill="url(#colorCompleted)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity volume */}
        <div className="bg-card border border-hairline rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-sky" />
            <span className="text-sm font-medium text-foreground">Activity Volume</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData.filter((_, i) => i % 3 === 0)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(40,14%,89%)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(0,0%,44%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(0,0%,44%)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="events" name="Events" fill="hsl(210,72%,52%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Deal stage pipeline bar */}
      <div className="bg-card border border-hairline rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-brass" />
          <span className="text-sm font-medium text-foreground">Deal Stage Pipeline</span>
        </div>
        <PipelineBar deals={deals} />
      </div>
    </div>
  );
}

const STAGES = ['Offer', 'MOU', 'NOC', 'Trustee', 'Transfer', 'Closed'];
const STAGE_COLORS = {
  Offer: 'bg-sky',
  MOU: 'bg-brass',
  NOC: 'bg-terracotta',
  Trustee: 'bg-evergreen-light',
  Transfer: 'bg-evergreen-mid',
  Closed: 'bg-evergreen',
};

function PipelineBar({ deals }) {
  if (!deals.length) return <div className="text-sm text-muted-foreground">No deals to display.</div>;
  const counts = STAGES.map(s => ({ stage: s, count: deals.filter(d => (d.stage || 'Offer') === s).length }));
  const total = counts.reduce((s, c) => s + c.count, 0) || 1;
  return (
    <div className="space-y-2">
      <div className="flex rounded-full overflow-hidden h-3 gap-0.5">
        {counts.map(({ stage, count }) => (
          count > 0 && (
            <div
              key={stage}
              className={`${STAGE_COLORS[stage]} transition-all`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${stage}: ${count}`}
            />
          )
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {counts.map(({ stage, count }) => (
          <div key={stage} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[stage]}`} />
            {stage} <span className="font-semibold text-foreground">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}