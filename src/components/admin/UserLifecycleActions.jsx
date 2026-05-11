import { useState } from 'react';
import { updatePixxiUserLifecycle } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TRANSITIONS = {
  staged:          [{ to: 'pending_email', label: 'Send Invite', color: 'sky' }, { to: 'do_not_activate', label: 'Block', color: 'terracotta' }],
  pending_email:   [{ to: 'active', label: 'Activate', color: 'evergreen' }, { to: 'staged', label: 'Reset', color: 'muted' }, { to: 'do_not_activate', label: 'Block', color: 'terracotta' }],
  active:          [{ to: 'on_hold', label: 'Put on Hold', color: 'brass' }, { to: 'left_company', label: 'Left Company', color: 'terracotta' }],
  on_hold:         [{ to: 'active', label: 'Reactivate', color: 'evergreen' }, { to: 'left_company', label: 'Left Company', color: 'terracotta' }],
  left_company:    [{ to: 'do_not_activate', label: 'Block', color: 'terracotta' }, { to: 'staged', label: 'Re-stage', color: 'muted' }],
  do_not_activate: [{ to: 'staged', label: 'Re-stage', color: 'muted' }],
};

const BTN_COLORS = {
  evergreen:  'border-evergreen text-evergreen hover:bg-evergreen-tint',
  brass:      'border-brass text-brass hover:bg-brass-tint',
  sky:        'border-sky text-sky hover:bg-sky-tint',
  terracotta: 'border-terracotta text-terracotta hover:bg-terracotta-tint',
  muted:      'border-hairline-strong text-muted-foreground hover:bg-surface',
};

export default function UserLifecycleActions({ user, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const transitions = TRANSITIONS[user.lifecycle_status] || [];

  async function handleTransition(toStatus) {
    setLoading(true);
    await updatePixxiUserLifecycle(user.id, toStatus);
    onUpdated(user.id, toStatus);
    setLoading(false);
  }

  if (transitions.length === 0) return <span className="text-xs text-muted-2">—</span>;

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      {transitions.map(t => (
        <button
          key={t.to}
          disabled={loading}
          onClick={() => handleTransition(t.to)}
          className={cn(
            'text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors disabled:opacity-40',
            BTN_COLORS[t.color]
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}