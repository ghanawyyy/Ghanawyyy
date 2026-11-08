import { promises as fs } from "fs";
import path from "path";

/**
 * Minimal JSON file store.
 *
 * This is intentionally simple so the project runs with zero external
 * services. For production, swap this module for a real database
 * (Postgres, SQLite, etc.) — the exported function surface is small on
 * purpose so the rest of the app does not need to change.
 *
 * SECURITY NOTE: this store only ever holds:
 *   - user records: email, scrypt password hash (never plaintext), role
 *   - a single opaque, client-encrypted vault blob per user (ciphertext)
 *   - security event telemetry (no secrets)
 * It never holds a readable password for any user or any third-party account.
 */

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), ".data");

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string; // scrypt, salted — see crypto.ts
  role: "user" | "admin";
  createdAt: string;
  // Opaque ciphertext of the user's vault. The server cannot decrypt this.
  vault?: string;
  // Hashed, single-use password-reset token (never the raw token).
  resetTokenHash?: string;
  resetTokenExpires?: number;
}

export interface SecurityEvent {
  id: string;
  type:
    | "signup"
    | "login_success"
    | "login_failed"
    | "logout"
    | "reset_requested"
    | "reset_completed"
    | "vault_saved"
    | "breach_checked"
    | "rate_limited";
  email?: string;
  ip?: string;
  userAgent?: string;
  detail?: string;
  at: string;
}

interface DB {
  users: UserRecord[];
  events: SecurityEvent[];
}

const USERS_FILE = path.join(DATA_DIR, "users.json");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown) {
  await ensureDir();
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file);
}

// Serialize writes within a single process to avoid lost updates.
let chain: Promise<unknown> = Promise.resolve();
function queue<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next as Promise<T>;
}

export async function getDB(): Promise<DB> {
  const [users, events] = await Promise.all([
    readJson<UserRecord[]>(USERS_FILE, []),
    readJson<SecurityEvent[]>(EVENTS_FILE, []),
  ]);
  return { users, events };
}

export async function findUserByEmail(
  email: string
): Promise<UserRecord | undefined> {
  const { users } = await getDB();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email === normalized);
}

export async function findUserById(
  id: string
): Promise<UserRecord | undefined> {
  const { users } = await getDB();
  return users.find((u) => u.id === id);
}

export async function upsertUser(user: UserRecord): Promise<void> {
  await queue(async () => {
    const users = await readJson<UserRecord[]>(USERS_FILE, []);
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    await writeJson(USERS_FILE, users);
  });
}

export async function logEvent(
  event: Omit<SecurityEvent, "id" | "at"> & { at?: string }
): Promise<void> {
  await queue(async () => {
    const events = await readJson<SecurityEvent[]>(EVENTS_FILE, []);
    events.push({
      ...event,
      id: cryptoRandom(),
      at: event.at ?? new Date().toISOString(),
    });
    // Keep the log bounded.
    const trimmed = events.slice(-5000);
    await writeJson(EVENTS_FILE, trimmed);
  });
}

export async function recentEvents(limit = 200): Promise<SecurityEvent[]> {
  const { events } = await getDB();
  return events.slice(-limit).reverse();
}

function cryptoRandom(): string {
  // Lazy import to keep this file usable in edge-less contexts.
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}
