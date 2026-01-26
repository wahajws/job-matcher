import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createJob } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, X } from 'lucide-react';
import type { LocationType, SeniorityLevel } from '@/types';

const jobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  department: z.string().min(2, 'Department is required'),
  locationType: z.enum(['onsite', 'hybrid', 'remote']),
  country: z.string().min(2, 'Country is required'),
  city: z.string().min(2, 'City is required'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  minYearsExperience: z.number().min(0).max(20),
  seniorityLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']),
  publish: z.boolean(),
});

type JobFormData = z.infer<typeof jobSchema>;

export default function JobNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mustHaveSkills, setMustHaveSkills] = useState<string[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [niceSkillInput, setNiceSkillInput] = useState('');

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      department: '',
      locationType: 'hybrid',
      country: 'US',
      city: '',
      description: '',
      minYearsExperience: 3,
      seniorityLevel: 'mid',
      publish: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: JobFormData) =>
      createJob({
        title: data.title,
        department: data.department,
        locationType: data.locationType as LocationType,
        country: data.country,
        city: data.city,
        description: data.description,
        mustHaveSkills,
        niceToHaveSkills,
        minYearsExperience: data.minYearsExperience,
        seniorityLevel: data.seniorityLevel as SeniorityLevel,
        status: data.publish ? 'published' : 'draft',
      }),
    onSuccess: (job) => {
      toast({ title: 'Job created successfully' });
      setLocation(`/admin/jobs/${job.id}`);
    },
    onError: () => {
      toast({ title: 'Failed to create job', variant: 'destructive' });
    },
  });

  const addSkill = (type: 'must' | 'nice') => {
    const input = type === 'must' ? skillInput : niceSkillInput;
    const setInput = type === 'must' ? setSkillInput : setNiceSkillInput;
    const skills = type === 'must' ? mustHaveSkills : niceToHaveSkills;
    const setSkills = type === 'must' ? setMustHaveSkills : setNiceToHaveSkills;

    if (input.trim() && !skills.includes(input.trim())) {
      setSkills([...skills, input.trim()]);
      setInput('');
    }
  };

  const removeSkill = (skill: string, type: 'must' | 'nice') => {
    const setSkills = type === 'must' ? setMustHaveSkills : setNiceToHaveSkills;
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const onSubmit = (data: JobFormData) => {
    createMutation.mutate(data);
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
          <h1 className="text-2xl font-bold">Create Job</h1>
          <p className="text-muted-foreground">Post a new job opening</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Senior Software Engineer" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Engineering" {...field} data-testid="input-department" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="seniorityLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seniority Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-seniority">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="mid">Mid</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="principal">Principal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="locationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-location-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="onsite">Onsite</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-country">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="IN">India</SelectItem>
                          <SelectItem value="SG">Singapore</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., San Francisco" {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the role, responsibilities, and requirements..."
                        className="min-h-[150px]"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="minYearsExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Years of Experience</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-experience"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Must-Have Skills</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('must'))}
                    data-testid="input-must-skill"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addSkill('must')}
                    data-testid="button-add-must-skill"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {mustHaveSkills.map((skill) => (
                    <Badge key={skill} variant="default" className="gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill, 'must')}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel>Nice-to-Have Skills</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    value={niceSkillInput}
                    onChange={(e) => setNiceSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('nice'))}
                    data-testid="input-nice-skill"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addSkill('nice')}
                    data-testid="button-add-nice-skill"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {niceToHaveSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill, 'nice')}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="publish"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Publish Immediately</FormLabel>
                      <FormDescription>
                        Publishing will generate the Job Matrix and start matching candidates
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-publish"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/admin/jobs">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              data-testid="button-create"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Job'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
