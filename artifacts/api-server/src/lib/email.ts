import { logger } from "./logger";
import {
  db,
  usersTable,
  emailsSentTable,
  type EmailType,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export type Locale = "en" | "ar";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailOptions = {
  emailType: EmailType;
  userId?: string | null;
  relatedId?: string | null;
};

/**
 * Stub email sender. Logs to the server console (SendGrid not yet wired)
 * AND records every attempt in the `emails_sent` table so the admin
 * dashboard can audit deliveries.
 */
export async function sendEmail(
  message: EmailMessage,
  opts: SendEmailOptions,
): Promise<void> {
  let status: "sent" | "failed" = "sent";
  let errorMsg: string | null = null;

  try {
    logger.info(
      {
        to: message.to,
        subject: message.subject,
        type: opts.emailType,
      },
      "[email-stub] Would send email (SendGrid not yet configured)",
    );
  } catch (err) {
    status = "failed";
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  // Record in DB. Never throw from here — the caller already handled the
  // primary action; logging failure should not bubble up.
  try {
    await db.insert(emailsSentTable).values({
      userId: opts.userId ?? null,
      toEmail: message.to,
      subject: message.subject,
      body: message.text,
      emailType: opts.emailType,
      status,
      error: errorMsg,
      relatedId: opts.relatedId ?? null,
    });
  } catch (logErr) {
    logger.error(
      { err: logErr, to: message.to, type: opts.emailType },
      "Failed to write emails_sent row",
    );
  }
}

export async function getAdminEmails(): Promise<
  { id: string; email: string; name: string; locale: Locale }[]
> {
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      preferredLanguage: usersTable.preferredLanguage,
    })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    locale: normalizeLocale(r.preferredLanguage),
  }));
}

export function normalizeLocale(raw: string | null | undefined): Locale {
  return raw === "ar" ? "ar" : "en";
}

// ---------------------------------------------------------------------------
// Bilingual templates
// ---------------------------------------------------------------------------

const SIGN_OFF: Record<Locale, string> = {
  en: "— The Abu Omar EduLexo team",
  ar: "— فريق أبو عمر إيدوليكسو",
};

function tierLabel(tier: string, locale: Locale): string {
  if (locale === "ar") {
    const map: Record<string, string> = {
      intro: "تمهيدي",
      advance: "متقدم",
      complete: "كامل",
      basic: "أساسي",
      foundation: "تأسيسي",
      pro: "احترافي",
    };
    return map[tier] ?? tier;
  }
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function courseLabel(course: string, locale: Locale): string {
  if (locale === "ar") {
    const map: Record<string, string> = {
      intro: "LEXO تمهيدي",
      english: "LEXO للإنجليزية",
      ielts: "LEXO للآيلتس",
    };
    return map[course] ?? course;
  }
  const map: Record<string, string> = {
    intro: "LEXO Intro",
    english: "LEXO for English",
    ielts: "LEXO for IELTS",
  };
  return map[course] ?? course;
}

export function buildEmailVerificationEmail(params: {
  to: string;
  name: string;
  verifyUrl: string;
  locale?: Locale;
}): EmailMessage {
  const { to, name, verifyUrl, locale = "en" } = params;
  if (locale === "ar") {
    return {
      to,
      subject: "فعّل بريدك الإلكتروني — أبو عمر إيدوليكسو",
      text: `مرحباً ${name},\n\nأهلاً بك في أبو عمر إيدوليكسو! يرجى تأكيد بريدك الإلكتروني لتأمين حسابك واستلام تحديثات الدورات.\n\nاضغط على الرابط التالي للتفعيل (تنتهي صلاحيته خلال 24 ساعة):\n\n${verifyUrl}\n\nإن لم تنشئ هذا الحساب، يمكنك تجاهل هذه الرسالة.\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: "Verify your Abu Omar EduLexo email",
    text: `Hi ${name},\n\nWelcome to Abu Omar EduLexo! Please confirm your email address so we can keep your account secure and send you important course updates.\n\nClick the link below to verify your email. This link expires in 24 hours.\n\n${verifyUrl}\n\nIf you didn't create this account, you can safely ignore this email.\n\n${SIGN_OFF.en}`,
  };
}

export function buildPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
  locale?: Locale;
}): EmailMessage {
  const { to, name, resetUrl, locale = "en" } = params;
  if (locale === "ar") {
    return {
      to,
      subject: "إعادة تعيين كلمة المرور — أبو عمر إيدوليكسو",
      text: `مرحباً ${name},\n\nوصلنا طلب لإعادة تعيين كلمة المرور لحسابك في أبو عمر إيدوليكسو.\n\nاضغط على الرابط التالي لاختيار كلمة مرور جديدة (تنتهي الصلاحية خلال 60 دقيقة):\n\n${resetUrl}\n\nإن لم تكن أنت من طلب ذلك، يمكنك تجاهل هذه الرسالة بأمان — لن تتغير كلمة المرور.\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: "Reset your Abu Omar EduLexo password",
    text: `Hi ${name},\n\nWe received a request to reset the password for your Abu Omar EduLexo account.\n\nClick the link below to choose a new password. This link expires in 60 minutes.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email — your password will not change.\n\n${SIGN_OFF.en}`,
  };
}

export function buildWelcomeEmail(params: {
  to: string;
  name: string;
  email: string;
  dashboardUrl: string;
  locale?: Locale;
}): EmailMessage {
  const { to, name, email, dashboardUrl, locale = "en" } = params;
  if (locale === "ar") {
    return {
      to,
      subject: "أهلاً بك في أبو عمر إيدوليكسو 🎉",
      text: `مرحباً ${name},\n\nأهلاً بك في منصة أبو عمر إيدوليكسو لتعليم اللغات! حسابك جاهز للاستخدام.\n\nتفاصيل الحساب:\n  • البريد: ${email}\n  • الاسم: ${name}\n\nابدأ الآن من لوحة التحكم:\n${dashboardUrl}\n\nخطوات سريعة للبدء:\n  1. أكمل تأكيد بريدك من الرسالة المنفصلة.\n  2. تصفّح الدورات المتاحة.\n  3. استرد رمز الوصول إن كنت تملكه أو راسل المسؤول للاشتراك.\n\nنحن سعيدون بانضمامك إلينا!\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: "Welcome to Abu Omar EduLexo 🎉",
    text: `Hi ${name},\n\nWelcome to the Abu Omar EduLexo language-learning platform! Your account is ready to go.\n\nAccount details:\n  • Email: ${email}\n  • Name: ${name}\n\nJump straight into your dashboard:\n${dashboardUrl}\n\nQuick start:\n  1. Verify your email from the separate verification message.\n  2. Browse the available courses.\n  3. Redeem an access code if you have one, or contact the admin to enroll.\n\nWe're glad to have you on board!\n\n${SIGN_OFF.en}`,
  };
}

export function buildEnrollmentConfirmationEmail(params: {
  to: string;
  name: string;
  course: string;
  tier: string;
  dashboardUrl: string;
  supportEmail: string;
  locale?: Locale;
}): EmailMessage {
  const {
    to,
    name,
    course,
    tier,
    dashboardUrl,
    supportEmail,
    locale = "en",
  } = params;
  const courseStr = courseLabel(course, locale);
  const tierStr = tierLabel(tier, locale);
  if (locale === "ar") {
    return {
      to,
      subject: `تم تأكيد اشتراكك في ${courseStr} — ${tierStr}`,
      text: `مرحباً ${name},\n\nيسعدنا إخبارك بأن المسؤول وافق على اشتراكك:\n  • الدورة: ${courseStr}\n  • المستوى: ${tierStr}\n\nيمكنك الآن الدخول مباشرة إلى الدرس الأول من لوحة التحكم:\n${dashboardUrl}\n\nنصائح للاستفادة القصوى:\n  • خصّص 20–30 دقيقة يومياً للدراسة المنتظمة.\n  • أكمل الاختبارات القصيرة لتثبيت المعلومة.\n  • راجع الكلمات الضعيفة كل أسبوع.\n\nهل تحتاج مساعدة؟ راسلنا على ${supportEmail}.\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: `Your enrollment is confirmed: ${courseStr} — ${tierStr}`,
    text: `Hi ${name},\n\nGreat news — the admin has approved your enrollment:\n  • Course: ${courseStr}\n  • Tier: ${tierStr}\n\nYou can jump straight into the first lesson from your dashboard:\n${dashboardUrl}\n\nLearning tips:\n  • Aim for 20–30 minutes a day for steady progress.\n  • Finish each lesson's short quiz to lock in what you learn.\n  • Review your weak-words list weekly.\n\nNeed help? Email us at ${supportEmail}.\n\n${SIGN_OFF.en}`,
  };
}

export function buildCourseAccessEmail(params: {
  to: string;
  name: string;
  course: string;
  tier: string;
  dashboardUrl: string;
  locale?: Locale;
}): EmailMessage {
  const { to, name, course, tier, dashboardUrl, locale = "en" } = params;
  const courseStr = courseLabel(course, locale);
  const tierStr = tierLabel(tier, locale);
  if (locale === "ar") {
    return {
      to,
      subject: `تم تفعيل دخولك إلى ${courseStr} — ${tierStr}`,
      text: `مرحباً ${name},\n\nأنت الآن مشترك في ${courseStr} — ${tierStr}.\n\nطريقة الدخول:\n  1. افتح لوحة التحكم: ${dashboardUrl}\n  2. اختر الدورة من القائمة الرئيسية.\n  3. ابدأ بالدرس الأول.\n\nخطوات أولى مقترحة:\n  • شاهد فيديو التعريف بالدورة.\n  • أكمل اختبار تحديد المستوى إن كان متوفراً.\n  • اضبط هدف الدراسة اليومي.\n\nبالتوفيق!\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: `You're enrolled in ${courseStr} — ${tierStr}`,
    text: `Hi ${name},\n\nYou're now enrolled in ${courseStr} — ${tierStr}.\n\nHow to access:\n  1. Open your dashboard: ${dashboardUrl}\n  2. Pick the course from the main menu.\n  3. Start with the first lesson.\n\nSuggested first steps:\n  • Watch the course intro video.\n  • Take the placement quiz if one is available.\n  • Set a daily study goal.\n\nGood luck!\n\n${SIGN_OFF.en}`,
  };
}

export function buildExpiryReminderEmail(params: {
  to: string;
  name: string;
  course: string;
  tier: string;
  expiresAt: Date;
  dashboardUrl: string;
  locale?: Locale;
}): EmailMessage {
  const {
    to,
    name,
    course,
    tier,
    expiresAt,
    dashboardUrl,
    locale = "en",
  } = params;
  const courseStr = courseLabel(course, locale);
  const tierStr = tierLabel(tier, locale);
  const expiryStr =
    locale === "ar"
      ? expiresAt.toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : expiresAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  if (locale === "ar") {
    return {
      to,
      subject: `تذكير: اشتراكك في ${courseStr} ينتهي في ${expiryStr}`,
      text: `مرحباً ${name},\n\nنود تذكيرك بأن اشتراكك في ${courseStr} (${tierStr}) سينتهي خلال 7 أيام، بتاريخ ${expiryStr}.\n\nللحفاظ على وصولك دون انقطاع، يرجى تجديد الاشتراك من لوحة التحكم:\n${dashboardUrl}\n\n🎁 عرض خاص للتجديد: تواصل مع المسؤول للحصول على رمز خصم خاص.\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: `Reminder: your ${courseStr} access expires on ${expiryStr}`,
    text: `Hi ${name},\n\nA quick heads-up — your ${courseStr} (${tierStr}) enrollment is set to expire in 7 days, on ${expiryStr}.\n\nTo keep your access uninterrupted, renew from your dashboard:\n${dashboardUrl}\n\n🎁 Special renewal offer: contact the admin for a discount code.\n\n${SIGN_OFF.en}`,
  };
}

export function buildAdminNewSignupEmail(params: {
  to: string;
  adminName: string;
  newUserName: string;
  newUserEmail: string;
  signupAt: Date;
  adminUrl: string;
  locale?: Locale;
}): EmailMessage {
  const {
    to,
    adminName,
    newUserName,
    newUserEmail,
    signupAt,
    adminUrl,
    locale = "en",
  } = params;
  const when = signupAt.toISOString();
  if (locale === "ar") {
    return {
      to,
      subject: `تسجيل جديد: ${newUserName}`,
      text: `مرحباً ${adminName},\n\nهناك طالب جديد سجّل في المنصة:\n  • الاسم: ${newUserName}\n  • البريد: ${newUserEmail}\n  • وقت التسجيل: ${when}\n\nراجع التفاصيل من لوحة المسؤول:\n${adminUrl}\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: `New signup: ${newUserName}`,
    text: `Hi ${adminName},\n\nA new student just signed up:\n  • Name: ${newUserName}\n  • Email: ${newUserEmail}\n  • Signed up at: ${when}\n\nReview details in the admin dashboard:\n${adminUrl}\n\n${SIGN_OFF.en}`,
  };
}

export function buildAdminNewEnrollmentEmail(params: {
  to: string;
  adminName: string;
  studentName: string;
  studentEmail: string;
  course: string;
  tier: string;
  source: string;
  adminUrl: string;
  locale?: Locale;
}): EmailMessage {
  const {
    to,
    adminName,
    studentName,
    studentEmail,
    course,
    tier,
    source,
    adminUrl,
    locale = "en",
  } = params;
  const courseStr = courseLabel(course, locale);
  const tierStr = tierLabel(tier, locale);
  if (locale === "ar") {
    return {
      to,
      subject: `اشتراك جديد: ${studentName} في ${courseStr}`,
      text: `مرحباً ${adminName},\n\nتم إنشاء اشتراك جديد:\n  • الطالب: ${studentName} (${studentEmail})\n  • الدورة: ${courseStr}\n  • المستوى: ${tierStr}\n  • المصدر: ${source}\n\nالتفاصيل من لوحة المسؤول:\n${adminUrl}\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: `New enrollment: ${studentName} in ${courseStr}`,
    text: `Hi ${adminName},\n\nA new enrollment was created:\n  • Student: ${studentName} (${studentEmail})\n  • Course: ${courseStr}\n  • Tier: ${tierStr}\n  • Source: ${source}\n\nDetails in the admin dashboard:\n${adminUrl}\n\n${SIGN_OFF.en}`,
  };
}
