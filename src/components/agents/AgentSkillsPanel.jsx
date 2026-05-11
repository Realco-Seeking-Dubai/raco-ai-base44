import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function AgentSkillsPanel({ skills = [], onUpdate }) {
  const [newSkill, setNewSkill] = useState({ skill_name: '', description: '', rpc_function: '', enabled: true });

  const addSkill = () => {
    if (!newSkill.skill_name) return;
    onUpdate([...skills, newSkill]);
    setNewSkill({ skill_name: '', description: '', rpc_function: '', enabled: true });
  };

  const removeSkill = (index) => {
    onUpdate(skills.filter((_, i) => i !== index));
  };

  const updateSkill = (index, field, value) => {
    const updated = [...skills];
    updated[index][field] = value;
    onUpdate(updated);
  };

  return (
    <div className="space-y-4">
      {skills.length > 0 && (
        <div className="space-y-3">
          {skills.map((skill, i) => (
            <div key={i} className="p-3 border border-hairline rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <input
                  type="text"
                  value={skill.skill_name}
                  onChange={(e) => updateSkill(i, 'skill_name', e.target.value)}
                  placeholder="Skill name"
                  className="flex-1 px-2 py-1 text-sm rounded border border-hairline bg-card focus:outline-none focus:border-evergreen"
                />
                <button
                  onClick={() => removeSkill(i)}
                  className="ml-2 p-1 text-muted-foreground hover:text-terracotta transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={skill.description || ''}
                onChange={(e) => updateSkill(i, 'description', e.target.value)}
                placeholder="Description"
                className="w-full px-2 py-1 text-sm rounded border border-hairline bg-card focus:outline-none focus:border-evergreen"
              />
              <input
                type="text"
                value={skill.rpc_function || ''}
                onChange={(e) => updateSkill(i, 'rpc_function', e.target.value)}
                placeholder="RPC function name"
                className="w-full px-2 py-1 text-sm rounded border border-hairline bg-card focus:outline-none focus:border-evergreen"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skill.enabled !== false}
                  onChange={(e) => updateSkill(i, 'enabled', e.target.checked)}
                  className="rounded border-hairline"
                />
                <span className="text-muted-foreground">Enabled</span>
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 border border-hairline rounded-lg bg-surface space-y-2">
        <div className="text-sm font-medium text-foreground">Add Skill</div>
        <input
          type="text"
          value={newSkill.skill_name}
          onChange={(e) => setNewSkill(prev => ({ ...prev, skill_name: e.target.value }))}
          placeholder="Skill name"
          className="w-full px-2 py-1 text-sm rounded border border-hairline bg-card focus:outline-none focus:border-evergreen"
        />
        <input
          type="text"
          value={newSkill.description}
          onChange={(e) => setNewSkill(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Description"
          className="w-full px-2 py-1 text-sm rounded border border-hairline bg-card focus:outline-none focus:border-evergreen"
        />
        <input
          type="text"
          value={newSkill.rpc_function}
          onChange={(e) => setNewSkill(prev => ({ ...prev, rpc_function: e.target.value }))}
          placeholder="RPC function name"
          className="w-full px-2 py-1 text-sm rounded border border-hairline bg-card focus:outline-none focus:border-evergreen"
        />
        <button
          onClick={addSkill}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-evergreen bg-evergreen-tint text-evergreen hover:bg-evergreen/10 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>

      <div className="text-xs text-muted-foreground bg-surface p-3 rounded-lg">
        <div className="font-medium text-foreground mb-1">Tip:</div>
        <p>Skills define what actions this agent can perform. Each skill can be linked to a backend function (RPC).</p>
      </div>
    </div>
  );
}