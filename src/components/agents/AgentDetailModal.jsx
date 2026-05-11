import { X, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export default function AgentDetailModal({ agent, onClose, onUpdate, onEdit, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-card border-l border-hairline h-full overflow-y-auto shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-hairline px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{agent.avatar_emoji || '🤖'}</span>
            <div>
              <h2 className="font-semibold text-foreground">{agent.agent_name}</h2>
              <p className="text-xs text-muted-foreground">{agent.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-brass-tint text-muted-foreground hover:text-brass transition-colors"
                title="Edit agent"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg hover:bg-terracotta-tint text-muted-foreground hover:text-terracotta transition-colors"
                title="Delete agent"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</h3>
            <p className="text-sm text-foreground leading-relaxed">{agent.description}</p>
          </div>

          {/* Skills */}
          {agent.skills && agent.skills.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Skills</h3>
              <Accordion type="single" collapsible className="space-y-2">
                {agent.skills.map((skill, idx) => (
                  <AccordionItem key={idx} value={`skill-${idx}`} className="border border-hairline rounded-lg px-4">
                    <AccordionTrigger className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{skill.skill_name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {skill.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2 space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Description</p>
                        <p className="text-sm text-foreground">{skill.description}</p>
                      </div>
                      {skill.rpc_function && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">RPC Function</p>
                          <code className="block bg-surface rounded px-2 py-1 text-xs text-muted-foreground font-mono overflow-x-auto">{skill.rpc_function}</code>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* Communicates With */}
          {agent.communicates_with && agent.communicates_with.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Communicates With</h3>
              <div className="flex flex-wrap gap-2">
                {agent.communicates_with.map((name, idx) => (
                  <Badge key={idx} variant="outline">{name}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Triggered By Events */}
          {agent.triggered_by_events && agent.triggered_by_events.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Triggered By Events</h3>
              <div className="flex flex-wrap gap-2">
                {agent.triggered_by_events.map((event, idx) => (
                  <Badge key={idx} variant="outline">{event}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Integration Sources */}
          {agent.integration_sources && agent.integration_sources.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Integration Sources</h3>
              <div className="flex flex-wrap gap-2">
                {agent.integration_sources.map((source, idx) => (
                  <Badge key={idx} variant="outline">{source}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Access Permissions */}
          {agent.access_permissions && agent.access_permissions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Access Permissions</h3>
              <div className="flex flex-wrap gap-2">
                {agent.access_permissions.map((role, idx) => (
                  <Badge key={idx} className="bg-brass-tint text-brass">{role}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Working Style */}
          {agent.working_style && Object.keys(agent.working_style).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Working Style</h3>
              <pre className="bg-surface rounded p-3 text-xs overflow-x-auto text-muted-foreground">
                {JSON.stringify(agent.working_style, null, 2)}
              </pre>
            </div>
          )}

          {/* Footer Stats */}
          <div className="border-t border-hairline pt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Triggered</p>
              <p className="text-base font-semibold text-foreground">{agent.trigger_count || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-base font-semibold text-foreground">{Math.round(agent.success_rate || 0)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Triggered</p>
              <p className="text-xs font-mono text-foreground">
                {agent.last_triggered_at ? new Date(agent.last_triggered_at).toLocaleDateString('en-GB') : '—'}
              </p>
            </div>
          </div>

          {/* Save Button */}
          <Button className="w-full bg-evergreen hover:bg-evergreen-mid text-white" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}