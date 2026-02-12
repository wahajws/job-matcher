import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPrivacySettings, updatePrivacySettings } from '@/api';
import type { ProfileVisibility, PrivacySettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Eye, EyeOff, Mail, Phone, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CandidatePrivacySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['privacy-settings'],
    queryFn: getPrivacySettings,
  });

  const mutation = useMutation({
    mutationFn: (data: PrivacySettings) => updatePrivacySettings(data),
    onSuccess: () => {
      toast({ title: 'Privacy settings updated' });
      queryClient.invalidateQueries({ queryKey: ['privacy-settings'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
    },
  });

  const updateField = (field: keyof PrivacySettings, value: any) => {
    if (!settings) return;
    mutation.mutate({ ...settings, [field]: value });
  };

  const visibilityOptions: { value: ProfileVisibility; label: string; description: string; icon: any }[] = [
    {
      value: 'public',
      label: 'Public',
      description: 'Your profile is visible to all companies in the talent pool',
      icon: Globe,
    },
    {
      value: 'applied_only',
      label: 'Applied Only',
      description: 'Your profile is only visible to companies where you applied',
      icon: Eye,
    },
    {
      value: 'hidden',
      label: 'Hidden',
      description: 'Your profile is hidden from all companies',
      icon: EyeOff,
    },
  ];

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Privacy Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Control who can see your profile and contact information
        </p>
      </div>

      {/* Profile Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Visibility</CardTitle>
          <CardDescription>
            Choose who can find and view your profile in the talent search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings?.profileVisibility || 'public'}
            onValueChange={(v) => updateField('profileVisibility', v as ProfileVisibility)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibilityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-3 space-y-2">
            {visibilityOptions.map((opt) => (
              <div
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                  settings?.profileVisibility === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent'
                }`}
              >
                <opt.icon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information Visibility</CardTitle>
          <CardDescription>
            Choose which contact details are visible to companies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label htmlFor="show-email" className="font-medium">
                  Show Email Address
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow companies to see your email on your profile
                </p>
              </div>
            </div>
            <Switch
              id="show-email"
              checked={settings?.showEmail || false}
              onCheckedChange={(checked) => updateField('showEmail', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label htmlFor="show-phone" className="font-medium">
                  Show Phone Number
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow companies to see your phone number on your profile
                </p>
              </div>
            </div>
            <Switch
              id="show-phone"
              checked={settings?.showPhone || false}
              onCheckedChange={(checked) => updateField('showPhone', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
