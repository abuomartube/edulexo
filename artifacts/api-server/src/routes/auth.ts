import { Router, type IRouter } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  db,
  usersTable,
  passwordResetTokensTable,
  type User,
} from "@workspace/db";
import {
  SignupBody,
  LoginBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  LoginResponse as AuthResponseSchema,
  GetCurrentUserResponse as MeResponseSchema,
  ForgotPasswordResponse as MessageResponseSchema,
} from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  getAppOrigin,
  toPublicUser,
  getUserById,
  getUserByEmail,
  requireAuth,
} from "../lib/auth";
import { buildPasswordResetEmail, sendEmail } from "../lib/email";
import {
  authIpLimiter,
  signupLimiter,
  forgotPasswordLimiter,
} from "../lib/rate-limit";

const router: IRouter = Router();

function loginSession(req: Express.Request, user: User): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session!.regenerate((err) => {
      if (err) return reject(err);
      req.session!.userId = user.id;
      req.session!.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

router.post("/auth/signup", signupLimiter, async (req, res, next) => {
  try {
    const parsed = SignupBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { name, email, phone, password } = parsed.data;
    const normalized = email.trim().toLowerCase();

    const existing = await getUserByEmail(normalized);
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(usersTable)
      .values({
        name: name.trim(),
        email: normalized,
        phone: phone?.trim() || null,
        passwordHash,
        role: "student",
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create user");
    }

    await loginSession(req, created);

    const body = AuthResponseSchema.parse({ user: toPublicUser(created) });
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});

router.post("/auth/login", authIpLimiter, async (req, res, next) => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { email, password } = parsed.data;
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    await loginSession(req, user);

    const body = AuthResponseSchema.parse({ user: toPublicUser(user) });
    res.json(body);
  } catch (err) {
    next(err);
  }
});

router.post("/auth/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("edulexo.sid");
    res.status(204).send();
  });
});

router.get("/auth/me", async (req, res, next) => {
  try {
    if (!req.session.userId) {
      const body = MeResponseSchema.parse({ user: null });
      res.json(body);
      return;
    }
    const user = await getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => undefined);
      const body = MeResponseSchema.parse({ user: null });
      res.json(body);
      return;
    }
    const body = MeResponseSchema.parse({ user: toPublicUser(user) });
    res.json(body);
  } catch (err) {
    next(err);
  }
});

router.post("/auth/forgot-password", forgotPasswordLimiter, async (req, res, next) => {
  try {
    const parsed = ForgotPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { email } = parsed.data;
    const user = await getUserByEmail(email);

    // Always respond OK — never reveal whether an email is registered.
    if (user) {
      const rawToken = generateToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await db.insert(passwordResetTokensTable).values({
        token: tokenHash,
        userId: user.id,
        expiresAt,
      });
      const resetUrl = `${getAppOrigin()}/reset-password?token=${encodeURIComponent(rawToken)}`;
      const message = buildPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
      await sendEmail(message);
      // Never log raw tokens in production. In dev only, log the URL so
      // we can complete the reset flow without a real email pipeline.
      if (process.env.NODE_ENV !== "production") {
        req.log.info(
          { userId: user.id, resetUrl },
          "[dev-only] Password reset link",
        );
      } else {
        req.log.info({ userId: user.id }, "Password reset link generated");
      }
    }

    const body = MessageResponseSchema.parse({
      message: "If that email is registered, a reset link is on its way.",
    });
    res.json(body);
  } catch (err) {
    next(err);
  }
});

router.post("/auth/reset-password", authIpLimiter, async (req, res, next) => {
  try {
    const parsed = ResetPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    const [record] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token, tokenHash),
          isNull(passwordResetTokensTable.usedAt),
          gt(passwordResetTokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!record) {
      res.status(400).json({ error: "This reset link is invalid or has expired." });
      return;
    }

    const passwordHash = await hashPassword(password);
    await db
      .update(usersTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, record.userId));
    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.token, tokenHash));

    const body = MessageResponseSchema.parse({
      message: "Password updated. You can now log in with your new password.",
    });
    res.json(body);
  } catch (err) {
    next(err);
  }
});

export { requireAuth };
export default router;
