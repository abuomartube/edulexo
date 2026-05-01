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
