import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Moon, Sun, AlertCircle, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const { theme, toggleTheme } = useAuthStore();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure application preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            Appearance
          </CardTitle>
          <CardDescription>Customize how the application looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              data-testid="switch-dark-mode"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Mock Mode
          </CardTitle>
          <CardDescription>This application is running in demo mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Demo Environment
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  All data is simulated. No real CVs are processed, and no actual job matches
                  are computed. This is for demonstration purposes only.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Model Configuration
          </CardTitle>
          <CardDescription>Matrix generation and matching model details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Matrix Generation Model</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Qwen</Badge>
                <span className="text-sm font-medium">latest</span>
              </div>
            </div>
            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Matching Algorithm</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Semantic</Badge>
                <span className="text-sm font-medium">v2.1</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Model Metadata</h4>
            <div className="text-sm space-y-1 p-3 rounded-md border bg-card">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model Provider</span>
                <span>Alibaba Cloud</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model Version</span>
                <span>Qwen 2.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Context Window</span>
                <span>128K tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>Jan 2026</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1 p-3 rounded-md border bg-card">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Application Version</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment</span>
              <Badge variant="outline">Development</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Status</span>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                Mocked
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
