import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, UserPlus, Loader2, CheckCircle2, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = ['user', 'admin', 'sales_agent', 'sales_manager', 'listing_admin', 'compliance_officer'];

const TIERS = [
  { key: 'zones',          label: 'Zone',           colorClass: 'bg-sky-tint text-sky border-sky/30' },
  { key: 'masterProjects', label: 'Master Project', colorClass: 'bg-brass-tint text-brass border-brass/30' },
  { key: 'projects',       label: 'Building',       colorClass: 'bg-evergreen-tint text-evergreen border-evergreen/30' },
];

function ScopeTag({ label, tier, onRemove }) {
  const t = TIERS.find(t => t.key === tier) || TIERS[2];
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium', t.colorClass)}>
      <span className="opacity-60 text-[9px] uppercase tracking-wide">{t.label}</span>
      {label}
      <button type="button" onClick={onRemove} className="opacity-60 hover:opacity-100 ml-0.5">×</button>
    </span>
  );
}

function TierSelector({ title, items, getKey, getLabel, selected, onToggle, searchPlaceholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = items.filter(item =>
    !search || getLabel(item).toLowerCase().includes(search.toLowerCase())
  );

  const selectedCount = items.filter(item => selected.has(getKey(item))).length;

  return (
    <div className="border border-hairline rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface hover:bg-surface-2 transition-colors text-sm font-medium text-foreground"
      >
        <span>{title} {selectedCount > 0 && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-evergreen text-white font-semibold">{selectedCount}</span>}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-hairline bg-card">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded border border-hairline bg-surface focus:outline-none focus:border-evergreen"
              />
            </div>
          </div>
          <div className="max-h-36 overflow-y-auto px-2 pb-2 space-y-0.5">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No results</p>
            ) : filtered.map((item, i) => {
              const key = getKey(item);
              const label = getLabel(item);
              const isSelected = selected.has(key);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onToggle(key, label)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors',
                    isSelected ? 'bg-evergreen/10 text-evergreen font-medium' : 'hover:bg-surface text-foreground'
                  )}
                >
                  <span className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors', isSelected ? 'bg-evergreen border-evergreen' : 'border-hairline-strong')}>
                    {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InviteUserModal({ onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [scopeData, setScopeData] = useState({ zones: [], masterProjects: [], projects: [] });
  const [loadingScope, setLoadingScope] = useState(true);
  const [scopeError, setScopeError] = useState('');

  // Track selections: Map of key -> { label, tier }
  const [selections, setSelections] = useState(new Map());

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.functions.invoke('getScopeList', {})
      .then(res => {
        const d = res.data || {};
        setScopeData({
          zones: d.zones || [],
          masterProjects: d.masterProjects || [],
          projects: d.projects || [],
        });
        if ((d.zones?.length || 0) + (d.masterProjects?.length || 0) + (d.projects?.length || 0) === 0) {
          setScopeError('No scope data found. Check that the agent schema tables are accessible.');
        }
      })
      .catch(() => setScopeError('Failed to load scope data.'))
      .finally(() => setLoadingScope(false));
  }, []);

  function toggleSelection(key, label, tier) {
    setSelections(prev => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, { label, tier });
      return next;
    });
  }

  function removeSelection(key) {
    setSelections(prev => { const next = new Map(prev); next.delete(key); return next; });
  }

  const selectedKeys = new Set(selections.keys());

  function getSelectedByTier(tier) {
    return [...selections.entries()].filter(([, v]) => v.tier === tier).map(([k]) => k);
  }

  async function handleInvite() {
    if (!email.trim()) { setError('Email is required.'); return; }
    if (selections.size === 0) { setError('Please assign at least one zone, master project, or building.'); return; }
    setError('');
    setLoading(true);
    try {
      await base44.users.inviteUser(email.trim(), role === 'admin' ? 'admin' : 'user');

      await base44.functions.invoke('assignUserWorkspace', {
        user_email: email.trim(),
        zones: getSelectedByTier('zones'),
        masterProjects: getSelectedByTier('masterProjects'),
        projects: getSelectedByTier('projects'),
      });

      setDone(true);
      onInvited?.();
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err?.message || 'Invite failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline bg-card shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-evergreen" />
            <span className="text-sm font-semibold text-foreground">Invite New User</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle2 className="w-10 h-10 text-evergreen" />
              <div className="text-sm font-semibold text-foreground">Invitation sent!</div>
              <div className="text-xs text-muted-foreground">{email}</div>
            </div>
          ) : (
            <>
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="agent@realco.ai"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Role</label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen appearance-none pr-8"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Scope Assignment */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Assign Scope <span className="text-terracotta ml-0.5">*</span>
                  <span className="ml-2 text-muted-2 font-normal">select zones, master projects, or buildings</span>
                </label>

                {loadingScope ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-surface rounded-lg animate-pulse" />)}
                  </div>
                ) : scopeError && selections.size === 0 ? (
                  <p className="text-xs text-terracotta">{scopeError}</p>
                ) : (
                  <div className="space-y-2">
                    <TierSelector
                      title="Select Zone"
                      items={scopeData.zones}
                      getKey={z => z.zone || z.area}
                      getLabel={z => z.zone || z.area}
                      selected={selectedKeys}
                      onToggle={(key, label) => toggleSelection(key, label, 'zones')}
                      searchPlaceholder="Search zones…"
                    />
                    <TierSelector
                      title="Select Master Project"
                      items={scopeData.masterProjects}
                      getKey={m => m.project_name}
                      getLabel={m => m.project_name}
                      selected={selectedKeys}
                      onToggle={(key, label) => toggleSelection(key, label, 'masterProjects')}
                      searchPlaceholder="Search master projects…"
                    />
                    <TierSelector
                      title="Select Building / Project"
                      items={scopeData.projects}
                      getKey={p => p.master_project_name}
                      getLabel={p => p.master_project_name}
                      selected={selectedKeys}
                      onToggle={(key, label) => toggleSelection(key, label, 'projects')}
                      searchPlaceholder="Search buildings…"
                    />
                  </div>
                )}

                {/* Selected tags */}
                {selections.size > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[...selections.entries()].map(([key, { label, tier }]) => (
                      <ScopeTag key={key} label={label} tier={tier} onRemove={() => removeSelection(key)} />
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-terracotta">{error}</p>}

              <button
                onClick={handleInvite}
                disabled={loading || !email.trim() || selections.size === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-evergreen text-white text-sm font-medium hover:bg-evergreen-mid transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? 'Sending…' : `Send Invitation${selections.size > 0 ? ` (${selections.size} scope${selections.size > 1 ? 's' : ''})` : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}