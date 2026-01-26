import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect } from "react";

import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

import AdminDashboard from "@/pages/admin/Dashboard";
import CvList from "@/pages/admin/CvList";
import CvUpload from "@/pages/admin/CvUpload";
import CvDetail from "@/pages/admin/CvDetail";
import JobList from "@/pages/admin/JobList";
import JobNew from "@/pages/admin/JobNew";
import JobDetail from "@/pages/admin/JobDetail";
import Settings from "@/pages/admin/Settings";

import CandidateDashboard from "@/pages/candidate/Dashboard";
import CandidateProfile from "@/pages/candidate/Profile";
import CandidateJobList from "@/pages/candidate/JobList";
import CandidateJobDetail from "@/pages/candidate/JobDetail";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user?.role !== "admin") {
      setLocation("/candidate/dashboard");
    }
  }, [user?.role, setLocation]);

  if (user?.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}

function CandidateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user?.role !== "candidate") {
      setLocation("/admin/dashboard");
    }
  }, [user?.role, setLocation]);

  if (user?.role !== "candidate") {
    return null;
  }

  return <>{children}</>;
}

function HomeRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    } else if (user?.role === "admin") {
      setLocation("/admin/dashboard");
    } else {
      setLocation("/candidate/dashboard");
    }
  }, [isAuthenticated, user?.role, setLocation]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={Login} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard">
        <ProtectedRoute>
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/cvs">
        <ProtectedRoute>
          <AdminRoute>
            <CvList />
          </AdminRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/cvs/upload">
        <ProtectedRoute>
          <AdminRoute>
            <CvUpload />
          </AdminRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/cvs/:id">
        <ProtectedRoute>
          <AdminRoute>
            <CvDetail />
          </AdminRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/jobs">
        <ProtectedRoute>
          <AdminRoute>
            <JobList />
          </AdminRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/jobs/new">
        <ProtectedRoute>
          <AdminRoute>
            <JobNew />
          </AdminRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/jobs/:id">
        <ProtectedRoute>
          <AdminRoute>
            <JobDetail />
          </AdminRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute>
          <AdminRoute>
            <Settings />
          </AdminRoute>
        </ProtectedRoute>
      </Route>

      {/* Candidate Routes */}
      <Route path="/candidate/dashboard">
        <ProtectedRoute>
          <CandidateRoute>
            <CandidateDashboard />
          </CandidateRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/candidate/profile">
        <ProtectedRoute>
          <CandidateRoute>
            <CandidateProfile />
          </CandidateRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/candidate/jobs">
        <ProtectedRoute>
          <CandidateRoute>
            <CandidateJobList />
          </CandidateRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/candidate/jobs/:id">
        <ProtectedRoute>
          <CandidateRoute>
            <CandidateJobDetail />
          </CandidateRoute>
        </ProtectedRoute>
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { theme } = useAuthStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
