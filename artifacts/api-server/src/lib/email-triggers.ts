import type { Logger } from "pino";
import {
  buildCourseAccessEmail,
  buildEnrollmentConfirmationEmail,
  buildAdminNewEnrollmentEmail,
  sendEmail,
  getAdminEmails,
  normalizeLocale,
} from "./email";
import { getAppOrigin } from "./auth";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SUPPORT_EMAIL = "support@edulexo.com";

/**
 * Look up the freshest user record we need for emails. Returns null if the
 * user can't be found (caller should silently skip, never throw).
 */
async function loadUserForEmail(userId: string) {
  const [u] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      preferredLanguage: usersTable.preferredLanguage,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return u ?? null;
}

/**
 * Send the "you're enrolled, here's how to access" email after a student
 * self-redeems a code. Also notifies all admins of the new enrollment.
 * Never throws — logs and swallows on failure.
 */
export async function notifyStudentSelfEnrolled(params: {
  log: Logger;
  userId: string;
  course: "intro" | "english";
  tier: string;
  enrollmentId: string;
  source?: "code" | "tabby" | "tamara" | "bank_transfer";
}): Promise<void> {
  const { log, userId, course, tier, enrollmentId } = params;
  const source = params.source ?? "code";
  const dashboardUrl = `${getAppOrigin()}/dashboard`;
  const adminUrl = `${getAppOrigin()}/admin`;

  try {
    const user = await loadUserForEmail(userId);
    if (!user) return;
    await sendEmail(
      buildCourseAccessEmail({
        to: user.email,
        name: user.name,
        course,
        tier,
        dashboardUrl,
        locale: normalizeLocale(user.preferredLanguage),
      }),
      {
        emailType: "course_access",
        userId: user.id,
        relatedId: enrollmentId,
      },
    );

    const admins = await getAdminEmails();
    for (const admin of admins) {
      await sendEmail(
        buildAdminNewEnrollmentEmail({
          to: admin.email,
          adminName: admin.name,
          studentName: user.name,
          studentEmail: user.email,
          course,
          tier,
          source,
          adminUrl,
          locale: admin.locale,
        }),
        {
          emailType: "admin_new_enrollment",
          userId: admin.id,
          relatedId: enrollmentId,
        },
      );
    }
  } catch (err) {
    log.warn(
      { err, userId, course, tier, enrollmentId },
      "notifyStudentSelfEnrolled failed",
    );
  }
}

/**
 * Send the "your enrollment was approved" email after the admin grants or
 * activates a student enrollment. Never throws.
 */
export async function notifyEnrollmentApproved(params: {
  log: Logger;
  userId: string;
  course: "intro" | "english";
  tier: string;
  enrollmentId: string;
}): Promise<void> {
  const { log, userId, course, tier, enrollmentId } = params;
  const dashboardUrl = `${getAppOrigin()}/dashboard`;

  try {
    const user = await loadUserForEmail(userId);
    if (!user) return;
    await sendEmail(
      buildEnrollmentConfirmationEmail({
        to: user.email,
        name: user.name,
        course,
        tier,
        dashboardUrl,
        supportEmail: SUPPORT_EMAIL,
        locale: normalizeLocale(user.preferredLanguage),
      }),
      {
        emailType: "enrollment_confirmation",
        userId: user.id,
        relatedId: enrollmentId,
      },
    );
  } catch (err) {
    log.warn(
      { err, userId, course, tier, enrollmentId },
      "notifyEnrollmentApproved failed",
    );
  }
}
