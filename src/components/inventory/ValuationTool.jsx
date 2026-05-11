import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Loader2, ChevronDown, ChevronUp, Lightbulb, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROPERTY_TYPES = ['Apartment', 'Villa', 'Townhouse', 'Penthouse'];
const BEDROOMS = ['Studio', '1BR', '2BR', '3BR', '4BR', '5BR+'];
const ZONES = ['Al Furjan', 'JVC', 'Dubai Hills', 'Downtown', 'Palm Jumeirah', 'Business Bay', 'DIFC', 'Dubai Marina', 'JBR'];

function ConfidenceBar({ pct, color }) {
  return (
    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden w-full">
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ValuationTool() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    zone: 'Al Furjan',
    propertyType: 'Apartment',
    bedrooms: '2BR',
    sqft: '',
    floor: '',
    viewQuality: 'standard',
    condition: 'good',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleValuate() {
    if (!form.sqft) return;
    setLoading(true);
    setResult(null);
    const prompt = `You are a Dubai real estate valuation expert with access to DLD transaction data.
    
Property details:
- Zone: ${form.zone}
- Type: ${form.propertyType}
- Bedrooms: ${form.bedrooms}
- Size: ${form.sqft} sq ft
- Floor: ${form.floor || 'not specified'}
- View: ${form.viewQuality}
- Condition: ${form.condition}

Based on current Dubai market trends (2025–2026), recent DLD transactions in this zone, and comparable properties, provide:
1. An optimal listing price in AED (be specific, round to nearest 50,000)
2. A price range (low and high confidence bounds, ±10–20%)
3. A confidence level (0–100)
4. 3–4 key rationale points explaining the valuation
5. A market trend indicator for this zone: "rising", "stable", or "cooling"
6. Price per sq ft estimate

Respond as JSON only.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          optimal_price: { type: 'number' },
          price_low: { type: 'number' },
          price_high: { type: 'number' },
          confidence: { type: 'number' },
          price_per_sqft: { type: 'number' },
          trend: { type: 'string' },
          rationale: { type: 'array', items: { type: 'string' } },
        },
      },
    });
    setResult(res);
    setLoading(false);
  }

  const trendConfig = {
    rising: { label: 'Rising Market', color: 'text-evergreen', bg: 'bg-evergreen-tint', icon: '↑' },
    stable: { label: 'Stable Market', color: 'text-brass', bg: 'bg-brass-tint', icon: '→' },
    cooling: { label: 'Cooling Market', color: 'text-terracotta', bg: 'bg-terracotta-tint', icon: '↓' },
  };

  return (
    <div className="bg-card border border-hairline rounded-xl overflow-hidden mb-6">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brass-tint flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-brass" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-foreground">Market Valuation Tool</div>
            <div className="text-xs text-muted-foreground">AI-powered optimal listing price</div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-hairline p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {/* Zone */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Zone</label>
              <select value={form.zone} onChange={e => set('zone', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen">
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </div>
            {/* Type */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Property Type</label>
              <select value={form.propertyType} onChange={e => set('propertyType', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen">
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {/* Bedrooms */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bedrooms</label>
              <select value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen">
                {BEDROOMS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            {/* Sqft */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Size (sq ft) *</label>
              <input type="number" placeholder="e.g. 1200" value={form.sqft} onChange={e => set('sqft', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen" />
            </div>
            {/* Floor */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Floor</label>
              <input type="number" placeholder="e.g. 10" value={form.floor} onChange={e => set('floor', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen" />
            </div>
            {/* View */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">View Quality</label>
              <select value={form.viewQuality} onChange={e => set('viewQuality', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen">
                <option value="standard">Standard</option>
                <option value="partial_sea">Partial Sea</option>
                <option value="full_sea">Full Sea</option>
                <option value="burj_khalifa">Burj Khalifa</option>
                <option value="park_pool">Park / Pool</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleValuate}
            disabled={!form.sqft || loading}
            className="flex items-center gap-2 px-4 py-2 bg-brass text-white rounded-lg text-sm font-medium hover:bg-brass-light transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {loading ? 'Analysing market data…' : 'Get Valuation'}
          </button>

          {/* Result */}
          {result && (
            <div className="mt-5 space-y-4 animate-fade-in">
              {/* Main price */}
              <div className="bg-gradient-to-r from-evergreen to-evergreen-mid rounded-xl p-5 text-white">
                <div className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1">Optimal Listing Price</div>
                <div className="text-3xl font-bold mb-0.5">AED {Number(result.optimal_price).toLocaleString()}</div>
                <div className="text-sm text-white/70">
                  Range: AED {Number(result.price_low).toLocaleString()} – AED {Number(result.price_high).toLocaleString()}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wide">Per sq ft</div>
                    <div className="text-sm font-semibold">AED {Number(result.price_per_sqft).toLocaleString()}</div>
                  </div>
                  {result.trend && trendConfig[result.trend] && (
                    <div className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold', trendConfig[result.trend].bg, trendConfig[result.trend].color)}>
                      {trendConfig[result.trend].icon} {trendConfig[result.trend].label}
                    </div>
                  )}
                </div>
              </div>

              {/* Confidence */}
              <div className="bg-surface rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">Confidence Score</span>
                  <span className="text-sm font-bold text-foreground">{result.confidence}%</span>
                </div>
                <ConfidenceBar
                  pct={result.confidence}
                  color={result.confidence >= 75 ? 'bg-evergreen' : result.confidence >= 50 ? 'bg-brass' : 'bg-terracotta'}
                />
                <div className="text-xs text-muted-foreground mt-1.5">
                  {result.confidence >= 75 ? 'High confidence — strong comparable data available'
                    : result.confidence >= 50 ? 'Moderate confidence — limited recent comparables'
                    : 'Lower confidence — sparse transaction data in this area'}
                </div>
              </div>

              {/* Rationale */}
              {result.rationale?.length > 0 && (
                <div className="bg-brass-tint/40 border border-brass/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-brass" />
                    <span className="text-sm font-semibold text-brass">Valuation Rationale</span>
                  </div>
                  <ul className="space-y-2">
                    {result.rationale.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <span className="w-4 h-4 rounded-full bg-brass/20 text-brass flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}