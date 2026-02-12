import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { reviewCv } from '@/api';
import type { CvReviewResult } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function CvReview() {
  const { toast } = useToast();
  const [targetRole, setTargetRole] = useState('');
  const [result, setResult] = useState<CvReviewResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => reviewCv(targetRole || undefined),
    onSuccess: (data) => {
      setResult(data);
      toast({ title: 'CV Review Complete', description: `Your CV scored ${data.score}/100` });
    },
    onError: (err: any) => {
      toast({ title: 'Review Failed', description: err.message, variant: 'destructive' });
    },
  });

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const scoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSearch className="w-6 h-6 text-primary" />
          AI CV Review
        </h1>
        <p className="text-muted-foreground mt-1">
          Get actionable suggestions to improve your CV with AI-powered analysis.
        </p>
      </div>

      {/* Trigger Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Review My CV
          </CardTitle>
          <CardDescription>
            We'll analyze your latest uploaded CV for weak action verbs, missing achievements,
            formatting issues, and keyword gaps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Target Role (optional)</label>
              <Input
                placeholder="e.g. Senior Frontend Developer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze CV
                </>
              )}
            </Button>
          </div>
          {mutation.isPending && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI is reviewing your CV… This may take 20-30 seconds.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Score Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${scoreColor(result.score)}`}>
                    {result.score}
                  </div>
                  <div className={`text-sm font-medium ${scoreColor(result.score)}`}>
                    {scoreLabel(result.score)}
                  </div>
                </div>
                <div className="flex-1">
                  <Progress value={result.score} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">{result.summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <div className="grid gap-4 md:grid-cols-2">
            {result.sections.map((section, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{section.section}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.issues.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-red-600 flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Issues
                      </p>
                      <ul className="text-sm space-y-1">
                        {section.issues.map((issue, i) => (
                          <li key={i} className="text-muted-foreground flex items-start gap-1.5">
                            <span className="text-red-400 mt-1">•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {section.suggestions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-green-600 flex items-center gap-1 mb-1">
                        <Lightbulb className="w-3.5 h-3.5" /> Suggestions
                      </p>
                      <ul className="text-sm space-y-1">
                        {section.suggestions.map((sug, i) => (
                          <li key={i} className="text-muted-foreground flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                            {sug}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Rewritten Bullets */}
          {result.rewrittenBullets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Improved Bullet Points</CardTitle>
                <CardDescription>
                  Here are AI-suggested rewrites for weak bullet points in your CV.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.rewrittenBullets.map((bullet, idx) => (
                  <div key={idx} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-red-600 border-red-200 mt-0.5 flex-shrink-0">
                        Before
                      </Badge>
                      <p className="text-sm line-through text-muted-foreground">
                        {bullet.original}
                      </p>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-green-100 text-green-700 border-green-200 mt-0.5 flex-shrink-0">
                        After
                      </Badge>
                      <p className="text-sm font-medium">{bullet.improved}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
