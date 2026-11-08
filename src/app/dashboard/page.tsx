"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VaultManager } from "@/components/vault-manager";
import { BreachCheck } from "@/components/breach-check";
import { RecoveryWizard } from "@/components/recovery-wizard";
import { EmailExposure } from "@/components/email-exposure";

interface Me {
  id: string;
  email: string;
  role: "user" | "admin";
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.replace("/login");
          return;
        }
        setMe(d.user);
      })
      .finally(() => setLoaded(true));
  }, [router]);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!me) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">Your security dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {me.email}
        </p>
      </div>
      <BreachCheck />
      <EmailExposure email={me.email} />
      <VaultManager />
      <RecoveryWizard />
    </div>
  );
}
