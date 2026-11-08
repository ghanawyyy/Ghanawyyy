import {
  scrypt as _scrypt,
  randomBytes,
  timingSafeEqual,
  createHmac,
  createHash,
} from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt);

/**
 * Account password hashing (for logging into THIS site).
 * scrypt with a per-user random salt. We store `salt:hash`, never the
 * plaintext password. This is a one-way hash — it cannot be reversed to
 * recover the password, which is exactly the point.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}

/** Single-use reset tokens: we email the raw token, store only its hash. */
export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    // Dev fallback. In production SESSION_SECRET must be set.
    "dev-insecure-secret-change-me"
  );
}

/** Signed session value: `userId.expiry.hmac`. Tamper-evident, stateless. */
export function signSession(userId: string, ttlMs = 1000 * 60 * 60 * 24 * 7) {
  const exp = Date.now() + ttlMs;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const payload = `${userId}.${expStr}`;
  const expected = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Date.now() > Number(expStr)) return null;
  return userId;
}

export function newId(): string {
  return randomBytes(12).toString("hex");
}
