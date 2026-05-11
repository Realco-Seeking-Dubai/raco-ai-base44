import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2 } from 'lucide-react';
import AgentSkillsPanel from './AgentSkillsPanel';
import AgentWhatsAppPanel from './AgentWhatsAppPanel';
import { cn } from '@/lib/utils';

const ROLES = ['Orchestrator', 'Market Data Specialist', 'Outreach Specialist', 'Intent Detection Specialist', 'Strategy Specialist', 'Data Scope Guardian', 'Marketing Specialist'];

export default function AgentFormModal({ agent, zones = [], onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    agent_name: agent?.agent_name || '',
    role: agent?.role || '',
    description: agent?.description || '',
    avatar_emoji: agent?.avatar_emoji || '🤖',
    is_active: agent?.is_active !== false,
    zone_scope: agent?.zone_scope || [],
    access_permissions: agent?.access_permissions || [],
    skills: agent?.skills || [],
  });

  const [tab, setTab] = useState('basic');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleZone = (zone) => {
    setFormData(prev => ({
      ...prev,
      zone_scope: prev.zone_scope.includes(zone)
        ? prev.zone_scope.filter(z => z !== zone)
        : [...prev.zone_scope, zone],
    }));
  };

  const handleSkillsUpdate = (skills) => {
    setFormData(prev => ({ ...prev, skills }));
  };

  async function handleSave() {
    if (!formData.agent_name || !formData.role) {
      alert('Agent name and role are required');
      return;
    }

    setLoading(true);
    try {
      if (agent?.id) {
        // Update existing agent
        await base44.entities.SuperAgent.update(agent.id, formData);
      } else {
        // Create new agent
        await base44.entities.SuperAgent.create(formData);
      }
      onSaved?.();
      onClose?.();
    } catch (error) {
      console.error('Error saving agent:', error);
      alert('Error saving agent');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center animate-fade-in">
      <div className="w-full sm:max-w-2xl bg-card rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{agent ? 'Edit Agent' : 'Create Agent'}</h2>
            <p className="text-xs text-muted-foreground mt-1">Configure agent settings, skills, and integrations</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-hairline px-6">
          {[
            { id: 'basic', label: 'Basic Info' },
            { id: 'skills', label: 'Skills' },
            { id: 'whatsapp', label: 'WhatsApp' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.id ? 'border-evergreen text-evergreen' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'basic' && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Agent Name *</label>
                <input
                  type="text"
                  value={formData.agent_name}
                  onChange={(e) => handleChange('agent_name', e.target.value)}
                  placeholder="e.g., Property Monitor Scout"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen"
                >
                  <option value="">Select a role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="What does this agent do?"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen h-20 resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Avatar Emoji</label>
                <input
                  type="text"
                  value={formData.avatar_emoji}
                  onChange={(e) => handleChange('avatar_emoji', e.target.value)}
                  maxLength="2"
                  className="w-16 px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen text-center text-2xl"
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="rounded border-hairline"
                />
                <label className="text-sm font-medium text-foreground">Active</label>
              </div>

              {zones.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Zones (optional)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {zones.map(z => (
                      <button
                        key={z}
                        onClick={() => toggleZone(z)}
                        className={cn(
                          'px-3 py-2 text-xs rounded-lg border font-medium transition-colors',
                          formData.zone_scope.includes(z)
                            ? 'border-evergreen bg-evergreen-tint text-evergreen'
                            : 'border-hairline bg-surface text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'skills' && (
            <AgentSkillsPanel skills={formData.skills} onUpdate={handleSkillsUpdate} />
          )}

          {tab === 'whatsapp' && (
            <AgentWhatsAppPanel agentId={agent?.id} agentName={formData.agent_name} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-hairline bg-surface">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-hairline hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-evergreen text-white hover:bg-evergreen-mid disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : 'Save Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}