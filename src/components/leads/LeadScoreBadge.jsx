import { Zap, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Computes an AI score (0–100) for a lead based on available signals.
 * Higher is better.
 *
 * Breakdown:
 *  Stage progression   — 25 pts
 *  Budget (property value) — 20 pts
 *  Source quality      — 15 pts
 *  Recency             — 10 pts
 *  Contact details     — 10 pts
 *  Activity frequency  — 10 pts  (message_count, view_count)
 *  Engagement history  — 10 pts  (last_replied_at, follow_up_count)
 */
export function computeLeadScore(lead) {
  let score = 0;

  // Stage progression (weight: 25)
  const stageWeights = { new: 4, qualified: 12, viewing: 18, negotiation: 23, closed: 25 };
  score += stageWeights[(lead.stage || 'new').toLowerCase()] || 4;

  // Budget / property value (weight: 20)
  const budget = Number((lead.budget || '').split('|')[0]) || 0;
  if (budget >= 10_000_000) score += 20;
  else if (budget >= 5_000_000) score += 16;
  else if (budget >= 2_000_000) score += 12;
  else if (budget >= 1_000_000) score += 8;
  else if (budget > 0) score += 4;

  // Source quality (weight: 15)
  const sourceWeights = { referral: 15, whatsapp: 12, meta: 9, bayut: 7, dubizzle: 6 };
  score += sourceWeights[(lead.source || '').toLowerCase()] || 4;

  // Recency (weight: 10)
  const daysSince = lead.created_at
    ? Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86_400_000)
    : 999;
  if (daysSince <= 2) score += 10;
  else if (daysSince <= 7) score += 8;
  else if (daysSince <= 30) score += 5;
  else if (daysSince <= 90) score += 2;

  // Contact details (weight: 10)
  if (lead.email) score += 5;
  if (lead.phone || lead.mobile) score += 5;

  // Activity frequency (weight: 10) — message/view count signals intent
  const msgCount = lead.message_count || lead.messages_count || 0;
  const viewCount = lead.view_count || lead.views_count || 0;
  if (msgCount >= 10) score += 6;
  else if (msgCount >= 5) score += 4;
  else if (msgCount >= 2) score += 2;
  if (viewCount >= 5) score += 4;
  else if (viewCount >= 2) score += 2;
  else if (viewCount >= 1) score += 1;

  // Engagement history (weight: 10) — replied recently or has follow-ups
  const lastReplied = lead.last_replied_at || lead.last_response_at;
  if (lastReplied) {
    const daysAgo = Math.floor((Date.now() - new Date(lastReplied).getTime()) / 86_400_000);
    if (daysAgo <= 3) score += 7;
    else if (daysAgo <= 14) score += 4;
    else score += 1;
  }
  const followUps = lead.follow_up_count || lead.followup_count || 0;
  if (followUps >= 3) score += 3;
  else if (followUps >= 1) score += 2;

  return Math.min(100, score);
}

export function getScoreTier(score) {
  if (score >= 75) return 'hot';
  if (score >= 50) return 'warm';
  return 'cold';
}

export default function LeadScoreBadge({ score, showLabel = true }) {
  const tier = getScoreTier(score);

  const configs = {
    hot: {
      icon: Zap,
      bg: 'bg-terracotta-tint',
      text: 'text-terracotta',
      border: 'border-terracotta/30',
      label: 'High Potential',
      dot: 'bg-terracotta',
    },
    warm: {
      icon: TrendingUp,
      bg: 'bg-brass-tint',
      text: 'text-brass',
      border: 'border-brass/30',
      label: 'Warm',
      dot: 'bg-brass',
    },
    cold: {
      icon: Minus,
      bg: 'bg-surface-2',
      text: 'text-muted-foreground',
      border: 'border-hairline',
      label: 'Cold',
      dot: 'bg-muted-2',
    },
  };

  const cfg = configs[tier];
  const Icon = cfg.icon;

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold', cfg.bg, cfg.text, cfg.border)}>
      <Icon className="w-3 h-3" />
      <span className="font-mono">{score}</span>
      {showLabel && <span className="hidden sm:inline">· {cfg.label}</span>}
    </div>
  );
}