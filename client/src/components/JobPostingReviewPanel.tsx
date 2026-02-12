import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { reviewJobPosting } from '@/api';
import type { JobPostingReviewResult } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';

interface JobPostingReviewPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  onApplySuggestions?: (data: { title: string; description: string }) => void;
}

export function JobPostingReviewPanel({
  open,
  onClose,
  title,
  description,
  mustHaveSkills,
  niceToHaveSkills,
  onApplySuggestions,
}: JobPostingReviewPanelProps) {
  const [result, setResult] = useState<JobPostingReviewResult | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      reviewJobPosting({ title, description, mustHaveSkills, niceToHaveSkills }),
    onSuccess: (data) => setResult(data),
  });

  const severityIcon = (sev: string) => {
    if (sev === 'high') return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
    if (sev === 'medium') return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
    return <Lightbulb className="w-3.5 h-3.5 text-blue-500" />;
  };

  const severityColor = (sev: string) => {
    if (sev === 'high') return 'border-red-200 bg-red-50 text-red-700';
    if (sev === 'medium') return 'border-yellow-200 bg-yellow-50 text-yellow-700';
    return 'border-blue-200 bg-blue-50 text-blue-700';
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Job Posting Review
          </SheetTitle>
          <SheetDescription>
            Get suggestions to improve clarity, inclusivity, and SEO.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {!result && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Reviewing…</>
                ) : (
                  <><Sparkles className="w-4 h-4" />Review Posting</>
                )}
              </Button>
              {mutation.isPending && (
                <p className="text-xs text-muted-foreground">15-30 seconds…</p>
              )}
            </div>
          )}

          {result && (
            <>
              {/* Score */}
              <div className="text-center">
                <div className={`text-4xl font-bold ${result.score >= 70 ? 'text-green-600' : result.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {result.score}/100
                </div>
                <Progress value={result.score} className="h-2 mt-2" />
              </div>

              <Separator />

              {/* Issues */}
              {result.issues.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Issues Found</h4>
                  <div className="space-y-2">
                    {result.issues.map((issue, i) => (
                      <div key={i} className={`text-sm p-2 rounded border ${severityColor(issue.severity)}`}>
                        <div className="flex items-start gap-2">
                          {severityIcon(issue.severity)}
                          <div>
                            <p className="font-medium">{issue.issue}</p>
                            <p className="text-xs mt-0.5 opacity-80">Fix: {issue.fix}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Suggestions</h4>
                  <ul className="space-y-1">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Inclusivity */}
              <div className="p-3 rounded border bg-muted/50">
                <h4 className="text-sm font-semibold flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Inclusivity Report
                </h4>
                <p className="text-sm text-muted-foreground">{result.inclusivityReport}</p>
              </div>

              {/* Improved title */}
              {result.improvedTitle && result.improvedTitle !== title && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Suggested Title</h4>
                  <p className="text-sm font-medium text-primary">{result.improvedTitle}</p>
                </div>
              )}

              {/* Apply All */}
              {onApplySuggestions && (
                <Button
                  className="w-full gap-2"
                  onClick={() =>
                    onApplySuggestions({
                      title: result.improvedTitle || title,
                      description: result.rewrittenDescription || description,
                    })
                  }
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Apply All Suggestions
                </Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
