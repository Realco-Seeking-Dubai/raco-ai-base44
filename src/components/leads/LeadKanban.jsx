import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '@/lib/supabase';
import LeadScoreBadge, { getScoreTier } from './LeadScoreBadge';
import ListingLinkBadge, { matchListings } from './ListingLinkBadge';
import AgentAssignBadge from './AgentAssignBadge';
import { cn } from '@/lib/utils';

const STAGES = ['New', 'Qualified', 'Viewing', 'Negotiation', 'Closed'];

const STAGE_STYLES = {
  New: { header: 'bg-sky-tint text-sky', border: 'border-t-sky' },
  Qualified: { header: 'bg-brass-tint text-brass', border: 'border-t-brass' },
  Viewing: { header: 'bg-evergreen-tint text-evergreen', border: 'border-t-evergreen' },
  Negotiation: { header: 'bg-terracotta-tint text-terracotta', border: 'border-t-terracotta' },
  Closed: { header: 'bg-surface-2 text-muted-foreground', border: 'border-t-muted-2' },
};

const SOURCE_COLORS = {
  bayut: 'bg-brass-tint text-brass',
  dubizzle: 'bg-sky-tint text-sky',
  'property finder': 'bg-evergreen-tint text-evergreen',
  meta: 'bg-terracotta-tint text-terracotta',
};

export default function LeadKanban({ leads, listings, agents, onLeadUpdated }) {
  const [updating, setUpdating] = useState(null);

  const byStage = STAGES.map(stage => ({
    stage,
    items: leads.filter(l => (l.stage || 'New').toLowerCase() === stage.toLowerCase()),
  }));

  async function handleDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const leadId = draggableId;
    const newStage = destination.droppableId;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    setUpdating(leadId);
    try {
      await supabase
        .from('pixxi_leads')
        .update({ stage: newStage })
        .eq('id', leadId);
      onLeadUpdated?.(leadId, { stage: newStage });
    } catch (err) {
      console.error('Failed to update lead stage:', err);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
        {byStage.map(({ stage, items }) => {
          const style = STAGE_STYLES[stage];
          return (
            <Droppable key={stage} droppableId={stage}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="w-64 shrink-0 flex flex-col"
                >
                  <div className={cn('flex items-center justify-between mb-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold', style.header)}>
                    <span>{stage}</span>
                    <span className="opacity-70 font-mono">{items.length}</span>
                  </div>
                  <div
                    className={cn(
                      'flex-1 bg-surface/50 rounded-xl p-2 space-y-2 min-h-[120px] transition-colors',
                      snapshot.isDraggingOver && 'bg-surface/80'
                    )}
                  >
                    {items.map((lead, idx) => {
                      const matched = matchListings(lead, listings);
                      const isUpdating = updating === lead.id;
                      return (
                        <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                'bg-card border-t-2 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing',
                                style.border,
                                'border-x border-b border-hairline',
                                getScoreTier(lead._score) === 'hot' && 'ring-1 ring-terracotta/30',
                                snapshot.isDragging && 'shadow-lg opacity-50',
                                isUpdating && 'opacity-60'
                              )}
                            >
                              <div className="flex items-start justify-between gap-1 mb-1.5">
                                <div className="text-sm font-medium text-foreground truncate">{lead.name || '—'}</div>
                              </div>
                              <div className="flex flex-wrap gap-1 mb-1.5">
                                <LeadScoreBadge score={lead._score} showLabel={false} />
                                {lead.source && (
                                  <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', SOURCE_COLORS[lead.source?.toLowerCase()] || 'bg-surface-2 text-muted-foreground')}>
                                    {lead.source}
                                  </span>
                                )}
                                {matched.length > 0 && <ListingLinkBadge count={matched.length} />}
                              </div>
                              {lead.budget_aed && (
                                <div className="text-xs text-muted-foreground font-mono mb-2">
                                  AED {Number(lead.budget_aed).toLocaleString()}
                                </div>
                              )}
                              <div className="mt-2" onClick={e => e.stopPropagation()}>
                                <AgentAssignBadge lead={lead} agents={agents} onAssigned={() => {}} />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}