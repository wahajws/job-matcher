import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ServerCrash, RefreshCw, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function ServerError() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <ServerCrash className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-orange-500">500</h1>
            <h2 className="text-xl font-semibold mt-1">Server Error</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Something went wrong on our end. Our team has been notified. Please try again in a moment.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => setLocation("/")}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
