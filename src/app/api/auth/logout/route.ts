import { NextRequest, NextResponse } from "next/server";
import { clearSession, currentUser } from "@/lib/server/session";
import { logEvent } from "@/lib/server/store";
import { clientInfo } from "@/lib/server/request";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const { ip, userAgent } = clientInfo(req);
  if (user) await logEvent({ type: "logout", email: user.email, ip, userAgent });
  await clearSession();
  return NextResponse.json({ ok: true });
}
