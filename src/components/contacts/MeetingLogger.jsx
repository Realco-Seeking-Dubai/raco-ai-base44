import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Phone, MessageCircle, Video, FileText, Loader2, Zap, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const INTERACTION_TYPES = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'meeting', label: 'Meeting', icon: Video },
  { value: 'note', label: 'Note', icon: FileText },
];

const STATUS_OPTIONS = ['New', 'Qualified', 'Viewing', 'Negotiation', 'Closed', 'Declined'];

export default function MeetingLogger({ contact, onLogged }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('call');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  async function handleGenerate() {
    if (!notes.trim()) return;
    setLoading(true);
    setResult(null);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a real estate CRM assistant. Analyse this interaction note from a Dubai real estate agent about a contact and extract structured information.

Contact: ${contact?.full_name || 'Unknown'}
Interaction type: ${type}
Duration: ${duration || 'not specified'}
Agent notes: "${notes}"

Extract:
1. A concise 1–2 sentence AI summary of the interaction
2. Up to 4 specific action items (short, actionable tasks starting with a verb)
3. Detected sentiment: "positive", "neutral", or "negative"
4. Recommended next step in one sentence
5. Suggested lead status update (one of: New, Qualified, Viewing, Negotiation, Closed, Declined) — only suggest a change if the notes clearly indicate a stage shift, otherwise return null

Respond as JSON only.`,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          action_items: { type: 'array', items: { type: 'string' } },
          sentiment: { type: 'string' },
          next_step: { type: 'string' },
          suggested_status: { type: 'string' },
        },
      },
    });

    setResult(res);
    if (res.suggested_status) setNewStatus(res.suggested_status);
    setLoading(false);
  }

  function handleSave() {
    const entry = {
      id: Date.now(),
      event_type: type,
      description: result?.summary || notes,
      action_items: result?.action_items || [],
      status_change: newStatus || null,
      event_at: new Date().toISOString(),
      raw_notes: notes,
    };
    onLogged?.(entry, newStatus || null);
    setNotes('');
    setDuration('');
    setResult(null);
    setNewStatus('');
    setOpen(false);
  }

  const sentimentConfig = {
    positive: { color: 'text-evergreen', bg: 'bg-evergreen-tint', label: '😊 Positive' },
    neutral: { color: 'text-brass', bg: 'bg-brass-tint', label: '😐 Neutral' },
    negative: { color: 'text-terracotta', bg: 'bg-terracotta-tint', label: '😟 Negative' },
  };

  return (
    <div className="bg-card border border-hairline rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-brass" />
          <span className="text-sm font-semibold text-foreground">Log Interaction + AI Summary</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-hairline p-4 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            {INTERACTION_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setType(value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  type === value
                    ? 'border-evergreen bg-evergreen-tint text-evergreen'
                    : 'border-hairline text-muted-foreground hover:text-foreground hover:border-hairline-strong'
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Duration */}
          {(type === 'call' || type === 'meeting') && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration (e.g. "12 min")</label>
              <input
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="How long was the interaction?"
                className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes *</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={`Describe what happened in this ${type}…`}
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!notes.trim() || loading}
            className="flex items-center gap-2 px-4 py-2 bg-brass text-white rounded-lg text-sm font-medium hover:bg-brass-light transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? 'Generating AI summary…' : 'Generate AI Summary'}
          </button>

          {/* AI Result */}
          {result && (
            <div className="space-y-3 animate-fade-in">
              {/* Summary */}
              <div className="bg-evergreen-tint border border-evergreen/20 rounded-xl p-4">
                <div className="text-xs font-semibold text-evergreen mb-1.5 uppercase tracking-wide">AI Summary</div>
                <p className="text-sm text-foreground">{result.summary}</p>
                {result.sentiment && sentimentConfig[result.sentiment] && (
                  <span className={cn('inline-flex mt-2 px-2 py-0.5 rounded text-xs font-medium', sentimentConfig[result.sentiment].bg, sentimentConfig[result.sentiment].color)}>
                    {sentimentConfig[result.sentiment].label}
                  </span>
                )}
              </div>

              {/* Action items */}
              {result.action_items?.length > 0 && (
                <div className="bg-brass-tint/50 border border-brass/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckSquare className="w-4 h-4 text-brass" />
                    <span className="text-xs font-semibold text-brass uppercase tracking-wide">Action Items</span>
                  </div>
                  <ul className="space-y-1.5">
                    {result.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-brass mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next step */}
              {result.next_step && (
                <div className="bg-sky-tint border border-sky/20 rounded-xl px-4 py-3">
                  <span className="text-xs font-semibold text-sky uppercase tracking-wide block mb-1">Next Step</span>
                  <p className="text-sm text-foreground">{result.next_step}</p>
                </div>
              )}

              {/* Status update */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium shrink-0">Update status to:</span>
                <div className="flex flex-wrap gap-1">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s === newStatus ? '' : s)}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-lg border transition-colors font-medium',
                        newStatus === s
                          ? 'border-evergreen bg-evergreen-tint text-evergreen'
                          : s === result.suggested_status
                            ? 'border-brass bg-brass-tint text-brass'
                            : 'border-hairline text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {s === result.suggested_status && '★ '}{s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                className="w-full py-2 bg-evergreen text-white rounded-lg text-sm font-medium hover:bg-evergreen-mid transition-colors"
              >
                Save Interaction{newStatus ? ` & Update Status → ${newStatus}` : ''}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}