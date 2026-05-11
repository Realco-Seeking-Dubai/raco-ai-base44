import { useState, useEffect } from 'react';
import { supabase, updatePixxiUserLifecycle } from '@/lib/supabase';
import { X, Building2, Shield, User, Save, Loader2, ChevronDown } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import UserLifecycleActions from '@/components/admin/UserLifecycleActions';
import { cn } from '@/lib/utils';

const ROLES = ['user', 'admin', 'super_admin', 'viewer'];
const PERMISSIONS = [
  { key: 'can_view_leads', label: 'View Leads' },
  { key: 'can_edit_leads', label: 'Edit Leads' },
  { key: 'can_view_inventory', label: 'View Inventory' },
  { key: 'can_edit_inventory', label: 'Edit Inventory' },
  { key: 'can_view_deals', label: 'View Deals' },
  { key: 'can_edit_deals', label: 'Edit Deals' },
  { key: 'can_view_compliance', label: 'View Compliance' },
  { key: 'can_access_admin', label: 'Access Admin' },
];

export default function UserDetailPanel({ user, onClose, onUserUpdated }) {
  const [role, setRole] = useState(user.role || 'user');
  const [permissions, setPermissions] = useState(user.permissions || {});
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localUser, setLocalUser] = useState(user);

  useEffect(() => {
    setLocalUser(user);
    setRole(user.role || 'user');
    setPermissions(user.permissions || {});
  }, [user]);

  useEffect(() => {
    setLoadingProjects(true);
    // Try pixxi_listings (projects associated to this user's email)
    supabase
      .from('pixxi_listings')
      .select('id,project_name,unit_number,status,asking_price,zone')
      .eq('pixxi_user_email', user.email)
      .limit(50)
      .then(({ data }) => setProjects(data || []))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [user.email]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('pixxi_users')
      .update({ role, permissions })
      .eq('id', localUser.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      onUserUpdated(localUser.id, { ...localUser, role, permissions });
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function handleLifecycleUpdated(userId, newStatus) {
    const updated = { ...localUser, lifecycle_status: newStatus, is_active: newStatus === 'active' };
    setLocalUser(updated);
    onUserUpdated(userId, updated);
  }

  const togglePerm = (key) => setPermissions(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg bg-background shadow-2xl overflow-y-auto flex flex-col animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-evergreen-tint flex items-center justify-center">
              <span className="text-sm font-bold text-evergreen">{(localUser.full_name || '?').charAt(0)}</span>
            </div>
            <div>
              <div className="font-semibold text-foreground">{localUser.full_name || 'Unknown'}</div>
              <div className="text-xs text-muted-foreground">{localUser.email}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">
          {/* Status & Lifecycle */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-evergreen" />
              <span className="text-sm font-semibold text-foreground">Lifecycle Status</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={localUser.lifecycle_status || 'staged'} />
              <span className={cn('inline-flex items-center gap-1 text-xs font-medium', localUser.is_active ? 'text-evergreen' : 'text-muted-2')}>
                <span className={cn('w-1.5 h-1.5 rounded-full', localUser.is_active ? 'bg-evergreen' : 'bg-muted-2')} />
                {localUser.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <UserLifecycleActions user={localUser} onUpdated={handleLifecycleUpdated} />
          </section>

          {/* Role */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-brass" />
              <span className="text-sm font-semibold text-foreground">Role</span>
            </div>
            <div className="relative max-w-xs">
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen appearance-none pr-8"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </section>

          {/* Permissions */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-sky" />
              <span className="text-sm font-semibold text-foreground">Permissions</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => togglePerm(p.key)}
                    className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                      permissions[p.key] ? 'border-evergreen bg-evergreen' : 'border-hairline-strong bg-card group-hover:border-evergreen/50'
                    )}
                  >
                    {permissions[p.key] && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-foreground">{p.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              saved ? 'bg-evergreen-tint text-evergreen border border-evergreen' : 'bg-evergreen text-white hover:bg-evergreen-mid disabled:opacity-50'
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>

          {/* Associated Projects */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-terracotta" />
              <span className="text-sm font-semibold text-foreground">Associated Projects / Listings</span>
              {!loadingProjects && <span className="text-xs text-muted-2 font-mono">({projects.length})</span>}
            </div>
            {loadingProjects ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-surface rounded-lg animate-pulse" />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-surface rounded-lg px-4 py-3">
                No listings found for this user.
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-card border border-hairline rounded-lg px-3 py-2.5">
                    <Building2 className="w-4 h-4 text-muted-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{p.project_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{p.zone || ''}{p.unit_number ? ` · Unit ${p.unit_number}` : ''}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={p.status || 'new'} />
                      {p.asking_price && (
                        <span className="text-[10px] text-muted-2 font-mono">AED {Number(p.asking_price).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}