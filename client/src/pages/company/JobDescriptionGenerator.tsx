import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { generateJobDescription, createCompanyJob } from '@/api';
import type { GeneratedJobDescription } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  Wand2,
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react';

export default function JobDescriptionGenerator() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [seniority, setSeniority] = useState('mid');
  const [locationType, setLocationType] = useState('remote');
  const [industry, setIndustry] = useState('');
  const [result, setResult] = useState<GeneratedJobDescription | null>(null);
  const [editedDescription, setEditedDescription] = useState('');

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const generateMutation = useMutation({
    mutationFn: () =>
      generateJobDescription({
        title,
        skills: skills.length > 0 ? skills : undefined,
        seniorityLevel: seniority,
        locationType,
        industry: industry || undefined,
      }),
    onSuccess: (data) => {
      setResult(data);
      setEditedDescription(data.description);
      toast({ title: 'Job Description Generated!' });
    },
    onError: (err: any) => {
      toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      createCompanyJob({
        title,
        description: editedDescription,
        mustHaveSkills: result?.mustHaveSkills || [],
        niceToHaveSkills: result?.niceToHaveSkills || [],
        seniorityLevel: result?.suggestedSeniority || seniority,
        minYearsExperience: result?.suggestedMinYears || 0,
        locationType,
        status: 'draft',
      }),
    onSuccess: (job) => {
      toast({ title: 'Job Created as Draft!' });
      setLocation(`/company/jobs/${job.id}`);
    },
    onError: (err: any) => {
      toast({ title: 'Failed to create job', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-primary" />
          AI Job Description Generator
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate a complete job posting from just a title and a few keywords.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Create with AI</CardTitle>
          <CardDescription>
            Enter the basics and AI will generate a complete, professional job description.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Job Title *</label>
            <Input
              placeholder="e.g. Senior React Developer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Key Skills</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill and press Enter"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <Button variant="outline" size="icon" onClick={addSkill}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1 pr-1">
                    {s}
                    <button onClick={() => removeSkill(s)} className="ml-1 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Seniority</label>
              <Select value={seniority} onValueChange={setSeniority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid">Mid-Level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Location Type</label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Industry</label>
              <Input
                placeholder="e.g. FinTech, Healthcare"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!title || generateMutation.isPending}
            className="gap-2"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate Description</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Generated Job Description</CardTitle>
                <Button
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  className="gap-2"
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Create Job Draft
                </Button>
              </div>
              <CardDescription>
                Edit the generated description before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                className="min-h-[400px] text-sm"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium mb-1">Must-Have Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.mustHaveSkills.map((s) => (
                      <Badge key={s} variant="default">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Nice-To-Have Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.niceToHaveSkills.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Suggested seniority: <strong className="capitalize">{result.suggestedSeniority}</strong></span>
                <span>Min years: <strong>{result.suggestedMinYears}</strong></span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
