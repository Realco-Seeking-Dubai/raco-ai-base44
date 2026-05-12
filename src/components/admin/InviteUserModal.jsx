import { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { X, UserPlus, Loader2, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = ['user', 'admin', 'sales_agent', 'sales_manager', 'listing_admin', 'compliance_officer'];

const TIER_META = {
  zones:          { label: 'Zone',           color: 'bg-sky-tint text-sky border-sky/30' },
  masterProjects: { label: 'Community',      color: 'bg-brass-tint text-brass border-brass/30' },
  projects:       { label: 'Building',       color: 'bg-evergreen-tint text-evergreen border-evergreen/30' },
};

// ── Tag chip ─────────────────────────────────────────────────────────────────
function ScopeTag({ label, tier, onRemove }) {
  const { color, label: tierLabel } = TIER_META[tier] || TIER_META.projects;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium', color)}>
      <span className="opacity-50 text-[9px] uppercase tracking-wide">{tierLabel}</span>
      {label}
      <button type="button" onClick={onRemove} className="opacity-60 hover:opacity-100 ml-0.5 leading-none">×</button>
    </span>
  );
}

// ── Virtual list — renders only visible rows for perf ────────────────────────
const ROW_H = 32;
const VISIBLE_ROWS = 9;

function VirtualList({ items, selected, onToggle }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerH = Math.min(items.length, VISIBLE_ROWS) * ROW_H;
  const totalH = items.length * ROW_H;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - 2);
  const endIdx = Math.min(items.length - 1, startIdx + VISIBLE_ROWS + 4);

  return (
    <div
      style={{ height: containerH, overflowY: 'auto' }}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalH, position: 'relative' }}>
        {items.slice(startIdx, endIdx + 1).map((item, i) => {
          const absIdx = startIdx + i;
          const isSel = selected.has(item.key);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggle(item.key, item.label)}
              style={{ position: 'absolute', top: absIdx * ROW_H, height: ROW_H, left: 0, right: 0 }}
              className={cn(
                'flex items-center gap-2 px-3 text-xs text-left w-full transition-colors',
                isSel ? 'bg-evergreen/10 text-evergreen font-medium' : 'hover:bg-surface text-foreground'
              )}
            >
              <span className={cn(
                'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                isSel ? 'bg-evergreen border-evergreen' : 'border-hairline-strong'
              )}>
                {isSel && <span className="text-white text-[8px] font-bold">✓</span>}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Collapsible tier panel ────────────────────────────────────────────────────
function TierPanel({ step, title, subtitle, items, selected, onToggle, searchPlaceholder, exampleHint, locked }) {
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
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  // Reset search when items list changes (cascade changed)
  useEffect(() => { setSearch(''); }, [items]);

  return (
    <div className={cn('border rounded-lg overflow-hidden transition-colors', locked ? 'border-hairline opacity-50 pointer-events-none' : 'border-hairline')}>
      <button
        type="button"
        onClick={() => !locked && setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-surface hover:bg-surface-2 transition-colors text-left"
      >
        <span className="w-5 h-5 rounded-full bg-evergreen/10 text-evergreen text-[10px] font-bold flex items-center justify-center shrink-0">{step}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{title}</span>
            {selCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-evergreen text-white font-semibold">{selCount} selected</span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {items.length > 0 && <span className="text-[10px] text-muted-2">{items.length}</span>}
          <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
        </div>
      </button>

      {open && !locked && (
        <div className="border-t border-hairline bg-card">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-5">
              {locked ? 'Select a higher tier first' : 'No options available'}
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
              <div className="px-1 pb-2">
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

// ── Main modal ────────────────────────────────────────────────────────────────
export default function InviteUserModal({ onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');

  // Raw data from backend — 3-tier hierarchy
  const [scopeData, setScopeData] = useState({ zones: [], masterProjects: [], projects: [] });
  const [loadingScope, setLoadingScope] = useState(true);
  const [scopeError, setScopeError] = useState('');

  // selections: Map<key, { label, tier }>
  const [selections, setSelections] = useState(new Map());

  // Active cascade filters
  const [activeZone, setActiveZone] = useState(null);       // final_zone_name value
  const [activeMaster, setActiveMaster] = useState(null);   // master_project_name value

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
        if (!d.zones?.length && !d.masterProjects?.length) {
          setScopeError('No scope data returned.');
        }
      })
      .catch(() => setScopeError('Failed to load scope data.'))
      .finally(() => setLoadingScope(false));
  }, []);

  // ── Derived tier items ──────────────────────────────────────────────────────
  const zoneItems = useMemo(() =>
    scopeData.zones.map(z => ({ key: z.zone, label: z.zone })),
    [scopeData.zones]
  );

  // Tier 2: master projects filtered by selected zone
  const masterItems = useMemo(() => {
    const list = activeZone
      ? scopeData.masterProjects.filter(m => m.zone === activeZone)
      : scopeData.masterProjects;
    return list.map(m => ({ key: m.project_name, label: m.project_name }));
  }, [scopeData.masterProjects, activeZone]);

  // Tier 3: buildings (project column) filtered by selected master project
  const buildingItems = useMemo(() => {
    let list = scopeData.projects;
    if (activeMaster) {
      list = list.filter(p => p.master_project_name === activeMaster);
    } else if (activeZone) {
      list = list.filter(p => p.zone === activeZone);
    }
    return list.map(p => ({ key: `${p.master_project_name}::${p.project}`, label: p.project }));
  }, [scopeData.projects, activeZone, activeMaster]);

  // ── Selection helpers ───────────────────────────────────────────────────────
  const selectedKeys = useMemo(() => new Set(selections.keys()), [selections]);

  function toggle(key, label, tier) {
    setSelections(prev => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, { label, tier });
      return next;
    });
  }

  function handleZoneToggle(key, label) {
    // Toggle the cascade filter — clicking same zone again clears it
    setActiveZone(prev => {
      const next = prev === key ? null : key;
      return next;
    });
    setActiveMaster(null);
    toggle(key, label, 'zones');
  }

  function handleMasterToggle(key, label) {
    setActiveMaster(prev => prev === key ? null : key);
    toggle(key, label, 'masterProjects');
  }

  function handleBuildingToggle(key, label) {
    toggle(key, label, 'projects');
  }

  function removeSelection(key) {
    setSelections(prev => { const next = new Map(prev); next.delete(key); return next; });
  }

  function getByTier(tier) {
    return [...selections.entries()]
      .filter(([, v]) => v.tier === tier)
      .map(([k]) => tier === 'projects' ? k.split('::')[1] : k); // strip master prefix for buildings
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────────
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
                  <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none rotate-90" />
                </div>
              </div>

              {/* Scope */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-foreground">
                    Assign Scope <span className="text-terracotta">*</span>
                  </label>
                  {activeZone && (
                    <span className="text-[10px] text-muted-foreground">
                      Filtering by: <span className="text-brass font-medium">{activeZone}</span>
                      {activeMaster && <> → <span className="text-evergreen font-medium">{activeMaster}</span></>}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Drill down Zone → Community → Building. Selections at any level are saved independently.
                </p>

                {loadingScope ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-surface rounded-lg animate-pulse" />)}
                  </div>
                ) : scopeError && selections.size === 0 ? (
                  <p className="text-xs text-terracotta">{scopeError}</p>
                ) : (
                  <div className="space-y-2">
                    <TierPanel
                      step="1"
                      title="Zone"
                      subtitle={activeZone ? `Active: ${activeZone}` : `${zoneItems.length} zones available`}
                      items={zoneItems}
                      selected={selectedKeys}
                      onToggle={handleZoneToggle}
                      searchPlaceholder="Search zones…"
                      exampleHint="Core, Suburbs, Waterfront"
                    />
                    <TierPanel
                      step="2"
                      title="Master Project / Community"
                      subtitle={
                        activeZone
                          ? `${masterItems.length} communities in ${activeZone}`
                          : 'Select a Zone to filter'
                      }
                      items={masterItems}
                      selected={selectedKeys}
                      onToggle={handleMasterToggle}
                      searchPlaceholder="Try Al Furjan, Dubai Marina…"
                      exampleHint="Al Furjan, DAMAC Hills, Downtown Dubai"
                    />
                    <TierPanel
                      step="3"
                      title="Building / Project"
                      subtitle={
                        activeMaster
                          ? `${buildingItems.length} buildings in ${activeMaster}`
                          : activeZone
                            ? `${buildingItems.length} buildings in ${activeZone}`
                            : 'Select a Community to filter'
                      }
                      items={buildingItems}
                      selected={selectedKeys}
                      onToggle={handleBuildingToggle}
                      searchPlaceholder="Try Murooj Al Furjan…"
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