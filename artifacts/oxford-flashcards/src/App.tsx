import { Router, Route, Switch } from "wouter";
import PlatformLanding from "@/pages/PlatformLanding";
import LandingPage from "@/pages/LandingPage";
import IeltsCourse from "@/pages/IeltsCourse";
import FlashcardApp from "@/pages/FlashcardApp";
import DemoFlashcards from "@/pages/DemoFlashcards";
import Signup from "@/pages/Signup";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import ComingSoon from "@/pages/ComingSoon";
import NotFound from "@/pages/not-found";
import ProtectedRoute from "@/components/ProtectedRoute";

const baseRaw = import.meta.env.BASE_URL || "/";
const base =
  baseRaw.endsWith("/") && baseRaw.length > 1
    ? baseRaw.slice(0, -1)
    : baseRaw === "/"
      ? ""
      : baseRaw;

export default function App() {
  return (
    <Router base={base}>
      <Switch>
        <Route path="/" component={PlatformLanding} />
        <Route path="/english" component={LandingPage} />
        <Route path="/ielts" component={IeltsCourse} />
        <Route path="/demo" component={DemoFlashcards} />
        <Route path="/app" component={FlashcardApp} />

        <Route path="/signup" component={Signup} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />

        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/free-lessons">
          <ComingSoon titleKey="comingSoon.freeLessons.title" descKey="comingSoon.freeLessons.desc" />
        </Route>
        <Route path="/assessment">
          <ComingSoon titleKey="comingSoon.assessment.title" descKey="comingSoon.assessment.desc" />
        </Route>
        <Route path="/affiliate">
          <ComingSoon titleKey="comingSoon.affiliate.title" descKey="comingSoon.affiliate.desc" />
        </Route>
        <Route path="/admin">
          <ProtectedRoute requireAdmin>
            <ComingSoon titleKey="comingSoon.admin.title" descKey="comingSoon.admin.desc" />
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}
