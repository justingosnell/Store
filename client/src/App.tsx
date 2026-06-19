import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/PageTransition";
import Home from "@/pages/home";
import Map from "@/pages/map";
import Login from "@/pages/login";
import Admin from "@/pages/admin";
import Categories from "@/pages/categories";
import NotFound from "@/pages/not-found";

// Protected route wrapper
function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <PageTransition>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/map">
          {() => <ProtectedRoute component={Map} />}
        </Route>
        <Route path="/login" component={Login} />
        <Route path="/admin">
          {() => <ProtectedRoute component={Admin} />}
        </Route>
        <Route path="/categories">
          {() => <ProtectedRoute component={Categories} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </PageTransition>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
