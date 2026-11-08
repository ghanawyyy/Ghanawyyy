import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/server/session";
import { clientInfo, rateLimit } from "@/lib/server/request";
import { logEvent } from "@/lib/server/store";
import { isEmail, normalizeEmail } from "@/lib/validation";

/**
 * Email-exposure check against Have I Been Pwned's breach API.
 *
 * Privacy guardrails on purpose:
 *   - You must be signed in, and you may ONLY check your OWN account email.
 *     This is not a lookup tool for arbitrary addresses.
 *   - Requires a HIBP API key (HIBP_API_KEY). Without it, the feature is
 *     disabled and we say so honestly rather than faking results.
 *
 * It reports which breaches an address appeared in — it never returns or
 * "recovers" any password, because that is not something that exists to
 * return.
 */

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { ip, userAgent } = clientInfo(req);
  if (!(await rateLimit(`breachemail:${user.id}`, 5, 60_000, { ip }))) {
    return NextResponse.json({ error: "Too many checks." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = body?.email;
  if (!isEmail(email))
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });

  // Enforce: own email only.
  if (normalizeEmail(email) !== user.email) {
    return NextResponse.json(
      { error: "You can only check the email on your own account." },
      { status: 403 }
    );
  }

  const apiKey = process.env.HIBP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        unavailable: true,
        message:
          "Email breach lookup needs a Have I Been Pwned API key (set HIBP_API_KEY). The free password check still works without one.",
      },
      { status: 200 }
    );
  }

  try {
    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(
        user.email
      )}?truncateResponse=false`,
      {
        headers: {
          "hibp-api-key": apiKey,
          "user-agent": "recovery-assistant",
        },
        cache: "no-store",
      }
    );
    await logEvent({
      type: "breach_checked",
      email: user.email,
      ip,
      userAgent,
      detail: "email",
    });
    if (res.status === 404) return NextResponse.json({ breaches: [] });
    if (!res.ok) throw new Error(`HIBP ${res.status}`);
    const data = (await res.json()) as Array<{
      Name: string;
      Title: string;
      BreachDate: string;
      Description: string;
      DataClasses: string[];
    }>;
    return NextResponse.json({
      breaches: data.map((b) => ({
        name: b.Title || b.Name,
        date: b.BreachDate,
        dataClasses: b.DataClasses,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Breach service unavailable.", detail: String(err) },
      { status: 502 }
    );
  }
}
