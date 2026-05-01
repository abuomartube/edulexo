import { logger } from "./logger";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Stub email sender. In Iteration 5 this will be wired to SendGrid.
 * For now it logs the email to the server console so password-reset
 * tokens are visible during development.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  logger.info(
    {
      to: message.to,
      subject: message.subject,
    },
    "[email-stub] Would send email (SendGrid not yet configured)",
  );
}

export function buildEmailVerificationEmail(params: {
  to: string;
  name: string;
  verifyUrl: string;
}): EmailMessage {
  const { to, name, verifyUrl } = params;
  return {
    to,
    subject: "Verify your Abu Omar EduLexo email",
    text: `Hi ${name},

Welcome to Abu Omar EduLexo! Please confirm your email address so we can keep your account secure and send you important course updates.

Click the link below to verify your email. This link expires in 24 hours.

${verifyUrl}

If you didn't create this account, you can safely ignore this email.

— The Abu Omar EduLexo team`,
  };
}

export function buildPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): EmailMessage {
  const { to, name, resetUrl } = params;
  return {
    to,
    subject: "Reset your Abu Omar EduLexo password",
    text: `Hi ${name},

We received a request to reset the password for your Abu Omar EduLexo account.

Click the link below to choose a new password. This link expires in 60 minutes.

${resetUrl}

If you didn't request this, you can safely ignore this email — your password will not change.

— The Abu Omar EduLexo team`,
  };
}
