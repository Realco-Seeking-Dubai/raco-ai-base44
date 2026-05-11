import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Zap, Plus, Trash2, Edit2 } from 'lucide-react';
import RoccoCard from '@/components/agents/RoccoCard';
import SpecialistGrid from '@/components/agents/SpecialistGrid';
import AgentDetailModal from '@/components/agents/AgentDetailModal';
import AgentFormModal from '@/components/agents/AgentFormModal';
import AgentSidebar from '@/components/agents/AgentSidebar';

export default function Agents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [zones, setZones] = useState([]);

  // Access control
  const isAllowed = user?.role === 'super_admin' || user?.role === 'sales_manager';

  useEffect(() => {
    if (!isAllowed) return;
    loadAgents();
  }, [isAllowed]);

  async function loadAgents() {
    try {
      setLoading(true);
      const data = await base44.entities.SuperAgent.list();
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(agentId) {
    if (!window.confirm('Delete this agent? This cannot be undone.')) return;
    try {
      await base44.entities.SuperAgent.delete(agentId);
      setAgents(prev => prev.filter(a => a.id !== agentId));
      setSelectedAgent(null);
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert('Error deleting agent');
    }
  }

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
            <button
              onClick={() => {
                setEditingAgent(null);
                setShowFormModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-evergreen text-white hover:bg-evergreen-mid transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Agent
            </button>
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
          onEdit={() => {
            setEditingAgent(selectedAgent);
            setShowFormModal(true);
          }}
          onDelete={() => handleDelete(selectedAgent.id)}
        />
      )}

      {/* Agent Form Modal */}
      {showFormModal && (
        <AgentFormModal
          agent={editingAgent}
          zones={zones}
          onClose={() => {
            setShowFormModal(false);
            setEditingAgent(null);
          }}
          onSaved={() => {
            setShowFormModal(false);
            setEditingAgent(null);
            loadAgents();
          }}
        />
      )}
    </div>
  );
}