import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[50vh] w-full flex items-center justify-center p-6">
          <Card className="w-full max-w-lg">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </p>
              {this.state.error && (
                <details className="text-left text-xs bg-muted rounded-md p-3 mt-3">
                  <summary className="cursor-pointer font-medium">Error details</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-red-600 dark:text-red-400">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={this.handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
