import { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { X, UserPlus, Loader2, CheckCircle2, ChevronDown, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = ['user', 'admin', 'sales_agent', 'sales_manager', 'listing_admin', 'compliance_officer'];

const TIER_META = {
  zones:          { label: 'Zone',           color: 'bg-sky-tint text-sky border-sky/30' },
  masterProjects: { label: 'Master Project', color: 'bg-brass-tint text-brass border-brass/30' },
  projects:       { label: 'Building',       color: 'bg-evergreen-tint text-evergreen border-evergreen/30' },
};

// ─── Small tag chip ──────────────────────────────────────────────────────────
function ScopeTag({ label, tier, onRemove }) {
  const { color, label: tierLabel } = TIER_META[tier] || TIER_META.projects;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium', color)}>
      <span className="opacity-60 text-[9px] uppercase tracking-wide">{tierLabel}</span>
      {label}
      <button type="button" onClick={onRemove} className="opacity-60 hover:opacity-100 ml-0.5 leading-none">×</button>
    </span>
  );
}

// ─── Virtual scrolling list: only renders visible rows ───────────────────────
const ROW_H = 32; // px per row
const VISIBLE = 10; // rows visible at once
function VirtualList({ items, selected, onToggle }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerH = VISIBLE * ROW_H;
  const totalH = items.length * ROW_H;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - 2);
  const endIdx = Math.min(items.length - 1, startIdx + VISIBLE + 4);
  const visible = items.slice(startIdx, endIdx + 1);

  return (
    <div
      style={{ height: containerH, overflowY: 'auto' }}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
      className="relative"
    >
      <div style={{ height: totalH, position: 'relative' }}>
        {visible.map((item, i) => {
          const absIdx = startIdx + i;
          const isSelected = selected.has(item.key);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggle(item.key, item.label)}
              style={{ position: 'absolute', top: absIdx * ROW_H, height: ROW_H, left: 0, right: 0 }}
              className={cn(
                'flex items-center gap-2 px-2 text-xs text-left transition-colors w-full',
                isSelected ? 'bg-evergreen/10 text-evergreen font-medium' : 'hover:bg-surface text-foreground'
              )}
            >
              <span className={cn(
                'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                isSelected ? 'bg-evergreen border-evergreen' : 'border-hairline-strong'
              )}>
                {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cascading tier panel ────────────────────────────────────────────────────
function CascadingPanel({
  title, hint, items, selected, onToggle,
  searchPlaceholder, exampleHint,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(it => it.label.toLowerCase().includes(q));
  }, [items, search]);

  const selCount = items.filter(it => selected.has(it.key)).length;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <div className="border border-hairline rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-surface hover:bg-surface-2 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
          <span className="text-sm font-medium text-foreground">{title}</span>
          {hint && <span className="text-xs text-muted-foreground">— {hint}</span>}
          {selCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-evergreen text-white font-semibold">{selCount}</span>
          )}
        </div>
        {items.length > 0 && (
          <span className="text-[10px] text-muted-2">{items.length} options</span>
        )}
      </button>

      {open && (
        <div className="border-t border-hairline bg-card">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 px-3">
              {hint?.includes('select a Zone') ? '← Select a Zone first' : 'No options available'}
            </p>
          ) : (
            <>
              <div className="p-2 space-y-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-7 pr-3 py-1.5 text-xs rounded border border-hairline bg-surface focus:outline-none focus:border-evergreen"
                  />
                </div>
                {exampleHint && !search && (
                  <p className="text-[10px] text-muted-2 pl-1">e.g. {exampleHint}</p>
                )}
              </div>
              <div className="px-2 pb-2">
                {filtered.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No results for "{search}"</p>
                ) : (
                  <VirtualList items={filtered} selected={selected} onToggle={onToggle} />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────
export default function InviteUserModal({ onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [scopeData, setScopeData] = useState({ zones: [], masterProjects: [], projects: [] });
  const [loadingScope, setLoadingScope] = useState(true);
  const [scopeError, setScopeError] = useState('');

  // selected: Map<key, { label, tier }>
  const [selections, setSelections] = useState(new Map());

  // Cascading state: which zone / masterProject is active for filtering
  const [activeZone, setActiveZone] = useState(null);
  const [activeMaster, setActiveMaster] = useState(null);

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
        if (!d.zones?.length && !d.masterProjects?.length && !d.projects?.length) {
          setScopeError('No scope data returned.');
        }
      })
      .catch(() => setScopeError('Failed to load scope data.'))
      .finally(() => setLoadingScope(false));
  }, []);

  // ── Derived tier items ─────────────────────────────────────────────────────
  const zoneItems = useMemo(() =>
    scopeData.zones.map(z => ({ key: z.zone, label: z.zone })),
    [scopeData.zones]
  );

  const masterItems = useMemo(() => {
    const list = activeZone
      ? scopeData.masterProjects.filter(m => m.zone === activeZone)
      : scopeData.masterProjects;
    return list.map(m => ({ key: m.project_name, label: m.project_name }));
  }, [scopeData.masterProjects, activeZone]);

  const buildingItems = useMemo(() => {
    const list = activeMaster
      ? scopeData.projects.filter(p => p.master_project_name === activeMaster || p.zone === activeZone)
      : activeZone
        ? scopeData.projects.filter(p => p.zone === activeZone)
        : scopeData.projects;
    return list.map(p => ({ key: p.master_project_name, label: p.master_project_name }));
  }, [scopeData.projects, activeZone, activeMaster]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const selectedKeys = useMemo(() => new Set(selections.keys()), [selections]);

  function toggle(key, label, tier) {
    setSelections(prev => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, { label, tier });
      return next;
    });
  }

  function toggleZone(key, label) {
    // Selecting a zone also sets the cascade filter
    setActiveZone(prev => prev === key ? null : key);
    setActiveMaster(null);
    toggle(key, label, 'zones');
  }

  function toggleMaster(key, label) {
    setActiveMaster(prev => prev === key ? null : key);
    toggle(key, label, 'masterProjects');
  }

  function toggleBuilding(key, label) {
    toggle(key, label, 'projects');
  }

  function removeSelection(key) {
    setSelections(prev => { const next = new Map(prev); next.delete(key); return next; });
  }

  function getByTier(tier) {
    return [...selections.entries()].filter(([, v]) => v.tier === tier).map(([k]) => k);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleInvite() {
    if (!email.trim()) { setError('Email is required.'); return; }
    if (selections.size === 0) { setError('Please assign at least one scope.'); return; }
    setError('');
    setLoading(true);
    try {
      await base44.users.inviteUser(email.trim(), role === 'admin' ? 'admin' : 'user');
      await base44.functions.invoke('assignUserWorkspace', {
        user_email: email.trim(),
        zones: getByTier('zones'),
        masterProjects: getByTier('masterProjects'),
        projects: getByTier('projects'),
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in max-h-[92vh] flex flex-col"
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

              {/* Scope */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Assign Scope <span className="text-terracotta">*</span>
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Drill down: Zone → Master Project → Building. Selecting a Zone cascades the options below.
                </p>

                {loadingScope ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-surface rounded-lg animate-pulse" />)}
                  </div>
                ) : scopeError && selections.size === 0 ? (
                  <p className="text-xs text-terracotta">{scopeError}</p>
                ) : (
                  <div className="space-y-2">
                    {/* Tier 1: Zones */}
                    <CascadingPanel
                      title="1. Zone"
                      hint={activeZone ? `Filtering by: ${activeZone}` : 'select a zone to cascade'}
                      items={zoneItems}
                      selected={selectedKeys}
                      onToggle={toggleZone}
                      searchPlaceholder="Search zones…"
                      exampleHint="Core, Suburbs, Waterfront"
                    />

                    {/* Tier 2: Master Projects */}
                    <CascadingPanel
                      title="2. Master Project / Community"
                      hint={activeZone ? `${masterItems.length} in ${activeZone}` : 'select a Zone first to filter'}
                      items={masterItems}
                      selected={selectedKeys}
                      onToggle={toggleMaster}
                      searchPlaceholder="Search communities…"
                      exampleHint="Al Furjan, DAMAC Hills, Dubai Marina"
                    />

                    {/* Tier 3: Buildings */}
                    <CascadingPanel
                      title="3. Building / Project"
                      hint={activeMaster ? `inside ${activeMaster}` : activeZone ? `in ${activeZone}` : 'select a Master Project to filter'}
                      items={buildingItems}
                      selected={selectedKeys}
                      onToggle={toggleBuilding}
                      searchPlaceholder="Search buildings…"
                      exampleHint="Murooj Al Furjan, Tilal Al Furjan"
                    />
                  </div>
                )}

                {/* Selected tags */}
                {selections.size > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
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