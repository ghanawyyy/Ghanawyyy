import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, upsertUser, logEvent } from "@/lib/server/store";
import { hashPassword, newId } from "@/lib/server/crypto";
import { setSession } from "@/lib/server/session";
import { clientInfo, rateLimit } from "@/lib/server/request";
import { isEmail, normalizeEmail, checkPassword } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { ip, userAgent } = clientInfo(req);
  if (!(await rateLimit(`signup:${ip}`, 10, 60_000, { ip }))) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (!isEmail(email))
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const strength = checkPassword(String(password ?? ""));
  if (!strength.ok)
    return NextResponse.json(
      { error: "Password too weak.", issues: strength.issues },
      { status: 400 }
    );

  const normalized = normalizeEmail(email);
  if (await findUserByEmail(normalized)) {
    // Don't reveal which emails are registered.
    return NextResponse.json(
      { error: "Could not create account with that email." },
      { status: 409 }
    );
  }

  // First user becomes admin so the owner can reach the monitoring panel.
  const { users } = await import("@/lib/server/store").then((m) => m.getDB());
  const role = users.length === 0 ? "admin" : "user";

  const user = {
    id: newId(),
    email: normalized,
    passwordHash: await hashPassword(String(password)),
    role: role as "user" | "admin",
    createdAt: new Date().toISOString(),
  };
  await upsertUser(user);
  await logEvent({ type: "signup", email: normalized, ip, userAgent });
  await setSession(user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
}
