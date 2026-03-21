import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BottomNav from "./components/BottomNav";
import NotificationHandler from "./components/NotificationHandler";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Camera from "./pages/Camera";
import Radar from "./pages/Radar";
import Profile from "./pages/Profile";
import Venues from "./pages/Venues";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/feed" component={Feed} />
      <Route path="/camera" component={Camera} />
      <Route path="/radar" component={Radar} />
      <Route path="/venues" component={Venues} />
      <Route path="/profile" component={Profile} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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

export default App;
