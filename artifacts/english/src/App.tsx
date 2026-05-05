import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider, useT } from "@/lib/i18n";
import { Header } from "@/components/Header";
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

function Shell() {
  const t = useT();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [enrollments, setEnrollments] = useState<EnglishEnrollment[]>([]);

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
    void refresh().finally(() => setBootstrapping(false));
  }, [refresh]);

  const handleLogout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setEnrollments([]);
  }, []);

  const [, navigate] = useLocation();

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} onLogout={handleLogout} />
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
                    window.open("/lexo/flashcards/", "_blank", "noopener,noreferrer");
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
