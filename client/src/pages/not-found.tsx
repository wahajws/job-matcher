import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <FileQuestion className="w-10 h-10 text-muted-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-primary">404</h1>
            <h2 className="text-xl font-semibold mt-1">Page Not Found</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
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
