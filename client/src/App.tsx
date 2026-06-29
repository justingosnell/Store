import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/PageTransition";
import { getApiUrl } from "@/lib/api";
import { useAfterInitialLoad } from "@/hooks/useAfterInitialLoad";
import Home from "@/pages/home";

const Login = lazy(() => import("@/pages/login"));
const Admin = lazy(() => import("@/pages/admin"));
const Categories = lazy(() => import("@/pages/categories"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PerformanceRuntime() {
  const canLoadRuntimeSettings = useAfterInitialLoad(1200);
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings"));
      if (!response.ok) throw new Error("Failed to load performance settings");
      return response.json();
    },
    enabled: canLoadRuntimeSettings,
  });

  const deferBelowFoldScripts = settings.defer_below_fold_scripts === "true";

  useEffect(() => {
    const hasSetting = (key: string) => Object.prototype.hasOwnProperty.call(settings, key);
    const metaTitle = settings.meta_title?.trim();
    const metaDescription = settings.meta_description?.trim();
    const metaKeywords = settings.meta_keywords?.trim();
    const faviconUrl = settings.favicon_url?.trim();

    if (metaTitle) {
      document.title = metaTitle;
    }

    const setMetaTag = (name: string, content?: string) => {
      let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!content) {
        element?.remove();
        return;
      }
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute("name", name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    if (hasSetting("meta_description")) {
      setMetaTag("description", metaDescription);
    }
    if (hasSetting("meta_keywords")) {
      setMetaTag("keywords", metaKeywords);
    }

    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (faviconUrl) {
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      favicon.href = faviconUrl;
    }
  }, [settings.meta_title, settings.meta_description, settings.meta_keywords, settings.favicon_url]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.deferBelowFoldScripts = String(deferBelowFoldScripts);

    const activateDeferredScripts = () => {
      document.querySelectorAll<HTMLScriptElement>("script[data-below-fold-src]:not([data-loaded])").forEach((placeholder) => {
        const source = placeholder.dataset.belowFoldSrc;
        if (!source) return;

        const script = document.createElement("script");
        Array.from(placeholder.attributes).forEach((attribute) => {
          if (!attribute.name.startsWith("data-below-fold")) {
            script.setAttribute(attribute.name, attribute.value);
          }
        });
        script.src = source;
        script.defer = true;
        placeholder.dataset.loaded = "true";
        placeholder.after(script);
      });
    };

    if (!deferBelowFoldScripts) {
      activateDeferredScripts();
      return () => {
        delete root.dataset.deferBelowFoldScripts;
      };
    }

    let idleId: number | undefined;
    const scheduleActivation = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(activateDeferredScripts, { timeout: 2500 });
      } else {
        setTimeout(activateDeferredScripts, 1);
      }
    };

    if (document.readyState === "complete") {
      scheduleActivation();
    } else {
      window.addEventListener("load", scheduleActivation, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleActivation);
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      delete root.dataset.deferBelowFoldScripts;
    };
  }, [deferBelowFoldScripts]);

  return null;
}

// Protected route wrapper
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-pink-500" aria-label="Loading page" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
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

  return <>{children}</>;
}

function Router() {
  return (
    <PageTransition>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/map">
          {() => <Redirect to="/" />}
        </Route>
        <Route path="/login" component={Login} />
        <Route path="/admin">
          {() => (
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/categories">
          {() => (
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          )}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </PageTransition>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PerformanceRuntime />
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Suspense fallback={<RouteFallback />}>
              <Router />
            </Suspense>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
