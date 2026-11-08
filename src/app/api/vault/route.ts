import { NextRequest, NextResponse } from "next/server";
import { currentUser, publicUser } from "@/lib/server/session";
import { upsertUser, logEvent } from "@/lib/server/store";
import { clientInfo } from "@/lib/server/request";

// Max ciphertext size we'll accept (guards against abuse). ~1MB.
const MAX_BLOB = 1_000_000;

export async function GET() {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  // Returns ciphertext only. The server cannot decrypt it.
  return NextResponse.json({ vault: user.vault ?? null });
}

export async function PUT(req: NextRequest) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const blob = body?.vault;

  if (typeof blob !== "string" || blob.length > MAX_BLOB)
    return NextResponse.json({ error: "Invalid vault payload." }, { status: 400 });

  // Basic sanity: must be the opaque envelope shape, never plaintext.
  try {
    const parsed = JSON.parse(blob);
    if (!parsed.ct || !parsed.iv || !parsed.salt) throw new Error("shape");
  } catch {
    return NextResponse.json(
      { error: "Vault must be encrypted client-side." },
      { status: 400 }
    );
  }

  user.vault = blob;
  await upsertUser(user);
  const { ip, userAgent } = clientInfo(req);
  await logEvent({ type: "vault_saved", email: user.email, ip, userAgent });

  return NextResponse.json({ ok: true, user: publicUser(user) });
}
