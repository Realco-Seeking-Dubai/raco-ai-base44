import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function RoccoCard({ agent, onConfigure }) {
  return (
    <div className="bg-gradient-to-br from-evergreen/10 via-card to-card border border-evergreen/20 rounded-2xl p-6 hover:border-evergreen/40 transition-all">
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="text-6xl shrink-0">{agent.avatar_emoji || '🎯'}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-foreground">{agent.agent_name}</h2>
            <Badge className={cn(
              'text-xs font-semibold',
              agent.is_active ? 'bg-evergreen-tint text-evergreen' : 'bg-surface-2 text-muted-foreground'
            )}>
              {agent.is_active ? 'Active' : 'Paused'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{agent.role}</p>
          <p className="text-sm text-foreground mb-4 max-w-2xl">{agent.description}</p>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-surface rounded-lg px-3 py-2">
              <div className="text-xs text-muted-foreground">Communicates With</div>
              <div className="text-base font-semibold text-foreground">{agent.communicates_with?.length || 0} agents</div>
            </div>
            <div className="bg-surface rounded-lg px-3 py-2">
              <div className="text-xs text-muted-foreground">Skills</div>
              <div className="text-base font-semibold text-foreground">{agent.skills?.length || 0}</div>
            </div>
            <div className="bg-surface rounded-lg px-3 py-2">
              <div className="text-xs text-muted-foreground">Triggered</div>
              <div className="text-base font-semibold text-foreground">{agent.trigger_count || 0}x</div>
            </div>
            <div className="bg-surface rounded-lg px-3 py-2">
              <div className="text-xs text-muted-foreground">Success Rate</div>
              <div className="text-base font-semibold text-foreground">{Math.round(agent.success_rate || 0)}%</div>
            </div>
          </div>

          {/* Button */}
          <Button onClick={onConfigure} className="bg-evergreen hover:bg-evergreen-mid text-white">
            Configure Rocco
          </Button>
        </div>
      </div>
    </div>
  );
}