import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useLens } from '@/lib/LensContext';
import { Search, Loader2, MapPin, Building2, Home, X, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import OwnerBreadcrumbs from '@/components/owners/OwnerBreadcrumbs';
import OwnerCard from '@/components/owners/OwnerCard';
import OwnerProfileDrawer from '@/components/owners/OwnerProfileDrawer';

// ── Explorer levels ──────────────────────────────────────────────────────────
// step: 'zones' | 'master_projects' | 'projects' | 'owners'

function GridSkeleton({ n = 6 }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

function TileButton({ label, icon: Icon, color = 'bg-evergreen-tint text-evergreen', onClick, hasExcel = false, stat = null }) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-card border border-hairline rounded-xl p-4 hover:shadow-sm hover:border-evergreen/40 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-foreground group-hover:text-evergreen transition-colors leading-tight">{label}</div>
        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-evergreen transition-colors shrink-0 mt-0.5" />
      </div>
      {stat != null && (
        <div className="mt-1.5 text-xs text-muted-foreground tabular-nums">
          {stat.toLocaleString()} owners
        </div>
      )}
      {hasExcel && (
        <div className="mt-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-brass-tint text-brass border border-brass/20 font-medium">
          <FileSpreadsheet className="w-2.5 h-2.5" /> Special 2025 data
        </div>
      )}
    </button>
  );
}

export default function Owners() {
  const { lensUser } = useLens();

  // Navigation state
  const [step, setStep] = useState('zones'); // 'zones' | 'master_projects' | 'projects' | 'owners'
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  // Data
  const [zones, setZones] = useState([]);
  const [zoneStats, setZoneStats] = useState([]);
  const [masterProjects, setMasterProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  // Profile drawer
  const [profileOwnerId, setProfileOwnerId] = useState(null);

  const agentEmail = lensUser?.email || null;

  // ── API calls ────────────────────────────────────────────────────────────
  function invoke(action, extra = {}) {
    return base44.functions.invoke('getOwnerExplorer', { action, agent_email: agentEmail, ...extra })
      .then(res => res.data);
  }

  // ── Load on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    invoke('zones')
      .then(d => {
        setZones(d?.zones || []);
        setZoneStats(d?.zone_stats || []);
      })
      .finally(() => setLoading(false));
  }, [lensUser]);

  // ── Navigation handlers ──────────────────────────────────────────────────
  function drillZone(zone) {
    setSelectedZone(zone);
    setSelectedMaster(null);
    setSelectedProject(null);
    setOwners([]);
    setStep('master_projects');
    setLoading(true);
    invoke('master_projects', { zone })
      .then(d => setMasterProjects(d?.master_projects || []))
      .finally(() => setLoading(false));
  }

  function drillMaster(master) {
    setSelectedMaster(master);
    setSelectedProject(null);
    setOwners([]);
    setStep('projects');
    setLoading(true);
    invoke('projects', { master_project: master })
      .then(d => setProjects(d?.projects || []))
      .finally(() => setLoading(false));
  }

  // Hard-coded normalization for fragmented project names
  const normalizeProject = (name) => {
    const MAP = {
      'Murooj Al Furjan 1': 'Murooj Al Furjan',
      'Murooj Al Furjan 2': 'Murooj Al Furjan',
      'Murooj Al Furjan West': 'Murooj Al Furjan',
      'Murooj 1': 'Murooj Al Furjan',
      'Murooj 2': 'Murooj Al Furjan',
      'Tilal Al Furjan 1': 'Tilal Al Furjan',
      'Tilal Al Furjan 2': 'Tilal Al Furjan',
    };
    return MAP[name] || name;
  };

  function drillProject(projectName) {
    const normalized = normalizeProject(projectName);
    setSelectedProject(normalized);
    setOwners([]);
    setStep('owners');
    setLoading(true);
    invoke('owners_by_project', { project: normalized })
      .then(d => setOwners(d?.owners || []))
      .finally(() => setLoading(false));
  }

  // ── Breadcrumb navigation (go back up) ───────────────────────────────────
  const crumbs = [{ label: 'Owners', key: 'root' }];
  if (selectedZone) crumbs.push({ label: selectedZone, key: 'zone' });
  if (selectedMaster) crumbs.push({ label: selectedMaster, key: 'master' });
  if (selectedProject) crumbs.push({ label: selectedProject, key: 'project' });

  function handleBreadcrumb(idx) {
    if (idx === 0) { setStep('zones'); setSelectedZone(null); setSelectedMaster(null); setSelectedProject(null); }
    else if (idx === 1) { setStep('master_projects'); setSelectedMaster(null); setSelectedProject(null); }
    else if (idx === 2) { setStep('projects'); setSelectedProject(null); }
  }

  // ── Search ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim() || search.trim().length < 2) {
      setSearchMode(false);
      setSearchResults([]);
      return;
    }
    setSearchMode(true);
    const timer = setTimeout(() => {
      setSearching(true);
      invoke('search', { search: search.trim() })
        .then(d => setSearchResults(d?.results || []))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  function clearSearch() {
    setSearch('');
    setSearchMode(false);
    setSearchResults([]);
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const ZONE_COLORS = {
    Core:        'bg-evergreen-tint text-evergreen',
    Suburbs:     'bg-brass-tint text-brass',
    Waterfront:  'bg-sky-tint text-sky',
    'MBR City':  'bg-terracotta-tint text-terracotta',
    'Dubai South':'bg-surface-2 text-muted-foreground',
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Owner Database</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Browse by zone → community → building, or search 182k owners</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, property ID, unit code…"
          className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
        />
        {search && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search mode */}
      {searchMode ? (
        <div>
          {searching ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching 182k owners…
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">No results found for "{search}"</div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-3">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map(o => (
                  <OwnerCard key={o.id} owner={o} onClick={o => setProfileOwnerId(o.id)} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Breadcrumbs */}
          <OwnerBreadcrumbs crumbs={crumbs} onNavigate={handleBreadcrumb} />

          {/* Explorer */}
          {loading ? (
            <GridSkeleton n={6} />
          ) : step === 'zones' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {zones.map(zone => {
                const stat = zoneStats.find(z => z.zone === zone);
                return (
                  <TileButton
                    key={zone}
                    label={zone}
                    icon={MapPin}
                    color={ZONE_COLORS[zone] || 'bg-surface-2 text-muted-foreground'}
                    onClick={() => drillZone(zone)}
                    stat={stat?.owner_count || null}
                  />
                );
              })}
            </div>
          ) : step === 'master_projects' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {masterProjects.length === 0 ? (
                <div className="col-span-full text-sm text-muted-foreground py-8 text-center">No communities found in {selectedZone}.</div>
              ) : masterProjects.map(m => (
                <TileButton key={m} label={m} icon={Building2} color="bg-brass-tint text-brass" onClick={() => drillMaster(m)} />
              ))}
            </div>
          ) : step === 'projects' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.length === 0 ? (
                <div className="col-span-full text-sm text-muted-foreground py-8 text-center">No buildings found in {selectedMaster}.</div>
              ) : projects.map(p => {
                const rawName = typeof p === 'string' ? p : p.name;
                const displayName = normalizeProject(rawName);
                const hasExcel = typeof p === 'object' && p.has_excel;
                // Prevent duplicate tiles for normalized names
                return (
                  <TileButton key={displayName} label={displayName} icon={Home} color="bg-sky-tint text-sky" hasExcel={hasExcel} onClick={() => drillProject(displayName)} />
                );
              })}
            </div>
          ) : step === 'owners' ? (
            <div>
              {owners.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No owners found in <span className="font-medium">{selectedProject}</span>.
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground mb-3">
                    {owners.length} owner{owners.length !== 1 ? 's' : ''} in {selectedProject}
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {owners.map(o => (
                      <OwnerCard key={o.id} owner={o} onClick={o => setProfileOwnerId(o.id)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </>
      )}

      {/* Profile drawer */}
      {profileOwnerId && (
        <OwnerProfileDrawer
          ownerId={profileOwnerId}
          onClose={() => setProfileOwnerId(null)}
        />
      )}
    </div>
  );
}