import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BottomNav from "./components/BottomNav";
import NotificationHandler from "./components/NotificationHandler";
import OnboardingFlow from "./components/OnboardingFlow";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Camera from "./pages/Camera";
import Radar from "./pages/Radar";
import Profile from "./pages/Profile";
import Venues from "./pages/Venues";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { useState, useEffect } from "react";
import { useAuth } from "./_core/hooks/useAuth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/feed" component={Feed} />
      <Route path="/camera" component={Camera} />
      <Route path="/radar" component={Radar} />
      <Route path="/venues" component={Venues} />
      <Route path="/profile" component={Profile} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent({ onboardingComplete, setOnboardingComplete }: { onboardingComplete: boolean, setOnboardingComplete: (v: boolean) => void }) {
  const [location] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  // Allow direct access to login/register pages without onboarding
  const isAuthPage = location === "/login" || location === "/register";
  
  // Show onboarding only if not complete AND not authenticated AND not on auth page
  const showOnboarding = !onboardingComplete && !isAuthenticated && !isAuthPage && !authLoading;
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terracotta" />
      </div>
    );
  }
  
  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setOnboardingComplete(true)} />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <NotificationHandler />
          <div className="app-shell">
            <Router />
            <BottomNav />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    // Check localStorage on initial load
    const stored = localStorage.getItem("onboardingComplete");
    return stored === "true";
  });

  // Persist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("onboardingComplete", String(onboardingComplete));
  }, [onboardingComplete]);

  return <AppContent onboardingComplete={onboardingComplete} setOnboardingComplete={setOnboardingComplete} />;
}

export default App;
