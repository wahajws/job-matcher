import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { generateCandidateSummary } from '@/api';
import type { CandidateSummaryResult } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  Loader2,
  Copy,
  CheckCircle2,
  ThumbsUp,
  AlertCircle,
  Target,
} from 'lucide-react';

interface CandidateSummaryCardProps {
  candidateId: string;
  jobId: string;
  candidateName: string;
}

export function CandidateSummaryCard({
  candidateId,
  jobId,
  candidateName,
}: CandidateSummaryCardProps) {
  const { toast } = useToast();
  const [result, setResult] = useState<CandidateSummaryResult | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () => generateCandidateSummary(candidateId, jobId),
    onSuccess: (data) => {
      setResult(data);
      toast({ title: 'Summary Generated!' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const handleCopy = () => {
    if (!result) return;
    const text = [
      `Candidate Summary: ${candidateName}`,
      '',
      result.summary,
      '',
      'Strengths:',
      ...result.strengths.map((s) => `• ${s}`),
      '',
      'Concerns:',
      ...result.concerns.map((c) => `• ${c}`),
      '',
      'Fit Reasoning:',
      result.fitReasoning,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
        ) : (
          <><Sparkles className="w-3.5 h-3.5" />AI Summary</>
        )}
      </Button>
    );
  }

  return (
    <Card className="mt-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Summary
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleCopy}>
            {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{result.summary}</p>

        <div>
          <p className="font-medium text-green-700 flex items-center gap-1 mb-1">
            <ThumbsUp className="w-3.5 h-3.5" /> Strengths
          </p>
          <ul className="space-y-0.5">
            {result.strengths.map((s, i) => (
              <li key={i} className="text-muted-foreground flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-medium text-amber-700 flex items-center gap-1 mb-1">
            <AlertCircle className="w-3.5 h-3.5" /> Concerns
          </p>
          <ul className="space-y-0.5">
            {result.concerns.map((c, i) => (
              <li key={i} className="text-muted-foreground flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-2 rounded bg-primary/5 border">
          <p className="font-medium flex items-center gap-1 mb-0.5">
            <Target className="w-3.5 h-3.5 text-primary" /> Fit Reasoning
          </p>
          <p className="text-muted-foreground">{result.fitReasoning}</p>
        </div>
      </CardContent>
    </Card>
  );
}
