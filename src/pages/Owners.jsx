import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useLens } from '@/lib/LensContext';
import { Search, Loader2, MapPin, Building2, Home, Users, X, RefreshCw } from 'lucide-react';
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

function TileButton({ label, count, icon: Icon, color = 'bg-evergreen-tint text-evergreen', onClick }) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-card border border-hairline rounded-xl p-4 hover:shadow-sm hover:border-evergreen/40 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-foreground group-hover:text-evergreen transition-colors">{label}</div>
        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-evergreen transition-colors shrink-0 mt-0.5" />
      </div>
      {count != null && (
        <div className={cn('mt-2 inline-block text-[11px] px-1.5 py-0.5 rounded font-medium', color)}>
          {count}
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

  // ── Load on mount: zones ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    invoke('zones')
      .then(d => setZones(d?.zones || []))
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

  function drillProject(project) {
    setSelectedProject(project);
    setOwners([]);
    setStep('owners');
    setLoading(true);
    invoke('owners_by_project', { project })
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
            <GridSkeleton n={step === 'owners' ? 9 : 6} />
          ) : step === 'zones' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {zones.length === 0 ? (
                <div className="col-span-full text-sm text-muted-foreground py-8 text-center">No zones assigned to your scope.</div>
              ) : zones.map(zone => (
                <TileButton
                  key={zone}
                  label={zone}
                  icon={MapPin}
                  color={ZONE_COLORS[zone] || 'bg-surface-2 text-muted-foreground'}
                  onClick={() => drillZone(zone)}
                />
              ))}
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
              ) : projects.map(p => (
                <TileButton key={p} label={p} icon={Home} color="bg-sky-tint text-sky" onClick={() => drillProject(p)} />
              ))}
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