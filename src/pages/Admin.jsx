import { useEffect, useState } from 'react';
import { getPixxiUsers } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Settings, Users, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = ['Users', 'Scope Map'];

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Users');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getPixxiUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Users & Admin"
        subtitle="Manage team members and scope assignments"
        actions={
          <button className="px-3 py-1.5 text-sm rounded-lg bg-evergreen text-white font-medium flex items-center gap-1.5 hover:bg-evergreen-mid transition-colors">
            <Users className="w-3.5 h-3.5" /> Activate user
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
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
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
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.role || 'user'}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.lifecycle_status || 'inactive'} /></td>
                      <td className="px-4 py-3 text-right">
                        {(u.lifecycle_status === 'staged' || u.lifecycle_status === 'inactive') && (
                          <button className="text-xs px-2.5 py-1 rounded-lg border border-evergreen text-evergreen hover:bg-evergreen-tint transition-colors font-medium">
                            Activate
                          </button>
                        )}
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
        <div className="bg-card border border-hairline rounded-xl p-6">
          <p className="text-sm text-muted-foreground">Scope assignments are derived from Pixxi listings and user zone preferences. Manage via the Pixxi dashboard or contact your system admin.</p>
        </div>
      )}
    </div>
  );
}