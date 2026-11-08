"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Activity, Users, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Event {
  id: string;
  type: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  detail?: string;
  at: string;
}
interface AdminData {
  events: Event[];
  counts: Record<string, number>;
  users: {
    email: string;
    role: string;
    createdAt: string;
    hasVault: boolean;
  }[];
}

const LABELS: Record<string, string> = {
  signup: "Sign-ups",
  login_success: "Successful logins",
  login_failed: "Failed logins",
  logout: "Sign-outs",
  reset_requested: "Reset requests",
  reset_completed: "Resets completed",
  vault_saved: "Vault saves",
  breach_checked: "Breach checks",
  rate_limited: "Rate-limit hits",
};

function badgeColor(type: string) {
  if (type === "login_failed" || type === "rate_limited")
    return "text-destructive border-destructive/30 bg-destructive/10";
  if (type === "login_success" || type === "reset_completed")
    return "text-primary border-primary/30 bg-primary/10";
  return "text-muted-foreground border-border bg-muted/40";
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/events")
      .then(async (r) => {
        if (r.status === 403) {
          setForbidden(true);
          return;
        }
        if (r.status === 401) {
          router.replace("/login");
          return;
        }
        setData(await r.json());
      })
      .finally(() => setLoaded(true));
  }, [router]);

  if (!loaded)
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">
        Loading…
      </div>
    );

  if (forbidden)
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <AlertTriangle className="mx-auto mb-3 size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Owner access only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This panel is restricted to the site owner.
        </p>
      </div>
    );

  if (!data) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="size-6 text-primary" /> Owner monitoring panel
        </h1>
        <p className="text-sm text-muted-foreground">
          Security telemetry for abuse monitoring. This panel shows activity
          events only — it cannot reveal any user&apos;s saved passwords (they
          are encrypted on the user&apos;s device) or let anyone sign in as a
          user.
        </p>
      </div>

      {/* Counts */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(LABELS).map(([type, label]) => (
          <Card key={type}>
            <CardContent className="pt-5">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 text-2xl font-semibold">
                {data.counts[type] ?? 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4" /> Registered users ({data.users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Joined</th>
                  <th className="pb-2">Vault</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.email} className="border-t border-border/60">
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{u.role}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {u.hasVault ? "saved (encrypted)" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Event log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" /> Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[480px] space-y-1 overflow-y-auto">
            {data.events.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-2 border-b border-border/40 py-1.5 text-sm"
              >
                <span
                  className={`rounded border px-1.5 py-0.5 text-xs ${badgeColor(
                    e.type
                  )}`}
                >
                  {e.type}
                </span>
                <span className="text-muted-foreground">
                  {new Date(e.at).toLocaleString()}
                </span>
                {e.email && <span>{e.email}</span>}
                {e.ip && (
                  <span className="text-xs text-muted-foreground">
                    {e.ip}
                  </span>
                )}
                {e.detail && (
                  <span className="text-xs text-muted-foreground">
                    ({e.detail})
                  </span>
                )}
              </div>
            ))}
            {data.events.length === 0 && (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
