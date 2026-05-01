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
          <ComingSoon
            title="Free Lessons"
            description="A growing library of free lessons — videos, vocabulary packs, and grammar guides — is on the way. Sign up to be the first to know when it launches."
          />
        </Route>
        <Route path="/assessment">
          <ComingSoon
            title="Level Assessment"
            description="Take a short quiz to discover your CEFR level — from A1 to C2 — and get a personalised study plan."
          />
        </Route>
        <Route path="/affiliate">
          <ComingSoon
            title="Become an Affiliate"
            description="Earn commission by sharing Abu Omar EduLexo with your audience. Affiliate applications open soon."
          />
        </Route>
        <Route path="/admin">
          <ProtectedRoute requireAdmin>
            <ComingSoon
              title="Admin Dashboard"
              description="Full admin tools — students, enrollments, FAQs, free lessons, affiliates, analytics — are coming in Iteration 4."
            />
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}
