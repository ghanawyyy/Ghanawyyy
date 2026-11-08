"use client";

import { useState } from "react";
import { Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function sha1Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export function BreachCheck() {
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<
    | { pwned: boolean; count: number }
    | { error: string }
    | null
  >(null);
  const [busy, setBusy] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      // k-anonymity: hash locally, send only the 5-char prefix.
      const hash = await sha1Hex(password);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);
      const res = await fetch("/api/breach/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, suffix }),
      });
      const data = await res.json();
      setResult(res.ok ? data : { error: data.error || "Check failed." });
    } catch {
      setResult({ error: "Could not run the check." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="size-4" /> Is this password in a breach?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Your password is hashed in your browser; only the first 5 characters
          of the hash are sent. The password itself never leaves your device.
        </p>
        <form onSubmit={check} className="flex gap-2">
          <PasswordInput
            placeholder="Password to check"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={busy || !password}>
            {busy ? "…" : "Check"}
          </Button>
        </form>
        {result && "error" in result && (
          <p className="mt-3 text-sm text-destructive">{result.error}</p>
        )}
        {result && "pwned" in result && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-lg border p-3 text-sm ${
              result.pwned
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-border bg-muted/40"
            }`}
          >
            {result.pwned ? (
              <>
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  Found in breaches <strong>{result.count.toLocaleString()}</strong>{" "}
                  times. Don&apos;t use it anywhere — change it and pick a unique
                  one. Generate a strong replacement in your vault.
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <span>
                  Not found in known breaches. That&apos;s a good sign — still
                  keep it unique to one account.
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
