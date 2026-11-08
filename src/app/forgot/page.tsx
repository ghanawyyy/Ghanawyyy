"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmailHistory } from "@/components/email-history";

export default function ForgotPage() {
  const { history, remember } = useEmailHistory();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      remember(email);
      setMessage(
        data.message ||
          "If an account exists for that email, a reset link is on its way."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Enter the email on your account. We&apos;ll send a one-time,
            expiring link so you can set a new password. We never show you the
            old one — it can&apos;t be retrieved.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input
                type="email"
                list="email-history-forgot"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <datalist id="email-history-forgot">
                {history.map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
            </div>
            {message && (
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-sm">
                {message}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
