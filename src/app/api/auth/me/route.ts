import { NextResponse } from "next/server";
import { currentUser, publicUser } from "@/lib/server/session";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: publicUser(user) });
}
