import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/session";
import { recentEvents, getDB } from "@/lib/server/store";

/**
 * Owner monitoring panel data.
 *
 * Returns SECURITY TELEMETRY ONLY: event types, timestamps, the email tied
 * to each event, IP and user-agent. It deliberately does NOT return:
 *   - any password (none are stored in readable form),
 *   - any vault contents (the server holds only ciphertext it cannot read),
 *   - any session or reset token.
 * The owner monitors for abuse; the owner cannot read users' secrets.
 */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const [events, db] = await Promise.all([recentEvents(300), getDB()]);

  // Aggregate counts for the dashboard header.
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] || 0) + 1;

  const users = db.users.map((u) => ({
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    hasVault: Boolean(u.vault), // whether they saved a vault, not its contents
  }));

  return NextResponse.json({ events, counts, users });
}
