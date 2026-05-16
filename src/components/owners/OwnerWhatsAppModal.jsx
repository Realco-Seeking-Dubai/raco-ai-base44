import { useState } from 'react';
import { X, MessageCircle, Copy, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const TEMPLATES = [
  {
    id: 'follow_up',
    label: 'Property Follow-Up',
    build: (owner, project) =>
      `Hi ${owner.owner_name?.split(' ')[0] || 'there'}, I'm reaching out regarding your property${project ? ` in ${project}` : ''}${owner.property_id ? ` (Unit: ${owner.property_id})` : ''}. I have some exciting market updates that may be relevant for you. Would you be open to a quick chat? 😊`,
  },
  {
    id: 'listing_offer',
    label: 'Listing Opportunity',
    build: (owner, project) =>
      `Hello ${owner.owner_name?.split(' ')[0] || 'there'}, we've seen strong buyer demand${project ? ` for properties in ${project}` : ' in your area'} recently. If you're considering selling or renting${owner.property_id ? ` Unit ${owner.property_id}` : ''}, I'd love to share what we're seeing. Let me know if you'd like a free market valuation!`,
  },
  {
    id: 'reconnect',
    label: 'Reconnect / Check-In',
    build: (owner) =>
      `Hi ${owner.owner_name?.split(' ')[0] || 'there'}, hope you're doing well! It's been a while since we last connected. I wanted to check in and see if there's anything I can help you with regarding your property. Feel free to reach out anytime. 🏡`,
  },
];

function formatPhone(mobile) {
  if (!mobile) return null;
  // Strip non-digits, ensure international format
  let digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits.startsWith('971') && digits.startsWith('05')) digits = '971' + digits.slice(1);
  return digits;
}

export default function OwnerWhatsAppModal({ owner, project, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const phone = formatPhone(owner.mobile);
  const message = customMessage || selectedTemplate.build(owner, project);
  const waUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : null;

  function handleCopy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline bg-card">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">WhatsApp Outreach</div>
              <div className="text-xs text-muted-foreground">{owner.owner_name}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Phone warning */}
          {!phone && (
            <div className="text-xs text-terracotta bg-terracotta-tint border border-terracotta/20 rounded-lg px-3 py-2">
              No phone number on record — you can still copy the message.
            </div>
          )}

          {/* Template selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Template</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTemplate(t); setCustomMessage(''); }}
                  className={cn(
                    'text-xs px-2 py-1.5 rounded-lg border transition-colors font-medium text-center',
                    selectedTemplate.id === t.id
                      ? 'border-evergreen bg-evergreen-tint text-evergreen'
                      : 'border-hairline bg-card text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message editor */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Message</label>
            <textarea
              value={customMessage || selectedTemplate.build(owner, project)}
              onChange={e => setCustomMessage(e.target.value)}
              rows={5}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-hairline bg-surface focus:outline-none focus:border-evergreen transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-hairline bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-evergreen" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={waUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={!waUrl ? e => e.preventDefault() : undefined}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                waUrl
                  ? 'bg-[#25D366] text-white hover:bg-[#1ebe5a]'
                  : 'bg-surface text-muted-foreground cursor-not-allowed border border-hairline'
              )}
            >
              <MessageCircle className="w-4 h-4" />
              Open in WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}