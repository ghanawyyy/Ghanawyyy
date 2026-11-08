/**
 * Client-side vault encryption.
 *
 * The user's saved passwords are encrypted IN THE BROWSER with a key derived
 * from a master password that never leaves the device. The server only ever
 * receives and stores the resulting ciphertext. This means:
 *   - Neither the site owner nor an attacker who steals the database can read
 *     a user's saved passwords.
 *   - The admin monitoring panel can see security events, but NOT vault
 *     contents — by construction, not by policy.
 *
 * Primitives: PBKDF2 (SHA-256, 210k iterations) -> AES-GCM 256.
 */

const PBKDF2_ITERATIONS = 210_000;

function subtle(): SubtleCrypto {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto is not available in this environment.");
  }
  return window.crypto.subtle;
}

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(
  master: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const baseKey = await subtle().importKey(
    "raw",
    new TextEncoder().encode(master),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return subtle().deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface VaultEntry {
  id: string;
  name: string; // e.g. "Gmail"
  username: string;
  password: string;
  url?: string;
  note?: string;
  updatedAt: string;
}

/** Encrypt the whole vault into a single opaque string. */
export async function encryptVault(
  entries: VaultEntry[],
  master: string
): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(master, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(entries));
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    plaintext
  );
  return JSON.stringify({
    v: 1,
    kdf: "PBKDF2",
    iter: PBKDF2_ITERATIONS,
    salt: toB64(salt.buffer),
    iv: toB64(iv.buffer),
    ct: toB64(ct),
  });
}

export async function decryptVault(
  blob: string,
  master: string
): Promise<VaultEntry[]> {
  const parsed = JSON.parse(blob);
  const salt = fromB64(parsed.salt);
  const iv = fromB64(parsed.iv);
  const key = await deriveKey(master, salt);
  const pt = await subtle().decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    fromB64(parsed.ct) as BufferSource
  );
  return JSON.parse(new TextDecoder().decode(pt)) as VaultEntry[];
}

export function randomId(): string {
  return (
    window.crypto.getRandomValues(new Uint32Array(2))[0].toString(36) +
    Date.now().toString(36)
  );
}

/** Generate a strong random password locally (never sent anywhere). */
export function generatePassword(length = 20): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
  const values = window.crypto.getRandomValues(new Uint32Array(length));
  let out = "";
  for (let i = 0; i < length; i++) out += charset[values[i] % charset.length];
  return out;
}
