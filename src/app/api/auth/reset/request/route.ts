import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, upsertUser, logEvent } from "@/lib/server/store";
import { generateToken } from "@/lib/server/crypto";
import { sendMail, resetEmail } from "@/lib/server/email";
import { clientInfo, rateLimit } from "@/lib/server/request";
import { isEmail, normalizeEmail } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { ip, userAgent } = clientInfo(req);
  const body = await req.json().catch(() => null);
  const email = body?.email;

  if (!isEmail(email))
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const normalized = normalizeEmail(email);
  if (!(await rateLimit(`reset:${normalized}`, 3, 15 * 60_000, { ip, email: normalized }))) {
    // Still return the generic response below — don't leak rate state.
  }

  const user = await findUserByEmail(normalized);
  if (user) {
    const { token, tokenHash } = generateToken();
    user.resetTokenHash = tokenHash;
    user.resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await upsertUser(user);

    const base =
      process.env.APP_URL ||
      req.nextUrl.origin ||
      "http://localhost:3000";
    const link = `${base}/reset?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(normalized)}`;
    await sendMail({ to: normalized, ...resetEmail(link) });
    await logEvent({
      type: "reset_requested",
      email: normalized,
      ip,
      userAgent,
    });
  }

  // Always the same response, whether or not the email exists.
  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, a reset link is on its way.",
  });
}
