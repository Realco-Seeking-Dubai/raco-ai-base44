import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Building2, Shield, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [ownersCount, setOwnersCount] = useState(0);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getDashboardStats', {})
      .then(res => {
        const d = res.data || {};
        setUsers(d.users || []);
        setLeadsCount(d.leads_count || 0);
        setOwnersCount(d.owners_count || 0);
        setAuditLog(d.audit_log || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Dashboard data error:', err);
        setLoading(false);
      });
  }, []);

  // User activity by role
  const usersByRole = users.reduce((acc, u) => {
    const role = u.lifecycle_status || 'staged';
    const existing = acc.find(x => x.name === role);
    if (existing) existing.value += 1;
    else acc.push({ name: role, value: 1 });
    return acc;
  }, []);

  // User lifecycle distribution
  const usersByStatus = users.reduce((acc, u) => {
    const status = u.lifecycle_status || 'staged';
    const existing = acc.find(x => x.name === status);
    if (existing) existing.count += 1;
    else acc.push({ name: status, count: 1 });
    return acc;
  }, []);

  // Compliance status
  const complianceStats = {
    approved: auditLog.filter(a => a.compliance_status === 'approved').length,
    vetoed: auditLog.filter(a => a.compliance_status === 'vetoed').length,
    pending: auditLog.filter(a => !a.compliance_status || a.compliance_status === 'pending').length,
  };

  const COLORS = ['#166534', '#0369a1', '#b45309', '#c2410c'];

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Key performance metrics and system overview"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <KpiCard label="Total Users" value={users.length} icon={Users} color="evergreen" />
        <KpiCard label="Active Users" value={users.filter(u => u.is_active).length} icon={TrendingUp} color="brass" />
        <KpiCard label="Total Leads" value={leadsCount} icon={Shield} color="sky" />
        <KpiCard label="Total Owners" value={ownersCount} icon={Building2} color="terracotta" />
      </div>

      {loading ? (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="h-64 bg-surface rounded-xl animate-pulse" />
          <div className="h-64 bg-surface rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* User Lifecycle Distribution */}
          <div className="bg-card border border-hairline rounded-xl p-4">
            <div className="text-sm font-semibold text-foreground mb-4">User Lifecycle Status</div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={usersByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--hairline))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--hairline))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="count" fill="hsl(var(--evergreen))" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* User Role Distribution */}
          <div className="bg-card border border-hairline rounded-xl p-4">
            <div className="text-sm font-semibold text-foreground mb-4">Users by Role</div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={usersByRole}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {usersByRole.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* User Status & Compliance */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users by Role (Pie) */}
        <div className="bg-card border border-hairline rounded-xl p-4">
          <div className="text-sm font-semibold text-foreground mb-4">Users by Lifecycle</div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={usersByStatus} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} dataKey="count">
                {usersByStatus.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance Status */}
        <div className="bg-card border border-hairline rounded-xl p-4">
          <div className="text-sm font-semibold text-foreground mb-4">Compliance Status</div>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="text-center p-4 rounded-lg bg-evergreen-tint">
              <div className="text-2xl font-bold text-evergreen">{complianceStats.approved}</div>
              <div className="text-xs text-evergreen mt-1">Approved</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-brass-tint">
              <div className="text-2xl font-bold text-brass">{complianceStats.pending}</div>
              <div className="text-xs text-brass mt-1">Pending</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-terracotta-tint">
              <div className="text-2xl font-bold text-terracotta">{complianceStats.vetoed}</div>
              <div className="text-xs text-terracotta mt-1">Vetoed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Compliance Events */}
      <div className="mt-6 bg-card border border-hairline rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-hairline bg-gradient-to-r from-sky-tint to-transparent">
          <span className="text-sm font-semibold text-sky">Recent Compliance Events</span>
        </div>
        {auditLog.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Shield} title="No compliance events" />
          </div>
        ) : (
          <div className="divide-y divide-hairline max-h-80 overflow-y-auto">
            {auditLog.slice(0, 10).map((e, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-surface transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{e.message_id || e.event_type || '—'}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {e.created_at ? new Date(e.created_at).toLocaleDateString('en-GB') : '—'}
                  </div>
                </div>
                <StatusBadge status={e.compliance_status || 'pending'} className="shrink-0 ml-2" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}