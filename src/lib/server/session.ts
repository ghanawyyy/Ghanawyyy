import { cookies } from "next/headers";
import { signSession, verifySession } from "./crypto";
import { findUserById, type UserRecord } from "./store";

const COOKIE = "session";

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<UserRecord | null> {
  const jar = await cookies();
  const userId = verifySession(jar.get(COOKIE)?.value);
  if (!userId) return null;
  return (await findUserById(userId)) ?? null;
}

/** A user record with no sensitive fields, safe to send to the client. */
export function publicUser(u: UserRecord) {
  return { id: u.id, email: u.email, role: u.role, createdAt: u.createdAt };
}
