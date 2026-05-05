import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider, useT } from "@/lib/i18n";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import ToolChoice from "@/pages/ToolChoice";
import Lessons from "@/pages/Lessons";
import ChurchillSpeaking from "@/pages/ChurchillSpeaking";
import OrwellWriting from "@/pages/OrwellWriting";
import AttenboroughListening from "@/pages/AttenboroughListening";
import HemingwayReading from "@/pages/HemingwayReading";
import PackageDetails from "@/pages/PackageDetails";
import NotFound from "@/pages/not-found";

const FlashcardsApp = lazy(() => import("@/features/flashcards"));
import {
  getEnglishEnrollments,
  getMe,
  logout as apiLogout,
  type EnglishEnrollment,
  type PublicUser,
} from "@/lib/api";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const TOOL_PATH_TO_DASHBOARD_SLUG: Record<string, string> = {
  "/tools/lessons": "lessons",
  "/tools/speaking": "speaking",
  "/tools/writing": "writing",
  "/tools/listening": "listening",
  "/tools/reading": "reading",
  "/mentor/flashcards": "flashcards",
};

function isEmbeddedRequest(): boolean {
  if (typeof window === "undefined") return true;
  return new URLSearchParams(window.location.search).has("embed");
}

function redirectTargetFor(path: string): string {
  if (path.startsWith("/package/")) return "/english";
  const toolSlug = TOOL_PATH_TO_DASHBOARD_SLUG[path];
  if (toolSlug) return `/dashboard/english/${toolSlug}`;
  if (path === "/tools" || path.startsWith("/tools/")) return "/dashboard/english";
  return "/dashboard";
}

function Shell() {
  const t = useT();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [enrollments, setEnrollments] = useState<EnglishEnrollment[]>([]);
  const [location, navigate] = useLocation();

  const embed = useMemo(() => isEmbeddedRequest(), []);
  const isToolPath = location in TOOL_PATH_TO_DASHBOARD_SLUG;
  // Only allow rendering when iframed (embed=1) on a known tool path.
  // Every other case (any non-embed visit, or embed on a non-tool path) redirects.
  const shouldRedirect = !(embed && isToolPath);

  useEffect(() => {
    if (!shouldRedirect) return;
    if (typeof window === "undefined") return;
    window.location.replace(redirectTargetFor(location));
  }, [shouldRedirect, location]);

  const refresh = useCallback(async () => {
    const meRes = await getMe();
    if (!meRes.ok || !meRes.data.user) {
      setUser(null);
      setEnrollments([]);
      return;
    }
    setUser(meRes.data.user);
    const enrRes = await getEnglishEnrollments();
    setEnrollments(enrRes.ok ? enrRes.data.enrollments : []);
  }, []);

  useEffect(() => {
    if (shouldRedirect) {
      setBootstrapping(false);
      return;
    }
    void refresh().finally(() => setBootstrapping(false));
  }, [refresh, shouldRedirect]);

  const handleLogout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setEnrollments([]);
  }, []);

  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  void handleLogout;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        <Switch>
          <Route path="/">
            {user ? (
              <Dashboard
                user={user}
                enrollments={enrollments}
                onChanged={() => void refresh()}
                onGoToTools={() => navigate("/tools")}
              />
            ) : (
              <Landing />
            )}
          </Route>
          <Route path="/tools">
            {user ? (
              <ToolChoice
                enrollments={enrollments}
                onBack={() => navigate("/")}
                onNavigate={(id) => {
                  if (id === "flashcards") {
                    window.open("/dashboard/english/flashcards", "_blank", "noopener,noreferrer");
                  } else {
                    navigate(`/tools/${id}`);
                  }
                }}
              />
            ) : (
              <Landing />
            )}
          </Route>
          <Route path="/tools/lessons">
            {user ? (
              <Lessons onBack={() => navigate("/tools")} />
            ) : (
              <Landing />
            )}
          </Route>
          <Route path="/tools/speaking">
            {user ? (
              <ChurchillSpeaking
                enrollments={enrollments}
                onBack={() => navigate("/tools")}
              />
            ) : (
              <Landing />
            )}
          </Route>
          <Route path="/tools/writing">
            {user ? (
              <OrwellWriting
                enrollments={enrollments}
                onBack={() => navigate("/tools")}
              />
            ) : (
              <Landing />
            )}
          </Route>
          <Route path="/tools/listening">
            {user ? (
              <AttenboroughListening
                enrollments={enrollments}
                onBack={() => navigate("/tools")}
              />
            ) : (
              <Landing />
            )}
          </Route>
          <Route path="/tools/reading">
            {user ? (
              <HemingwayReading
                enrollments={enrollments}
                onBack={() => navigate("/tools")}
              />
            ) : (
              <Landing />
            )}
          </Route>
          <Route path="/mentor/flashcards">
            {user ? (
              <Suspense
                fallback={
                  <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{t("loading")}</span>
                    </div>
                  </div>
                }
              >
                <FlashcardsApp />
              </Suspense>
            ) : (
              <Landing />
            )}
          </Route>
          <Route path="/package/a1-b1">
            <PackageDetails slug="a1-b1" onBack={() => navigate("/")} />
          </Route>
          <Route path="/package/b1-c1">
            <PackageDetails slug="b1-c1" onBack={() => navigate("/")} />
          </Route>
          <Route path="/package/full">
            <PackageDetails slug="full" onBack={() => navigate("/")} />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Shell />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
