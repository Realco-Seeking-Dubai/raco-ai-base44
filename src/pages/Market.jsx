import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Building2, Home, RefreshCw } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';

// ── Breadcrumbs ──────────────────────────────────────────────────────────────
function MarketBreadcrumbs({ crumbs, onNavigate }) {
  return (
    <div className="flex items-center gap-1 mb-6 text-sm text-muted-foreground flex-wrap">
      {crumbs.map((crumb, idx) => (
        <div key={crumb.key} className="flex items-center gap-1">
          {idx > 0 && <span className="opacity-40">/</span>}
          <button
            onClick={() => onNavigate(idx)}
            className={cn(
              'transition-colors',
              idx === crumbs.length - 1
                ? 'text-foreground font-medium'
                : 'hover:text-foreground'
            )}
          >
            {crumb.label}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Grid Skeleton ────────────────────────────────────────────────────────────
function GridSkeleton({ n = 6 }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

// ── Tile Button ──────────────────────────────────────────────────────────────
function TileButton({ label, icon: Icon, color = 'bg-evergreen-tint text-evergreen', onClick }) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-card border border-hairline rounded-xl p-4 hover:shadow-sm hover:border-evergreen/40 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-foreground group-hover:text-evergreen transition-colors leading-tight">{label}</div>
        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-evergreen transition-colors shrink-0 mt-0.5" />
      </div>
    </button>
  );
}

// ── Building Detail View ─────────────────────────────────────────────────────
function BuildingDetail({ building, onBack, onRefresh, loading }) {
  if (!building) return null;

  const categoryData = building.property_category
    ? [{ category: building.property_category, count: building.total_units || 0 }]
    : [];

  const statusData = [
    { status: 'Off-Plan', count: building.off_plan_units || 0 },
    { status: 'Secondary', count: building.secondary_units || 0 },
  ].filter(d => d.count > 0);

  const COLORS = ['hsl(var(--evergreen))', 'hsl(var(--brass))', 'hsl(var(--sky))'];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-semibold text-foreground">{building.project}</h1>
          <p className="text-sm text-muted-foreground mt-1">{building.master_project_name} · {building.final_zone_name}</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg border border-hairline bg-card text-muted-foreground hover:text-foreground hover:bg-surface transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-surface rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard
              label="Total Units"
              value={(building.total_units || 0).toLocaleString()}
              color="evergreen"
            />
            <KpiCard
              label="Transactions"
              value={(building.total_transactions || 0).toLocaleString()}
              color="brass"
            />
            <KpiCard
              label="Sales Value (AED)"
              value={building.total_value_aed ? `${(building.total_value_aed / 1e9).toFixed(1)}B` : '—'}
              color="sky"
            />
            <KpiCard
              label="Mapping Confidence"
              value={building.mapping_confidence || '—'}
              color={building.mapping_confidence === 'HIGH' ? 'evergreen' : 'brass'}
            />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Category breakdown */}
            {categoryData.length > 0 && (
              <div className="bg-card border border-hairline rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground mb-4">Property Categories</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label
                    >
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Market status */}
            {statusData.length > 0 && (
              <div className="bg-card border border-hairline rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground mb-4">Market Status</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusData}>
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => v.toLocaleString()} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => [`${value.toLocaleString()} units`]} />
                    <Bar dataKey="count" fill="hsl(var(--evergreen))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 bg-card border border-hairline rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Summary</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Category</span>
                <p className="font-medium text-foreground mt-1">{building.property_category || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Area (sqm)</span>
                <p className="font-medium text-foreground mt-1">{building.total_area_sqm ? `${(building.total_area_sqm / 1000).toFixed(1)}k` : '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Unit Price (AED)</span>
                <p className="font-medium text-foreground mt-1">
                  {building.avg_unit_price ? `${(building.avg_unit_price / 1e6).toFixed(2)}M` : '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Data Source</span>
                <p className="font-medium text-foreground mt-1">DLD</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Market() {
  // Navigation state
  const [step, setStep] = useState('zones'); // 'zones' | 'master_projects' | 'buildings' | 'building_detail'
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Data
  const [zones, setZones] = useState([]);
  const [masters, setMasters] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [buildingDetail, setBuildingDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  // API calls
  function invoke(action, extra = {}) {
    return base44.functions.invoke('getMarketHierarchy', { action, ...extra })
      .then(res => res.data);
  }

  // ── Load zones on mount ──────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    invoke('zones')
      .then(d => setZones(d?.zones || []))
      .finally(() => setLoading(false));
  }, []);

  // ── Navigation handlers ──────────────────────────────────────────────────
  function drillZone(zone) {
    setSelectedZone(zone);
    setSelectedMaster(null);
    setSelectedBuilding(null);
    setStep('master_projects');
    setLoading(true);
    invoke('master_projects', { zone })
      .then(d => setMasters(d?.master_projects || []))
      .finally(() => setLoading(false));
  }

  function drillMaster(master) {
    setSelectedMaster(master);
    setSelectedBuilding(null);
    setStep('buildings');
    setLoading(true);
    invoke('buildings', { master_project: master })
      .then(d => setBuildings(d?.buildings || []))
      .finally(() => setLoading(false));
  }

  function drillBuilding(building) {
    setSelectedBuilding(building);
    setStep('building_detail');
    setLoading(true);
    invoke('building_detail', { building })
      .then(d => setBuildingDetail(d?.building))
      .finally(() => setLoading(false));
  }

  // ── Breadcrumbs ──────────────────────────────────────────────────────────
  const crumbs = [{ label: 'Market', key: 'root' }];
  if (selectedZone) crumbs.push({ label: selectedZone, key: 'zone' });
  if (selectedMaster) crumbs.push({ label: selectedMaster, key: 'master' });
  if (selectedBuilding) crumbs.push({ label: selectedBuilding, key: 'building' });

  function handleBreadcrumb(idx) {
    if (idx === 0) { setStep('zones'); setSelectedZone(null); setSelectedMaster(null); setSelectedBuilding(null); }
    else if (idx === 1) { setStep('master_projects'); setSelectedMaster(null); setSelectedBuilding(null); }
    else if (idx === 2) { setStep('buildings'); setSelectedBuilding(null); }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const ZONE_COLORS = {
    Core: 'bg-evergreen-tint text-evergreen',
    Suburbs: 'bg-brass-tint text-brass',
    Waterfront: 'bg-sky-tint text-sky',
    'MBR City': 'bg-terracotta-tint text-terracotta',
    'Dubai South': 'bg-surface-2 text-muted-foreground',
  };

  return (
    <div className="p-6 animate-fade-in">
      {step === 'building_detail' ? (
        <BuildingDetail
          building={buildingDetail}
          onBack={() => { setStep('buildings'); setSelectedBuilding(null); }}
          onRefresh={() => drillBuilding(selectedBuilding)}
          loading={loading}
        />
      ) : (
        <>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Market Intelligence</h1>
            <p className="text-sm text-muted-foreground mt-1">DLD transaction analytics · Browse by Zone → Master Project → Building</p>
          </div>

          {/* Breadcrumbs */}
          <MarketBreadcrumbs crumbs={crumbs} onNavigate={handleBreadcrumb} />

          {/* Explorer */}
          {loading ? (
            <GridSkeleton n={step === 'buildings' ? 9 : 6} />
          ) : step === 'zones' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {zones.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState icon={MapPin} title="No zones assigned" body="Check your scope in the Admin module." />
                </div>
              ) : zones.map(z => (
                <TileButton
                  key={z.zone}
                  label={z.zone}
                  icon={MapPin}
                  color={ZONE_COLORS[z.zone] || 'bg-surface-2 text-muted-foreground'}
                  onClick={() => drillZone(z.zone)}
                />
              ))}
            </div>
          ) : step === 'master_projects' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {masters.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState icon={Building2} title="No master projects" body={`Found in ${selectedZone}`} />
                </div>
              ) : masters.map(m => (
                <TileButton
                  key={m.master_project}
                  label={m.master_project}
                  icon={Building2}
                  color="bg-brass-tint text-brass"
                  onClick={() => drillMaster(m.master_project)}
                />
              ))}
            </div>
          ) : step === 'buildings' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {buildings.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState icon={Home} title="No buildings" body={`Found in ${selectedMaster}`} />
                </div>
              ) : buildings.map(b => (
                <TileButton
                  key={b.building}
                  label={b.building}
                  icon={Home}
                  color="bg-sky-tint text-sky"
                  onClick={() => drillBuilding(b.building)}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}