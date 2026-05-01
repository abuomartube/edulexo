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

const TIER_ROUTES: Record<Tier, { basePath: string; redeemPath: string } | null> = {
  intro: { basePath: "/app-ielts-intro", redeemPath: "/api-intro/sso/redeem" },
  advance: null, // not built yet
  complete: null, // not built yet
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

    const redirectUrl = `${route.redeemPath}?token=${encodeURIComponent(token)}&next=${encodeURIComponent(route.basePath + "/")}`;
    res.json({ url: redirectUrl, tier });
  } catch (err) {
    next(err);
  }
});

export default router;
