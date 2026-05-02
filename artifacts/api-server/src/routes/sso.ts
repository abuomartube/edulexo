import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  enrollmentsTable,
  type Tier,
  TIER_VALUES,
} from "@workspace/db";
import { requireAuth, getUserById } from "../lib/auth";
import { signSsoToken, newJti } from "../lib/sso";

const router: IRouter = Router();

// Routing table from tier → downstream LEXO app + its SSO redeem endpoint.
//
// `intro` still points at the legacy `lexo-intro` artifact (`/app-ielts-intro`)
// because that app has not yet been merged into the unified `/lexo-ielts/` app.
// The merge is tracked as a separate piece of work; once the intro features
// (VAD, OpenAI voice, listening/reading admin, etc.) are ported into the IELTS
// artifact, this row will move to `/lexo-ielts` and the lexo-intro artifact
// can be retired.
const TIER_ROUTES: Record<Tier, { basePath: string; redeemPath: string } | null> = {
  intro: { basePath: "/app-ielts-intro", redeemPath: "/api-intro/sso/redeem" },
  advance: { basePath: "/lexo-ielts", redeemPath: "/api-ielts/sso/redeem" },
  complete: { basePath: "/lexo-ielts", redeemPath: "/api-ielts/sso/redeem" },
};

router.post("/sso/:tier/launch", requireAuth, async (req, res, next) => {
  try {
    const tier = String(req.params.tier) as Tier;
    if (!TIER_VALUES.includes(tier)) {
      res.status(400).json({ error: "Unknown tier" });
      return;
    }
    const route = TIER_ROUTES[tier];
    if (!route) {
      res.status(503).json({ error: "Tier app not yet available" });
      return;
    }

    const userId = req.session.userId!;
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const now = new Date();
    const [enrollment] = await db
      .select()
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.userId, userId),
          eq(enrollmentsTable.tier, tier),
          eq(enrollmentsTable.status, "active"),
        ),
      )
      .limit(1);

    if (!enrollment) {
      res.status(403).json({ error: "You are not enrolled in this tier" });
      return;
    }
    if (enrollment.expiresAt && enrollment.expiresAt < now) {
      res.status(403).json({ error: "Your enrollment has expired" });
      return;
    }

    const token = signSsoToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      tier,
      jti: newJti(),
      exp: Math.floor(Date.now() / 1000) + 60, // 60s window
    });

    // Carry the tier through to the unified IELTS app via query param so the
    // SPA can read it on first paint and gate features. The downstream app
    // also receives the tier inside the signed SSO token + via localStorage,
    // but the URL param is the most ergonomic source for first-render logic.
    const nextUrl = `${route.basePath}/?tier=${encodeURIComponent(tier)}`;
    const redirectUrl = `${route.redeemPath}?token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextUrl)}`;
    res.json({ url: redirectUrl, tier });
  } catch (err) {
    next(err);
  }
});

export default router;
