export function isEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) &&
    value.length <= 254
  );
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export interface PasswordCheck {
  ok: boolean;
  score: number; // 0-4
  issues: string[];
}

/** Honest, local password strength feedback. No network, no storage. */
export function checkPassword(pw: string): PasswordCheck {
  const issues: string[] = [];
  if (pw.length < 12) issues.push("Use at least 12 characters.");
  if (!/[a-z]/.test(pw)) issues.push("Add a lowercase letter.");
  if (!/[A-Z]/.test(pw)) issues.push("Add an uppercase letter.");
  if (!/[0-9]/.test(pw)) issues.push("Add a number.");
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push("Add a symbol.");
  const common = [
    "password",
    "123456",
    "qwerty",
    "letmein",
    "welcome",
    "admin",
  ];
  if (common.some((c) => pw.toLowerCase().includes(c)))
    issues.push("Avoid common words like “password” or “123456”.");

  let score = 0;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (common.some((c) => pw.toLowerCase().includes(c))) score = Math.min(score, 1);

  return { ok: pw.length >= 12 && issues.length === 0, score, issues };
}
