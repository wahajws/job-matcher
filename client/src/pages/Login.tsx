import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { Role } from '@/types';

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated, user } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('admin');

  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation(user.role === 'admin' ? '/admin/dashboard' : '/candidate/dashboard');
    }
  }, [isAuthenticated, user, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    
    login(name, email, role);
    setLocation(role === 'admin' ? '/admin/dashboard' : '/candidate/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Sparkles className="w-7 h-7" />
            </div>
          </div>
          <CardTitle className="text-2xl">CV Matcher</CardTitle>
          <CardDescription className="text-sm">
            AI-powered CV to Job Matching Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="input-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-3">
              <Label>Role</Label>
              <RadioGroup
                value={role}
                onValueChange={(value) => setRole(value as Role)}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="role-admin"
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    role === 'admin'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="admin" id="role-admin" className="sr-only" />
                  <span className="text-2xl mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                  <span className="font-medium text-sm">Admin</span>
                  <span className="text-xs text-muted-foreground">Manage CVs & Jobs</span>
                </Label>
                <Label
                  htmlFor="role-candidate"
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    role === 'candidate'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="candidate" id="role-candidate" className="sr-only" />
                  <span className="text-2xl mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  <span className="font-medium text-sm">Candidate</span>
                  <span className="text-xs text-muted-foreground">Find matching jobs</span>
                </Label>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              size="lg"
              data-testid="button-continue"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            This is a demo application. No real authentication is required.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
