import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { clientInfo, rateLimit } from "@/lib/server/request";
import { logEvent } from "@/lib/server/store";

/**
 * Pwned Passwords check using k-anonymity.
 *
 * The browser hashes the password with SHA-1 and sends only the FIRST 5
 * hex characters of the hash to this route; we forward only that prefix to
 * Have I Been Pwned's free range API. HIBP returns all hash suffixes that
 * share the prefix, and we match locally. The full password — and the full
 * hash — never leave the user's control. This is the industry-standard
 * privacy-preserving way to check breach exposure.
 *
 * Reference: https://haveibeenpwned.com/API/v3#PwnedPasswords
 */

export async function POST(req: NextRequest) {
  const { ip, userAgent } = clientInfo(req);
  if (!(await rateLimit(`breachpw:${ip}`, 30, 60_000, { ip }))) {
    return NextResponse.json({ error: "Too many checks." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  // Client may send a precomputed SHA-1 prefix+suffix, or (fallback) a
  // password we hash server-side and immediately discard. Prefer the former.
  let prefix: string | undefined = body?.prefix;
  let suffix: string | undefined = body?.suffix;

  if ((!prefix || !suffix) && typeof body?.password === "string") {
    const hash = createHash("sha1")
      .update(body.password)
      .digest("hex")
      .toUpperCase();
    prefix = hash.slice(0, 5);
    suffix = hash.slice(5);
  }

  if (!prefix || !suffix || !/^[0-9A-F]{5}$/.test(prefix)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      { headers: { "Add-Padding": "true" }, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HIBP ${res.status}`);
    const text = await res.text();
    let count = 0;
    for (const line of text.split("\n")) {
      const [suf, c] = line.trim().split(":");
      if (suf && suf.toUpperCase() === suffix.toUpperCase()) {
        count = parseInt(c, 10) || 0;
        break;
      }
    }
    await logEvent({
      type: "breach_checked",
      ip,
      userAgent,
      detail: "pwned-passwords",
    });
    return NextResponse.json({ pwned: count > 0, count });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Couldn't reach the breach database right now. Check your network policy or try again.",
        detail: String(err),
      },
      { status: 502 }
    );
  }
}
