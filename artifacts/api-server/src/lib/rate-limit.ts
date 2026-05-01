import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

export const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 20 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 10 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-up attempts from this network. Please try again later." },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 5 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip ?? "");
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return email ? `${ip}|${email}` : ip;
  },
  message: { error: "Too many password reset requests. Please try again later." },
});
