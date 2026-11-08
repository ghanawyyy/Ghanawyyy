import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, logEvent } from "@/lib/server/store";
import { verifyPassword } from "@/lib/server/crypto";
import { setSession } from "@/lib/server/session";
import { clientInfo, rateLimit } from "@/lib/server/request";
import { isEmail, normalizeEmail } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { ip, userAgent } = clientInfo(req);
  const body = await req.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (!isEmail(email) || typeof password !== "string")
    return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });

  const normalized = normalizeEmail(email);

  // Rate limit by IP and by account to blunt brute force.
  const ok =
    (await rateLimit(`login:ip:${ip}`, 20, 60_000, { ip, email: normalized })) &&
    (await rateLimit(`login:acct:${normalized}`, 8, 60_000, {
      ip,
      email: normalized,
    }));
  if (!ok)
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429 }
    );

  const user = await findUserByEmail(normalized);
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : false;

  if (!user || !valid) {
    await logEvent({
      type: "login_failed",
      email: normalized,
      ip,
      userAgent,
    });
    // Same message whether the email exists or not.
    return NextResponse.json(
      { error: "Email or password is incorrect." },
      { status: 401 }
    );
  }

  await setSession(user.id);
  await logEvent({ type: "login_success", email: normalized, ip, userAgent });
  return NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
}
