import { logEvent } from "./store";

/**
 * Email transport.
 *
 * If SMTP settings are present in the environment, real mail is sent via
 * nodemailer (optional dependency — only required when you actually
 * configure SMTP). Otherwise we fall back to a DEV transport that records
 * the message so you can see the reset link during local development.
 *
 * The reset link is only ever sent to the address already on the account —
 * this is how a user proves ownership and re-sets their own password.
 */

interface Mail {
  to: string;
  subject: string;
  text: string;
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function sendMail(mail: Mail): Promise<void> {
  if (smtpConfigured()) {
    // Dynamically import so the package is only needed when SMTP is used.
    // Optional peer dependency — install with `npm i nodemailer` to enable.
    const mod = "nodemailer";
    const nodemailer = await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ mod
    ).catch(() => null);
    if (!nodemailer) {
      throw new Error(
        "SMTP is configured but 'nodemailer' is not installed. Run: npm i nodemailer"
      );
    }
    const transport = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
    return;
  }

  // DEV fallback: log instead of sending. Visible in the server console and
  // in the admin security log (subject only — never the token in telemetry).
  console.log(
    `\n[DEV EMAIL] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`
  );
  await logEvent({
    type: "reset_requested",
    email: mail.to,
    detail: "dev email transport (SMTP not configured)",
  });
}

export function resetEmail(link: string): Omit<Mail, "to"> {
  return {
    subject: "Reset your password",
    text:
      `We received a request to reset your password.\n\n` +
      `Click the link below to choose a new password. It expires in 1 hour ` +
      `and can be used once:\n\n${link}\n\n` +
      `If you didn't request this, you can safely ignore this email — your ` +
      `password will not change.`,
  };
}
