import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { tailorCv } from '@/api';
import type { CvTailorResult } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, CheckCircle2 } from 'lucide-react';

interface CvTailorModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
}

export function CvTailorModal({ open, onClose, jobId, jobTitle }: CvTailorModalProps) {
  const [result, setResult] = useState<CvTailorResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => tailorCv(jobId),
    onSuccess: (data) => setResult(data),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Tailor CV for {jobTitle}
          </DialogTitle>
          <DialogDescription>
            AI will suggest changes to emphasize your most relevant skills for this job.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="flex flex-col items-center py-8 gap-4">
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Click below to analyze your CV against this job posting. We'll show you exactly what to change.
            </p>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Analyzing…</>
              ) : (
                <><Sparkles className="w-4 h-4" />Analyze & Tailor</>
              )}
            </Button>
            {mutation.isPending && (
              <p className="text-xs text-muted-foreground">This may take 15-30 seconds.</p>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Match improvement */}
            <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {result.matchImprovement.before}%
                </p>
                <p className="text-xs text-muted-foreground">Before</p>
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {result.matchImprovement.after}%
                </p>
                <p className="text-xs text-green-600">After</p>
              </div>
            </div>

            {/* Key Changes */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Key Changes</h4>
              <ul className="space-y-1.5">
                {result.keyChanges.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* Section details */}
            {result.tailoredSections.map((section, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <h4 className="text-sm font-semibold mb-1.5">{section.section}</h4>
                <ul className="space-y-1">
                  {section.changes.map((ch, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary">•</span>
                      {ch}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
