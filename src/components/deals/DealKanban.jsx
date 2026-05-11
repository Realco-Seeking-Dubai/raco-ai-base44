import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { AlertTriangle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const STAGES = ['Offer', 'MOU', 'NOC', 'Trustee', 'Transfer', 'Closed'];

const STAGE_ACCENTS = {
  Offer: 'border-t-sky',
  MOU: 'border-t-brass',
  NOC: 'border-t-terracotta',
  Trustee: 'border-t-evergreen-light',
  Transfer: 'border-t-evergreen-mid',
  Closed: 'border-t-evergreen',
};

const STAGE_HEADER_BG = {
  Offer: 'bg-sky-tint text-sky',
  MOU: 'bg-brass-tint text-brass',
  NOC: 'bg-terracotta-tint text-terracotta',
  Trustee: 'bg-evergreen-tint text-evergreen-light',
  Transfer: 'bg-evergreen-tint text-evergreen-mid',
  Closed: 'bg-evergreen-tint text-evergreen',
};

export default function DealKanban({ initialDeals }) {
  const [deals, setDeals] = useState(initialDeals);

  const byStage = STAGES.reduce((acc, s) => {
    acc[s] = deals.filter(d => (d.stage || 'Offer') === s);
    return acc;
  }, {});

  async function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const newStage = destination.droppableId;
    setDeals(prev => prev.map(d => d.id === draggableId ? { ...d, stage: newStage } : d));

    // Persist to Supabase
    await supabase.from('deals').update({ stage: newStage }).eq('id', draggableId);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
        {STAGES.map(stage => (
          <div key={stage} className="w-60 shrink-0 flex flex-col">
            {/* Column header */}
            <div className={cn('flex items-center justify-between mb-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold', STAGE_HEADER_BG[stage])}>
              <span>{stage}</span>
              <span className="opacity-70 font-mono">{byStage[stage].length}</span>
            </div>

            <Droppable droppableId={stage}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'flex-1 rounded-xl space-y-2 p-2 min-h-[200px] transition-colors',
                    snapshot.isDraggingOver ? 'bg-evergreen-tint/40 border border-dashed border-evergreen/30' : 'bg-surface/50'
                  )}
                >
                  {byStage[stage].length === 0 && !snapshot.isDraggingOver && (
                    <div className="h-14 rounded-lg border border-dashed border-hairline flex items-center justify-center text-xs text-muted-2">
                      Drop here
                    </div>
                  )}
                  {byStage[stage].map((deal, index) => (
                    <Draggable key={deal.id} draggableId={deal.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            'bg-card border-t-2 rounded-xl p-3 shadow-sm transition-all',
                            STAGE_ACCENTS[stage],
                            deal.risk_flag ? 'border-x border-b border-terracotta/30' : 'border-x border-b border-hairline',
                            snapshot.isDragging ? 'shadow-lg rotate-1 scale-105' : 'hover:shadow-md'
                          )}
                        >
                          <div className="flex items-start gap-1.5">
                            <div {...provided.dragHandleProps} className="mt-0.5 text-muted-2 hover:text-muted-foreground cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {deal.deal_title || deal.unit_ref || 'Deal'}
                              </div>
                              {deal.deal_value && (
                                <div className="text-xs font-mono text-muted-foreground mt-0.5">
                                  AED {Number(deal.deal_value).toLocaleString()}
                                </div>
                              )}
                              {deal.risk_flag && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-terracotta">
                                  <AlertTriangle className="w-3 h-3" /> At risk
                                </div>
                              )}
                              {deal.days_in_stage > 0 && (
                                <div className="text-[10px] text-muted-2 mt-1 font-mono">
                                  {deal.days_in_stage}d in stage
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}