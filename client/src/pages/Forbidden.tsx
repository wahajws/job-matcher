import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Forbidden() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-red-500">403</h1>
            <h2 className="text-xl font-semibold mt-1">Access Denied</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
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
