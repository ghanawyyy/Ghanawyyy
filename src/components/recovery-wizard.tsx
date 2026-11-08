"use client";

import { useState } from "react";
import { ExternalLink, LifeBuoy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Recovery wizard — links the user to each provider's OFFICIAL recovery flow.
 * We don't recover anything ourselves; the provider verifies ownership.
 */
const providers = [
  {
    name: "Google / Gmail",
    url: "https://accounts.google.com/signin/recovery",
    note: "Use a recovery email/phone or a device you've signed in from.",
  },
  {
    name: "Microsoft / Outlook",
    url: "https://account.live.com/password/reset",
    note: "Microsoft's account recovery form.",
  },
  {
    name: "Apple ID",
    url: "https://iforgot.apple.com/",
    note: "Reset via trusted device or recovery contact.",
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/login/identify",
    note: "Identify your account to start recovery.",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/accounts/password/reset/",
    note: "Reset by email, SMS, or from a logged-in device.",
  },
  {
    name: "X / Twitter",
    url: "https://x.com/account/begin_password_reset",
    note: "Begin password reset.",
  },
];

const checklist = [
  "Add a recovery email and phone number to each important account.",
  "Turn on two-factor authentication (2FA) everywhere it's offered.",
  "Save your 2FA backup codes somewhere safe (your vault works).",
  "Register a security key or passkey as a backup.",
  "Keep one trusted recovery contact where the provider supports it.",
];

export function RecoveryWizard() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="size-4" /> Account recovery & readiness
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Locked out of an account elsewhere? Go straight to that provider&apos;s
          official recovery page — they verify it&apos;s you and let you set a
          new password. No third party (including us) can do this for you.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {providers.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/50"
            >
              <span>
                <span className="font-medium">{p.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {p.note}
                </span>
              </span>
              <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          {open ? "Hide" : "Show"} recovery-readiness checklist
        </button>
        {open && (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {checklist.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="text-primary">✓</span>
                {c}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
