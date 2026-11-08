import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, upsertUser, logEvent } from "@/lib/server/store";
import { hashToken, hashPassword } from "@/lib/server/crypto";
import { clientInfo, rateLimit } from "@/lib/server/request";
import { isEmail, normalizeEmail, checkPassword } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { ip, userAgent } = clientInfo(req);
  if (!(await rateLimit(`resetconfirm:${ip}`, 15, 60_000, { ip }))) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = body?.email;
  const token = body?.token;
  const password = body?.password;

  if (!isEmail(email) || typeof token !== "string")
    return NextResponse.json({ error: "Invalid reset request." }, { status: 400 });

  const strength = checkPassword(String(password ?? ""));
  if (!strength.ok)
    return NextResponse.json(
      { error: "Password too weak.", issues: strength.issues },
      { status: 400 }
    );

  const normalized = normalizeEmail(email);
  const user = await findUserByEmail(normalized);

  const valid =
    user &&
    user.resetTokenHash &&
    user.resetTokenExpires &&
    Date.now() < user.resetTokenExpires &&
    user.resetTokenHash === hashToken(token);

  if (!user || !valid) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  user.passwordHash = await hashPassword(String(password));
  // Single-use: invalidate the token.
  delete user.resetTokenHash;
  delete user.resetTokenExpires;
  await upsertUser(user);
  await logEvent({
    type: "reset_completed",
    email: normalized,
    ip,
    userAgent,
  });

  return NextResponse.json({
    ok: true,
    message: "Your password has been updated. You can sign in now.",
  });
}
