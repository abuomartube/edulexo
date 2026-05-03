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
import VerifyEmail from "@/pages/VerifyEmail";
import Dashboard from "@/pages/Dashboard";
import Checkout from "@/pages/Checkout";
import CourseDetail from "@/pages/CourseDetail";
import EnglishCourseDetail from "@/pages/EnglishCourseDetail";
import MyPayments from "@/pages/MyPayments";
import AccountSettings from "@/pages/AccountSettings";
import PublicProfile from "@/pages/PublicProfile";
import AdminDashboard from "@/pages/AdminDashboard";
import LiveSessions from "@/pages/LiveSessions";
import Support from "@/pages/Support";
import SupportThread from "@/pages/SupportThread";
import Chat from "@/pages/Chat";
import ChatRoom from "@/pages/ChatRoom";
import ChatMessages from "@/pages/ChatMessages";
import ChatDmThread from "@/pages/ChatDmThread";
import ChatLeaderboard from "@/pages/ChatLeaderboard";
import ChatShowcase from "@/pages/ChatShowcase";
import ChatScreenMockup from "@/pages/ChatScreenMockup";
import ComingSoon from "@/pages/ComingSoon";
import NotFound from "@/pages/not-found";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";

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
        <Route path="/course/ielts/:tier" component={CourseDetail} />
        <Route path="/course/english/:tier" component={EnglishCourseDetail} />
        <Route path="/demo" component={DemoFlashcards} />
        <Route path="/app" component={FlashcardApp} />

        <Route path="/signup" component={Signup} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/verify-email" component={VerifyEmail} />

        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/checkout/:course/:tier">
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        </Route>

        <Route path="/payments">
          <ProtectedRoute>
            <MyPayments />
          </ProtectedRoute>
        </Route>

        <Route path="/account-settings">
          <ProtectedRoute>
            <AccountSettings />
          </ProtectedRoute>
        </Route>

        <Route path="/u/:userId">
          <ProtectedRoute>
            <PublicProfile />
          </ProtectedRoute>
        </Route>

        <Route path="/live-sessions">
          <ProtectedRoute>
            <LiveSessions />
          </ProtectedRoute>
        </Route>

        <Route path="/support">
          <ProtectedRoute>
            <Support />
          </ProtectedRoute>
        </Route>
        <Route path="/support/:id">
          <ProtectedRoute>
            <SupportThread />
          </ProtectedRoute>
        </Route>

        <Route path="/chat">
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/r/:slug">
          <ProtectedRoute>
            <ChatRoom />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/messages">
          <ProtectedRoute>
            <ChatMessages />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/dm/:id">
          <ProtectedRoute>
            <ChatDmThread />
          </ProtectedRoute>
        </Route>
        <Route path="/chat-showcase" component={ChatShowcase} />
        <Route path="/chat-screen" component={ChatScreenMockup} />
        <Route path="/chat/leaderboard">
          <ProtectedRoute>
            <ChatLeaderboard />
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
            <AdminDashboard />
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </Router>
  );
}
