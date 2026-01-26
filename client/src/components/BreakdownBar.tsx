import type { MatchBreakdown } from '@/types';
import { cn } from '@/lib/utils';

interface BreakdownBarProps {
  breakdown: MatchBreakdown;
  compact?: boolean;
}

const categories = [
  { key: 'skills', label: 'Skills', color: 'bg-blue-500' },
  { key: 'experience', label: 'Experience', color: 'bg-emerald-500' },
  { key: 'domain', label: 'Domain', color: 'bg-purple-500' },
  { key: 'location', label: 'Location', color: 'bg-amber-500' },
] as const;

export function BreakdownBar({ breakdown, compact = false }: BreakdownBarProps) {
  if (compact) {
    return (
      <div className="flex gap-1" data-testid="breakdown-bar-compact">
        {categories.map(({ key, color }) => (
          <div
            key={key}
            className="h-1.5 w-8 rounded-full bg-muted overflow-hidden"
            title={`${key}: ${breakdown[key]}%`}
          >
            <div
              className={cn('h-full rounded-full', color)}
              style={{ width: `${breakdown[key]}%` }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="breakdown-bar">
      {categories.map(({ key, label, color }) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{breakdown[key]}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', color)}
              style={{ width: `${breakdown[key]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
