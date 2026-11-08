import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  Mail,
  Search,
  Lock,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Search,
    title: "Breach exposure check",
    body: "See if your password or email has turned up in a known data breach — using privacy-preserving k-anonymity, so your full password never leaves your device.",
  },
  {
    icon: Mail,
    title: "Password reset by email",
    body: "Locked out? Get a one-time, expiring reset link at the email on your account and set a new password. We prove it's you — we never reveal the old one.",
  },
  {
    icon: Lock,
    title: "Encrypted password vault",
    body: "Save your own passwords, encrypted in your browser with a master key only you hold. The server stores ciphertext it cannot read.",
  },
  {
    icon: Eye,
    title: "Show / hide on every field",
    body: "A visibility toggle on every password input, so you can check what you typed and hide it again.",
  },
  {
    icon: KeyRound,
    title: "Recovery readiness",
    body: "A checklist that links you straight to each provider's official recovery flow, and flags whether you have 2FA and a recovery email set up.",
  },
  {
    icon: ShieldCheck,
    title: "Free, forever",
    body: "No plans, no paywalls. Every feature is available to everyone at no cost.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="py-16 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="size-6 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Get back into your accounts — safely.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Recovery Assistant helps you check where your email and passwords are
          exposed, reset your password the right way, and keep your own
          passwords in an encrypted vault. We never retrieve or reveal a
          password — because that can&apos;t be done safely. We help you
          re-prove ownership and set a new one.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup">
            <Button size="lg">Get started free</Button>
          </Link>
          <Link href="/forgot">
            <Button size="lg" variant="outline">
              Reset a password
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="pt-5">
              <f.icon className="mb-3 size-5 text-primary" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mb-16 rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        <h2 className="mb-2 font-semibold text-foreground">
          How recovery actually works
        </h2>
        <p>
          Passwords are stored by every real service as one-way hashes, so they
          cannot be &quot;looked up&quot; or recovered — not by us, not by
          anyone. The only safe way back into an account is to prove you own it
          (via a reset link to your recovery email or phone, backup codes, or a
          security key) and then set a new password. This tool walks you through
          exactly that, and helps you set up recovery options before you&apos;re
          ever locked out.
        </p>
      </section>
    </div>
  );
}
