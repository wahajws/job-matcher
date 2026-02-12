import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { generateCoverLetter, getMyApplications, getSavedJobs, browseJobs } from '@/api';
import type { CoverLetterResult, CoverLetterTone } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Sparkles,
  Loader2,
  Copy,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export default function CoverLetterGenerator() {
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState('');
  const [tone, setTone] = useState<CoverLetterTone>('formal');
  const [result, setResult] = useState<CoverLetterResult | null>(null);
  const [editedLetter, setEditedLetter] = useState('');
  const [activeVersion, setActiveVersion] = useState(0);
  const [copied, setCopied] = useState(false);

  // Fetch jobs the candidate applied to or saved
  const { data: applications } = useQuery({
    queryKey: ['my-applications-for-cl'],
    queryFn: () => getMyApplications(),
  });

  const { data: savedJobs } = useQuery({
    queryKey: ['saved-jobs-for-cl'],
    queryFn: getSavedJobs,
  });

  // Combined list of jobs
  const availableJobs = [
    ...(applications || [])
      .filter((a) => a.job)
      .map((a) => ({
        id: a.job!.id,
        title: a.job!.title,
        company: a.job!.companyProfile?.companyName || a.job!.company || '',
        source: 'Applied',
      })),
    ...(savedJobs || [])
      .filter((s) => s.job)
      .map((s) => ({
        id: s.job!.id,
        title: s.job!.title,
        company: (s.job as any)?.companyProfile?.companyName || '',
        source: 'Saved',
      })),
  ].filter((j, i, arr) => arr.findIndex((x) => x.id === j.id) === i);

  const mutation = useMutation({
    mutationFn: () => generateCoverLetter(selectedJobId, tone),
    onSuccess: (data) => {
      setResult(data);
      setEditedLetter(data.coverLetter);
      setActiveVersion(0);
      toast({ title: 'Cover Letter Generated!' });
    },
    onError: (err: any) => {
      toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(editedLetter);
    setCopied(true);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const switchVersion = (idx: number) => {
    setActiveVersion(idx);
    if (idx === 0 && result) {
      setEditedLetter(result.coverLetter);
    } else if (result && result.alternateVersions[idx - 1]) {
      setEditedLetter(result.alternateVersions[idx - 1]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          AI Cover Letter Generator
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate a tailored cover letter based on your CV and a specific job posting.
        </p>
      </div>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate Cover Letter</CardTitle>
          <CardDescription>
            Select a job from your applications or saved jobs, choose a tone, and let AI write it for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Select Job</label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a job…" />
                </SelectTrigger>
                <SelectContent>
                  {availableJobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title} {j.company && `— ${j.company}`}{' '}
                      <span className="text-xs text-muted-foreground">({j.source})</span>
                    </SelectItem>
                  ))}
                  {availableJobs.length === 0 && (
                    <SelectItem value="_none" disabled>
                      No jobs found — apply or save a job first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Tone</label>
              <Select value={tone} onValueChange={(v) => setTone(v as CoverLetterTone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!selectedJobId || mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Cover Letter
              </>
            )}
          </Button>
          {mutation.isPending && (
            <p className="text-sm text-muted-foreground">
              AI is crafting your cover letter… This may take 15-30 seconds.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Your Cover Letter</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={handleCopy}>
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </Button>
              </div>
            </div>
            {result.alternateVersions.length > 0 && (
              <div className="flex gap-2 mt-2">
                <Badge
                  variant={activeVersion === 0 ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => switchVersion(0)}
                >
                  Full Version
                </Badge>
                {result.alternateVersions.map((_, i) => (
                  <Badge
                    key={i}
                    variant={activeVersion === i + 1 ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => switchVersion(i + 1)}
                  >
                    Short Version {i + 1}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[400px] font-mono text-sm"
              value={editedLetter}
              onChange={(e) => setEditedLetter(e.target.value)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
