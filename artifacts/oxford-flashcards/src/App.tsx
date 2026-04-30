import { Router, Route, Switch } from "wouter";
import LandingPage from "@/pages/LandingPage";
import FlashcardApp from "@/pages/FlashcardApp";
import DemoFlashcards from "@/pages/DemoFlashcards";
import NotFound from "@/pages/not-found";

const baseRaw = import.meta.env.BASE_URL || "/";
const base = baseRaw.endsWith("/") && baseRaw.length > 1 ? baseRaw.slice(0, -1) : baseRaw === "/" ? "" : baseRaw;

export default function App() {
  return (
    <Router base={base}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/demo" component={DemoFlashcards} />
        <Route path="/app" component={FlashcardApp} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}
