import { useCallback, useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider, useT } from "@/lib/i18n";
import { Header } from "@/components/Header";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";
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

  const goSignIn = useCallback(() => {
    // The platform login lives at site root; preserve return URL so the user is
    // bounced back into the English app after auth.
    const ret = encodeURIComponent(window.location.pathname);
    window.location.href = `/?next=${ret}`;
  }, []);

  const handleLogout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setEnrollments([]);
  }, []);

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
              />
            ) : (
              <Landing onSignIn={goSignIn} />
            )}
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
