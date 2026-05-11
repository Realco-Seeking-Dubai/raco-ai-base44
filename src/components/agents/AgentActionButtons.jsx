import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { agentDb } from '@/lib/supabase';
import { toast } from 'sonner';

const AGENT_ACTIONS = [
  { emoji: '🔍', label: 'Get Market Data', agentName: 'Property Monitor Scout' },
  { emoji: '✍️', label: 'Compose Outreach', agentName: 'Message Composer' },
  { emoji: '📣', label: 'Generate Campaign', agentName: 'Campaign Generator' },
  { emoji: '📎', label: 'Generate Brochure', agentName: 'Marketing Agent' },
];

const MOCK_RESULTS = {
  'Property Monitor Scout': {
    zone: 'Downtown',
    marketValue: 'AED 3.2M - 4.8M',
    recentSales: 12,
    trends: '📈 Up 2.3% YoY',
  },
  'Message Composer': {
    template: 'Professional outreach',
    tone: 'Friendly & professional',
    characterCount: 280,
  },
  'Campaign Generator': {
    campaignName: 'Summer Campaign 2025',
    targetAudience: 'Buyers 30-50',
    channels: ['WhatsApp', 'Email', 'SMS'],
  },
  'Marketing Agent': {
    pages: 8,
    format: 'PDF',
    features: 'Photos, pricing, maps',
  },
};

export default function AgentActionButtons({ ownerId, ownerName }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeAgent, setActiveAgent] = useState(null);

  async function invokeAgent(agentName) {
    setLoading(true);
    setActiveAgent(agentName);
    
    // Update trigger count
    const agent = await agentDb.from('SuperAgent')
      .select('trigger_count')
      .eq('agent_name', agentName)
      .single();
    
    if (agent.data) {
      await agentDb.from('SuperAgent')
        .update({
          trigger_count: (agent.data.trigger_count || 0) + 1,
          last_triggered_at: new Date().toISOString(),
        })
        .eq('agent_name', agentName);
    }

    // Show toast
    toast.loading(`${agentName} is running... results in 30 seconds`);

    // Mock result after 2 seconds
    setTimeout(() => {
      setResult({
        agent: agentName,
        data: MOCK_RESULTS[agentName],
        timestamp: new Date().toLocaleTimeString('en-GB'),
      });
      toast.dismiss();
      toast.success(`${agentName} completed!`);
      setLoading(false);
    }, 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {AGENT_ACTIONS.map(action => (
          <Button
            key={action.agentName}
            onClick={() => invokeAgent(action.agentName)}
            disabled={loading}
            variant="outline"
            className="gap-2 text-xs"
          >
            <span>{action.emoji}</span>
            {action.label}
          </Button>
        ))}
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-surface rounded-xl p-4 border border-hairline animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-foreground text-sm">{result.agent}</h4>
            <span className="text-xs text-muted-2 font-mono">{result.timestamp}</span>
          </div>
          <div className="space-y-2">
            {Object.entries(result.data).map(([key, value]) => (
              <div key={key} className="flex items-start justify-between text-xs">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-medium text-foreground text-right max-w-xs">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}