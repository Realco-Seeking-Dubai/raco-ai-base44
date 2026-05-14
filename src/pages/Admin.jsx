import { useEffect, useState } from 'react';
import { getPixxiUsers } from '@/lib/supabase';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import UserLifecycleActions from '@/components/admin/UserLifecycleActions';
import UserDetailPanel from '@/components/admin/UserDetailPanel';
import InviteUserModal from '@/components/admin/InviteUserModal';
import { Users, Search, RefreshCw, ChevronRight, UserPlus, DatabaseZap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = ['Users', 'Scope Map', 'Pocket Sync'];

export default function Admin() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Users');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  function loadUsers() {
    setLoading(true);
    getPixxiUsers()
      .then(data => { setUsers(data || []); setLoading(false); })
      .catch(err => { console.error('Users fetch error:', err); setUsers([]); setLoading(false); });
  }

  useEffect(() => { loadUsers(); }, []);

  function handleUserUpdated(userId, updatedData) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updatedData } : u));
    if (selectedUser?.id === userId) setSelectedUser(u => ({ ...u, ...updatedData }));
  }

  function handleLifecycleUpdated(userId, newStatus) {
    handleUserUpdated(userId, { lifecycle_status: newStatus, is_active: newStatus === 'active' });
  }

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Users & Admin"
        subtitle={`${users.length} total users`}
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowInvite(true)}
                className="px-3 py-1.5 text-sm rounded-lg border border-evergreen bg-evergreen-tint text-evergreen font-medium flex items-center gap-1.5 hover:bg-evergreen hover:text-white transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite User
              </button>
            )}
            <button onClick={loadUsers} className="px-3 py-1.5 text-sm rounded-lg border border-hairline bg-card font-medium flex items-center gap-1.5 hover:bg-surface transition-colors text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
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
              tab === t ? 'border-evergreen text-evergreen' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Users' && (
        <>
          <div className="relative max-w-xs mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="No users found" />
          ) : (
            <div className="bg-card border border-hairline rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-hairline bg-surface">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Active</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Lifecycle Actions</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filtered.map(u => (
                    <tr key={u.id} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-evergreen-tint flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-evergreen">{(u.full_name || '?').charAt(0)}</span>
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{u.full_name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-muted-foreground bg-surface px-2 py-0.5 rounded">{u.role || 'user'}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={u.lifecycle_status || 'staged'} /></td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={cn('inline-flex items-center gap-1 text-xs font-medium', u.is_active ? 'text-evergreen' : 'text-muted-2')}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', u.is_active ? 'bg-evergreen' : 'bg-muted-2')} />
                          {u.is_active ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <UserLifecycleActions user={u} onUpdated={handleLifecycleUpdated} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="inline-flex items-center gap-1 text-xs text-evergreen hover:text-evergreen-mid font-medium"
                        >
                          Edit <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'Scope Map' && (
        <ScopeMap />
      )}

      {tab === 'Pocket Sync' && (
        <PocketSync />
      )}

      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {showInvite && (
        <InviteUserModal onClose={() => setShowInvite(false)} onInvited={loadUsers} />
      )}
    </div>
  );
}

// ── Pocket Sync tab ──────────────────────────────────────────────────────────
function PocketSync() {
  const [status, setStatus] = useState(null); // null | 'running' | 'done' | 'error'
  const [result, setResult] = useState(null);
  const [dryRun, setDryRun] = useState(false);

  async function runSync() {
    setStatus('running');
    setResult(null);
    try {
      const res = await base44.functions.invoke('syncPocketListings', { dry_run: dryRun });
      setResult(res.data);
      setStatus(res.data?.success ? 'done' : 'error');
    } catch (err) {
      setResult({ error: err.message });
      setStatus('error');
    }
  }

  const statCard = (label, value, color = 'text-foreground') => (
    <div className="bg-surface rounded-lg px-4 py-3 text-center">
      <div className={cn('text-2xl font-bold tabular-nums', color)}>{value ?? '—'}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-5">
      {/* Info card */}
      <div className="bg-card border border-hairline rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <DatabaseZap className="w-4 h-4 text-evergreen" />
          <span className="text-sm font-semibold text-foreground">Sync Pocket Listings from 13.realco.ai</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Pulls all <strong>Listing</strong> records from the source app (5 agents, ~311 records) and upserts them into
          <code className="mx-1 px-1 py-0.5 rounded bg-surface text-xs">agent.realco13_pocket_listings</code>
          in Supabase, resolving Zone → Community → Building hierarchy via Raco CRM project intelligence.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={e => setDryRun(e.target.checked)}
              className="rounded border-hairline accent-evergreen"
            />
            <span className="text-xs text-muted-foreground">Dry run (preview only, no writes)</span>
          </label>
        </div>

        <button
          onClick={runSync}
          disabled={status === 'running'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-evergreen text-white text-sm font-medium hover:bg-evergreen-mid transition-colors disabled:opacity-50"
        >
          {status === 'running'
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing…</>
            : <><DatabaseZap className="w-4 h-4" /> {dryRun ? 'Run Dry Run' : 'Run Sync Now'}</>
          }
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={cn('bg-card border rounded-xl p-5', status === 'error' ? 'border-terracotta/40' : 'border-evergreen/30')}>
          <div className="flex items-center gap-2 mb-4">
            {status === 'done'
              ? <CheckCircle2 className="w-4 h-4 text-evergreen" />
              : <AlertCircle className="w-4 h-4 text-terracotta" />}
            <span className="text-sm font-semibold">
              {status === 'done' ? (result.dry_run ? 'Dry Run Complete' : 'Sync Complete') : 'Sync Failed'}
            </span>
          </div>

          {result.error ? (
            <p className="text-xs text-terracotta font-mono">{result.error}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {statCard('Total Records', result.total ?? result.synced, 'text-foreground')}
                {statCard('Zone Resolved', result.resolved_zone, 'text-evergreen')}
                {statCard('Unresolved', (result.total ?? result.synced) - (result.resolved_zone ?? 0), 'text-brass')}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                {result.by_agent && (
                  <div>
                    <div className="font-medium text-foreground mb-1.5">By Agent</div>
                    {Object.entries(result.by_agent).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5 text-muted-foreground">
                        <span>{k}</span><span className="font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {result.by_zone && (
                  <div>
                    <div className="font-medium text-foreground mb-1.5">By Zone</div>
                    {Object.entries(result.by_zone).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5 text-muted-foreground">
                        <span>{k}</span><span className="font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* DDL hint */}
      <details className="bg-surface border border-hairline rounded-xl overflow-hidden">
        <summary className="px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
          Supabase DDL — run once to create the table
        </summary>
        <pre className="px-4 pb-4 text-[10px] text-muted-foreground overflow-x-auto whitespace-pre">{`CREATE TABLE IF NOT EXISTS agent.realco13_pocket_listings (
  id                  BIGSERIAL PRIMARY KEY,
  source_id           TEXT UNIQUE NOT NULL,
  source_system       TEXT DEFAULT 'realco13',
  agent_email         TEXT,
  agent_name          TEXT,
  client_id           TEXT,
  unit_address        TEXT,
  building            TEXT,
  master_project      TEXT,
  zone                TEXT,
  community_id_src    TEXT,
  sub_project_id_src  TEXT,
  property_category   TEXT,
  listing_purpose     TEXT,
  pipeline_stage      TEXT,
  pipeline_sub_status TEXT,
  bedrooms            INTEGER,
  bua_sqft            NUMERIC,
  plot_size_sqft      NUMERIC,
  asking_price_aed    NUMERIC,
  rental_amount_aed   NUMERIC,
  rental_period       TEXT,
  is_hot              BOOLEAN DEFAULT FALSE,
  is_exclusive        BOOLEAN DEFAULT FALSE,
  is_new              BOOLEAN DEFAULT FALSE,
  viewing_status      TEXT,
  follow_up_date      DATE,
  source_record_id    TEXT,
  source_section      TEXT,
  notes               TEXT,
  source_created_at   TIMESTAMPTZ,
  source_updated_at   TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_r13pl_zone    ON agent.realco13_pocket_listings(zone);
CREATE INDEX IF NOT EXISTS idx_r13pl_master  ON agent.realco13_pocket_listings(master_project);
CREATE INDEX IF NOT EXISTS idx_r13pl_agent   ON agent.realco13_pocket_listings(agent_email);
CREATE INDEX IF NOT EXISTS idx_r13pl_stage   ON agent.realco13_pocket_listings(pipeline_stage);`}</pre>
      </details>
    </div>
  );
}

// ── Scope Map tab ────────────────────────────────────────────────────────────
function ScopeMap() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getWorkspaceAssignments', {})
      .then(res => { setAssignments(res.data?.assignments || []); setLoading(false); })
      .catch(() => { setAssignments([]); setLoading(false); });
  }, []);

  // Group by user
  const byUser = assignments.reduce((acc, row) => {
    const key = row.user_email || row.user_id || 'Unknown';
    if (!acc[key]) acc[key] = { email: key, name: row.full_name || row.name || key, rows: [] };
    acc[key].rows.push(row);
    return acc;
  }, {});

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />)}</div>;

  const entries = Object.values(byUser);

  if (entries.length === 0) {
    return (
      <div className="bg-card border border-hairline rounded-xl p-6">
        <p className="text-sm text-muted-foreground">No workspace assignments found in <code>v_workspace_assignments</code>. Manage via Pixxi dashboard or contact your system admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <div key={entry.email} className="bg-card border border-hairline rounded-xl p-4">
          <div className="text-sm font-semibold text-foreground mb-2">{entry.name}</div>
          <div className="text-xs text-muted-foreground mb-3">{entry.email}</div>
          <div className="flex flex-wrap gap-1.5">
            {entry.rows.map((r, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-evergreen-tint text-evergreen font-medium">
                {r.project_name || r.zone || r.area || '—'}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}