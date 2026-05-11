import { cn } from '@/lib/utils';

const configs = {
  // Lead / contact status
  new: { label: 'New', className: 'bg-sky-tint text-sky' },
  hot: { label: 'Hot', className: 'bg-terracotta-tint text-terracotta' },
  warm: { label: 'Warm', className: 'bg-brass-tint text-brass' },
  cold: { label: 'Cold', className: 'bg-surface-2 text-muted-foreground' },
  // Owner status
  approached: { label: 'Approached', className: 'bg-brass-tint text-brass' },
  responded: { label: 'Responded', className: 'bg-evergreen-tint text-evergreen' },
  listed: { label: 'Listed', className: 'bg-evergreen/20 text-evergreen' },
  declined: { label: 'Declined', className: 'bg-terracotta-tint text-terracotta' },
  // Deal stages
  offer: { label: 'Offer', className: 'bg-brass-tint text-brass' },
  negotiation: { label: 'Negotiation', className: 'bg-sky-tint text-sky' },
  won: { label: 'Won', className: 'bg-evergreen-tint text-evergreen' },
  lost: { label: 'Lost', className: 'bg-terracotta-tint text-terracotta' },
  mou: { label: 'MOU', className: 'bg-sky-tint text-sky' },
  noc: { label: 'NOC', className: 'bg-brass-tint text-brass' },
  transfer: { label: 'Transfer', className: 'bg-evergreen-tint text-evergreen' },
  // Compliance
  approved: { label: 'Approved', className: 'bg-evergreen-tint text-evergreen' },
  vetoed: { label: 'Vetoed', className: 'bg-terracotta-tint text-terracotta' },
  logged: { label: 'Logged', className: 'bg-surface-2 text-muted-foreground' },
  // User lifecycle
  active: { label: 'Active', className: 'bg-evergreen-tint text-evergreen' },
  inactive: { label: 'Inactive', className: 'bg-surface-2 text-muted-foreground' },
  staged: { label: 'Staged', className: 'bg-brass-tint text-brass' },
  pending_email: { label: 'Pending Email', className: 'bg-sky-tint text-sky' },
  // Generic
  draft: { label: 'Draft', className: 'bg-surface-2 text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-sky-tint text-sky' },
  client: { label: 'Client', className: 'bg-evergreen/20 text-evergreen font-semibold' },
  buyer: { label: 'Buyer', className: 'bg-sky-tint text-sky' },
  seller: { label: 'Seller', className: 'bg-brass-tint text-brass' },
  both: { label: 'Buyer + Seller', className: 'bg-evergreen-tint text-evergreen' },
};

export default function StatusBadge({ status, label, className }) {
  const cfg = configs[status?.toLowerCase()] || { label: label || status || '—', className: 'bg-surface-2 text-muted-foreground' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium', cfg.className, className)}>
      {label || cfg.label}
    </span>
  );
}