import { cn } from '@/lib/utils';
import { getScoreColor, getScoreBgColor } from '@/utils/helpers';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ScoreBadge({ score, size = 'md', showLabel = false }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 min-w-[36px]',
    md: 'text-sm px-2.5 py-1 min-w-[44px]',
    lg: 'text-base px-3 py-1.5 min-w-[52px]',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'font-semibold rounded-md text-center inline-flex items-center justify-center',
          getScoreColor(score),
          getScoreBgColor(score),
          sizeClasses[size]
        )}
        data-testid="score-badge"
      >
        {score}
      </span>
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Low'}
        </span>
      )}
    </div>
  );
}
