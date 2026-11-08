import { NextRequest } from "next/server";
import { logEvent } from "./store";

export function clientInfo(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  return { ip, userAgent };
}

// Simple fixed-window in-memory rate limiter. Per-process only; for a
// multi-node deploy, back this with Redis. Good enough to blunt brute force.
const buckets = new Map<string, { count: number; reset: number }>();

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  meta?: { ip?: string; email?: string }
): Promise<boolean> {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  if (b.count > limit) {
    await logEvent({
      type: "rate_limited",
      ip: meta?.ip,
      email: meta?.email,
      detail: key,
    });
    return false;
  }
  return true;
}
