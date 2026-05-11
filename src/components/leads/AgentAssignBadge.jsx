import { useState } from 'react';
import { User, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function AgentAssignBadge({ lead, agents, onAssigned }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentAgent = agents.find(a =>
    a.pixxi_email === lead.pixxi_user_email ||
    a.primary_email === lead.pixxi_user_email ||
    a.email === lead.pixxi_user_email
  );

  async function assign(agent) {
    setSaving(true);
    setOpen(false);
    const newEmail = agent.pixxi_email || agent.primary_email || agent.email;
    await supabase
      .from('pixxi_leads')
      .update({ pixxi_user_email: newEmail })
      .eq('id', lead.id);
    onAssigned?.(lead.id, newEmail);
    setSaving(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors',
          currentAgent
            ? 'border-evergreen/30 bg-evergreen-tint text-evergreen hover:bg-evergreen/10'
            : 'border-hairline bg-surface text-muted-foreground hover:text-foreground hover:border-hairline-strong'
        )}
      >
        <User className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[80px]">
          {saving ? '…' : currentAgent ? currentAgent.full_name?.split(' ')[0] : 'Assign'}
        </span>
        <ChevronDown className="w-2.5 h-2.5 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-card border border-hairline rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="max-h-48 overflow-y-auto">
            {agents.map(a => (
              <button
                key={a.id}
                onClick={() => assign(a)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface text-left text-xs transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-evergreen-tint flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-evergreen">{(a.full_name || '?').charAt(0)}</span>
                </div>
                <span className="text-foreground truncate flex-1">{a.full_name}</span>
                {(a.pixxi_email === lead.pixxi_user_email || a.primary_email === lead.pixxi_user_email || a.email === lead.pixxi_user_email) && (
                  <Check className="w-3 h-3 text-evergreen shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}