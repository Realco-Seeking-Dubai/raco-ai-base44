import { Zap, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Computes an AI score (0–100) for a lead based on available signals.
 * Higher is better.
 */
export function computeLeadScore(lead) {
  let score = 0;

  // Stage progression (weight: 30)
  const stageWeights = { new: 5, qualified: 15, viewing: 22, negotiation: 28, closed: 30 };
  score += stageWeights[(lead.stage || 'new').toLowerCase()] || 5;

  // Budget (weight: 25) — higher budget = higher score
  const budget = Number((lead.budget || '').split('|')[0]) || 0;
  if (budget >= 10_000_000) score += 25;
  else if (budget >= 5_000_000) score += 20;
  else if (budget >= 2_000_000) score += 15;
  else if (budget >= 1_000_000) score += 10;
  else if (budget > 0) score += 5;

  // Source quality (weight: 20)
  const sourceWeights = { referral: 20, whatsapp: 16, meta: 12, bayut: 10, dubizzle: 8 };
  score += sourceWeights[(lead.source || '').toLowerCase()] || 5;

  // Recency (weight: 15) — leads created in last 7d score higher
  const daysSince = lead.created_at
    ? Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86_400_000)
    : 999;
  if (daysSince <= 2) score += 15;
  else if (daysSince <= 7) score += 12;
  else if (daysSince <= 30) score += 8;
  else if (daysSince <= 90) score += 3;

  // Has contact details (weight: 10)
  if (lead.email) score += 5;
  if (lead.phone) score += 5;

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