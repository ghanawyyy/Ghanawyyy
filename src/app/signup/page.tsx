"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkPassword } from "@/lib/validation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const strength = checkPassword(password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIssues([]);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not sign up.");
        setIssues(data.issues || []);
        return;
      }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Master password
              </label>
              <PasswordInput
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {password && (
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(strength.score / 4) * 100}%`,
                        background:
                          strength.score >= 3
                            ? "var(--primary)"
                            : strength.score === 2
                            ? "#d97706"
                            : "#dc2626",
                      }}
                    />
                  </div>
                  {strength.issues.length > 0 && (
                    <ul className="mt-1 text-xs text-muted-foreground">
                      {strength.issues.map((i) => (
                        <li key={i}>• {i}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                This also unlocks your encrypted vault. We can&apos;t reset it
                for you, so choose something strong you&apos;ll remember.
              </p>
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
                {error}
                {issues.length > 0 && (
                  <ul className="mt-1">
                    {issues.map((i) => (
                      <li key={i}>• {i}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
