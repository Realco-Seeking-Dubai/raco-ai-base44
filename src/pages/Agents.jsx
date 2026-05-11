import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { agentDb } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import { Zap, Plus } from 'lucide-react';
import RoccoCard from '@/components/agents/RoccoCard';
import SpecialistGrid from '@/components/agents/SpecialistGrid';
import AgentDetailModal from '@/components/agents/AgentDetailModal';
import AgentSidebar from '@/components/agents/AgentSidebar';

export default function Agents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Access control
  const isAllowed = user?.role === 'super_admin' || user?.role === 'sales_manager';

  useEffect(() => {
    if (!isAllowed) return;
    agentDb.from('SuperAgent')
      .select('*')
      .eq('is_active', true)
      .order('agent_name')
      .then(({ data, error }) => {
        if (!error) setAgents(data || []);
      })
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, [isAllowed]);

  if (!isAllowed) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground">Access Restricted</div>
          <p className="text-sm text-muted-foreground mt-2">Only super_admin and sales_manager can view agents.</p>
        </div>
      </div>
    );
  }

  const rocco = agents.find(a => a.agent_name === 'Rocco AI');
  const specialists = agents.filter(a => a.agent_name !== 'Rocco AI');
  const activeCount = agents.filter(a => a.is_active).length;

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Raco AI Agents"
        subtitle={`Rocco AI orchestrates ${specialists.length} specialists. Each agent has its own skills, scope, and integration sources.`}
        actions={
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-lg bg-evergreen-tint text-evergreen text-xs font-semibold">
              {activeCount} active
            </span>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="h-40 bg-surface rounded-xl animate-pulse" />
          <div className="grid lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-surface rounded-xl animate-pulse" />)}
          </div>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Rocco Card */}
            {rocco && (
              <RoccoCard agent={rocco} onConfigure={() => setSelectedAgent(rocco)} />
            )}

            {/* Specialists Grid */}
            <SpecialistGrid agents={specialists} onSelect={setSelectedAgent} />
          </div>

          {/* Sidebar */}
          <AgentSidebar selectedAgent={selectedAgent} agents={agents} />
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onUpdate={(updated) => {
            setAgents(prev => prev.map(a => a.id === updated.id ? updated : a));
            setSelectedAgent(updated);
          }}
        />
      )}
    </div>
  );
}