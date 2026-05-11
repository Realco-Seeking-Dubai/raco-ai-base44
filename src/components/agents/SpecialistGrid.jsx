import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function SpecialistGrid({ agents, onSelect }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-4">Specialist Agents</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <div
            key={agent.id}
            onClick={() => onSelect(agent)}
            className="bg-card border border-hairline rounded-xl p-4 hover:border-evergreen/40 hover:shadow-md transition-all cursor-pointer group"
          >
            {/* Avatar + Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="text-4xl">{agent.avatar_emoji || '🤖'}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground group-hover:text-evergreen transition-colors">{agent.agent_name}</h4>
                <p className="text-xs text-muted-foreground">{agent.role}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-foreground line-clamp-2 mb-3">{agent.description}</p>

            {/* Stats */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Skills</span>
                <span className="font-semibold text-foreground">{agent.skills?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Communicates With</span>
                <span className="font-semibold text-foreground">{agent.communicates_with?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Triggered</span>
                <span className="font-semibold text-foreground">{agent.trigger_count || 0}</span>
              </div>
            </div>

            {/* Status */}
            <Badge className={cn(
              'text-[10px] font-semibold',
              agent.is_active ? 'bg-evergreen-tint text-evergreen' : 'bg-surface-2 text-muted-foreground'
            )}>
              {agent.is_active ? 'Active' : 'Paused'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}