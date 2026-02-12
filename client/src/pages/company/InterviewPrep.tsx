import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { generateInterviewQuestions, getCompanyJobs } from '@/api';
import type { InterviewQuestionsResult } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  MessageCircleQuestion,
  Sparkles,
  Loader2,
  Copy,
  CheckCircle2,
  Printer,
} from 'lucide-react';

export default function InterviewPrep() {
  const { toast } = useToast();
  const [jobId, setJobId] = useState('');
  const [difficulty, setDifficulty] = useState('mixed');
  const [types, setTypes] = useState<string[]>(['technical', 'behavioral', 'situational']);
  const [result, setResult] = useState<InterviewQuestionsResult | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: jobs } = useQuery({
    queryKey: ['company-jobs-for-iq'],
    queryFn: () => getCompanyJobs(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      generateInterviewQuestions({ jobId, questionTypes: types, difficulty }),
    onSuccess: (data) => {
      setResult(data);
      toast({ title: 'Interview Questions Generated!' });
    },
    onError: (err: any) => {
      toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
    },
  });

  const toggleType = (type: string) => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleCopyAll = () => {
    if (!result) return;
    const text = result.questions
      .map(
        (q, i) =>
          `${i + 1}. [${q.type}] (${q.difficulty})\nQ: ${q.question}\nExpected: ${q.expectedAnswer}\nScoring: ${q.scoringCriteria}\nSkill: ${q.relatedSkill}`
      )
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'All questions copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'technical': return 'bg-blue-100 text-blue-700';
      case 'behavioral': return 'bg-purple-100 text-purple-700';
      case 'situational': return 'bg-amber-100 text-amber-700';
      case 'culture-fit': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'junior': return 'bg-green-50 text-green-600';
      case 'mid': return 'bg-yellow-50 text-yellow-600';
      case 'senior': return 'bg-orange-50 text-orange-600';
      case 'lead': return 'bg-red-50 text-red-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircleQuestion className="w-6 h-6 text-primary" />
          AI Interview Prep
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate tailored interview questions based on job requirements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate Questions</CardTitle>
          <CardDescription>Select a job and configure question preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Job</label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job…" />
                </SelectTrigger>
                <SelectContent>
                  {(jobs || []).map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid">Mid-Level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Question Types</label>
            <div className="flex flex-wrap gap-4">
              {['technical', 'behavioral', 'situational', 'culture-fit'].map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={types.includes(t)}
                    onCheckedChange={() => toggleType(t)}
                  />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!jobId || mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate Questions</>
            )}
          </Button>
          {mutation.isPending && (
            <p className="text-sm text-muted-foreground">
              AI is generating questions… 15-30 seconds.
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {result.questions.length} Interview Questions
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={handleCopyAll}>
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy All'}
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.questions.map((q, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    {idx + 1}. {q.question}
                  </h3>
                  <div className="flex gap-1 flex-shrink-0">
                    <Badge className={typeColor(q.type)} variant="outline">
                      {q.type}
                    </Badge>
                    <Badge className={difficultyColor(q.difficulty)} variant="outline">
                      {q.difficulty}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">What to look for:</p>
                  <p className="text-sm">{q.expectedAnswer}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Scoring criteria:</p>
                  <p className="text-sm">{q.scoringCriteria}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Skill: {q.relatedSkill}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
