import { cn } from '@/lib/utils';
import { getStatusColor } from '@/utils/helpers';

interface StatusChipProps {
  status: string;
  className?: string;
}

const statusLabels: Record<string, string> = {
  uploaded: 'Uploaded',
  parsing: 'Parsing',
  matrix_ready: 'Matrix Ready',
  failed: 'Failed',
  needs_review: 'Needs Review',
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
  pending: 'Pending',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
};

export function StatusChip({ status, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
        getStatusColor(status),
        className
      )}
      data-testid={`status-chip-${status}`}
    >
      {statusLabels[status] || status}
    </span>
  );
}
