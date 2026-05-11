import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getCampaigns } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import { Megaphone, Plus, MessageCircle, Mail, Phone } from 'lucide-react';

const SOURCES = [
  { name: 'Bayut', leads: 1240, conversion: 4.2, color: 'brass' },
  { name: 'Dubizzle', leads: 890, conversion: 3.8, color: 'sky' },
  { name: 'WhatsApp', leads: 640, conversion: 9.1, color: 'evergreen' },
  { name: 'Meta Ads', leads: 580, conversion: 2.9, color: 'terracotta' },
  { name: 'Referral', leads: 320, conversion: 18.5, color: 'brass' },
  { name: 'Email', leads: 280, conversion: 7.2, color: 'sky' },
];

const COLOR_MAP = {
  evergreen: 'bg-evergreen-tint text-evergreen',
  brass: 'bg-brass-tint text-brass',
  sky: 'bg-sky-tint text-sky',
  terracotta: 'bg-terracotta-tint text-terracotta',
};

export default function Marketing() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    getCampaigns(user.email)
      .then(data => {
        setCampaigns(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Campaigns fetch error:', err);
        setCampaigns([]);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Marketing & Sources"
        subtitle="Lead sources, campaigns, and ROI"
        actions={
          <button className="px-3 py-1.5 text-sm rounded-lg bg-evergreen text-white font-medium flex items-center gap-1.5 hover:bg-evergreen-mid transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Campaign
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Active campaigns" value={campaigns.length} icon={Megaphone} color="evergreen" />
        <KpiCard label="Total leads (30d)" value="3,950" icon={Megaphone} color="brass" />
        <KpiCard label="Avg. CPL" value="AED 840" icon={Megaphone} color="sky" />
        <KpiCard label="Top channel ROI" value="Referral" icon={Megaphone} color="terracotta" />
      </div>

      {/* Source cards */}
      <h3 className="text-sm font-semibold text-foreground mb-3">Lead Sources</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {SOURCES.map(s => (
          <div key={s.name} className="bg-card border border-hairline rounded-xl p-4 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${COLOR_MAP[s.color]}`}>
                  {s.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-foreground">{s.name}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${COLOR_MAP[s.color]}`}>
                {s.conversion}% conv.
              </span>
            </div>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{s.leads.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-0.5">leads this 30 days</div>
          </div>
        ))}
      </div>

      {/* Campaigns table */}
      <h3 className="text-sm font-semibold text-foreground mb-3">Active Campaigns</h3>
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" body="Create a campaign to reach owners in your areas." />
      ) : (
        <div className="bg-card border border-hairline rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Channel</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Sent</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Replied</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{c.campaign_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.channel || 'WhatsApp'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{c.sent_count || 0}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{c.replied_count || 0}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status || 'draft'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}