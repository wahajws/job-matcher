import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { createJobFromUrl } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function JobNewFromUrl() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [publish, setPublish] = useState(true);
  const [extractedInfo, setExtractedInfo] = useState<any>(null);

  const extractMutation = useMutation({
    mutationFn: (jobUrl: string) => createJobFromUrl(jobUrl, publish ? 'published' : 'draft'),
    onSuccess: (job) => {
      toast({
        title: 'Job created successfully',
        description: `Job "${job.title}" has been created from the URL.`,
      });
      setLocation(`/admin/jobs/${job.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create job',
        description: error.message || 'An error occurred while processing the job URL.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter a valid job posting URL.',
        variant: 'destructive',
      });
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL (e.g., https://example.com/job-posting)',
        variant: 'destructive',
      });
      return;
    }

    extractMutation.mutate(url);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/jobs">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Job from URL</h1>
          <p className="text-muted-foreground">
            Extract job information from a job posting URL using AI
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Posting URL</CardTitle>
          <CardDescription>
            Enter the URL of a job posting page. Our AI will extract the job title, description,
            requirements, location, and skills automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Job Posting URL</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/jobs/software-engineer"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={extractMutation.isPending}
                  className="flex-1"
                  data-testid="input-url"
                />
                <Button
                  type="submit"
                  disabled={extractMutation.isPending || !url.trim()}
                  data-testid="button-extract"
                >
                  {extractMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Extract & Create
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The AI will fetch the page content and extract structured job information.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div>
                <Label htmlFor="publish" className="text-base font-medium">
                  Publish Immediately
                </Label>
                <p className="text-sm text-muted-foreground">
                  Publishing will generate the Job Matrix and start matching candidates
                </p>
              </div>
              <Switch
                id="publish"
                checked={publish}
                onCheckedChange={setPublish}
                disabled={extractMutation.isPending}
                data-testid="switch-publish"
              />
            </div>

            {extractMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {extractMutation.error instanceof Error
                    ? extractMutation.error.message
                    : 'Failed to extract job information from the URL. Please check the URL and try again.'}
                </AlertDescription>
              </Alert>
            )}

            {extractMutation.isPending && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>Fetching job posting content...</p>
                    <p className="text-sm text-muted-foreground">
                      Extracting job information using AI. This may take a few moments.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              1
            </div>
            <div>
              <p className="font-medium text-foreground">Fetch Content</p>
              <p>We fetch the HTML content from the job posting URL</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              2
            </div>
            <div>
              <p className="font-medium text-foreground">Extract Text</p>
              <p>We extract clean text from the HTML, removing formatting and scripts</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              3
            </div>
            <div>
              <p className="font-medium text-foreground">AI Processing</p>
              <p>
                Our AI (Alibaba Qwen) analyzes the content and extracts structured information:
                title, description, skills, location, experience requirements, and more
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              4
            </div>
            <div>
              <p className="font-medium text-foreground">Create Job</p>
              <p>
                The job is created in the system. If published, the Job Matrix is automatically
                generated for candidate matching.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/admin/jobs">
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
        <Link href="/admin/jobs/new">
          <Button variant="outline" type="button">
            Create Manually Instead
          </Button>
        </Link>
      </div>
    </div>
  );
}
