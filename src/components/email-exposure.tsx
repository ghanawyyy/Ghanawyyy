"use client";

import { useState } from "react";
import { Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Breach {
  name: string;
  date: string;
  dataClasses: string[];
}

export function EmailExposure({ email }: { email: string }) {
  const [result, setResult] = useState<
    | { breaches: Breach[] }
    | { unavailable: true; message: string }
    | { error: string }
    | null
  >(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/breach/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
          <Mail className="size-4" /> Where is my email exposed?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Checks whether <strong>{email}</strong> (your own account email)
          appeared in known data breaches. It lists the breaches so you know
          which services to secure — it never retrieves any password.
        </p>
        <Button onClick={check} disabled={busy}>
          {busy ? "Checking…" : "Check my email"}
        </Button>

        {result && "error" in result && (
          <p className="mt-3 text-sm text-destructive">{result.error}</p>
        )}
        {result && "unavailable" in result && (
          <p className="mt-3 text-sm text-muted-foreground">
            {result.message}
          </p>
        )}
        {result && "breaches" in result && (
          <div className="mt-3">
            {result.breaches.length === 0 ? (
              <p className="text-sm">
                No known breaches found for your email. 🎉
              </p>
            ) : (
              <ul className="space-y-2">
                {result.breaches.map((b) => (
                  <li
                    key={b.name}
                    className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
                  >
                    <div className="flex items-center gap-2 font-medium text-destructive">
                      <ShieldAlert className="size-4" /> {b.name}
                      <span className="font-normal text-muted-foreground">
                        {b.date}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Exposed: {b.dataClasses.join(", ")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
