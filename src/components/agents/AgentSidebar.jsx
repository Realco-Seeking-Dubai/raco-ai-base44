import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AgentSidebar({ selectedAgent, agents }) {
  return (
    <div className="w-64 shrink-0 hidden lg:flex flex-col gap-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</div>

      <Button variant="outline" className="w-full justify-start gap-2">
        <Plus className="w-3.5 h-3.5" />
        Create Automation
      </Button>

      <Button variant="outline" className="w-full justify-start gap-2">
        <Plus className="w-3.5 h-3.5" />
        Schedule Report
      </Button>

      <Button variant="outline" className="w-full justify-start gap-2">
        <Plus className="w-3.5 h-3.5" />
        Connect WhatsApp
      </Button>

      <Button variant="outline" className="w-full justify-start gap-2">
        <Plus className="w-3.5 h-3.5" />
        View Inquiries
      </Button>

      {/* Agent Count */}
      <div className="mt-6 p-4 bg-surface rounded-xl">
        <p className="text-xs text-muted-foreground mb-2">Total Agents</p>
        <p className="text-2xl font-bold text-foreground">{agents.length}</p>
        <p className="text-xs text-muted-2 mt-1">{agents.filter(a => a.is_active).length} active</p>
      </div>
    </div>
  );
}