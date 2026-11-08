"use client";

import { useState } from "react";
import { Plus, Trash2, RefreshCw, Save, Lock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  encryptVault,
  decryptVault,
  generatePassword,
  randomId,
  type VaultEntry,
} from "@/lib/crypto-client";

type State = "locked" | "unlocked";

export function VaultManager() {
  const [state, setState] = useState<State>("locked");
  const [master, setMaster] = useState("");
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/vault");
      const data = await res.json();
      if (!data.vault) {
        // New vault.
        setEntries([]);
        setState("unlocked");
        return;
      }
      try {
        const list = await decryptVault(data.vault, master);
        setEntries(list);
        setState("unlocked");
      } catch {
        setError("Wrong master password, or the vault is corrupted.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const blob = await encryptVault(entries, master);
      const res = await fetch("/api/vault", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault: blob }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Could not save vault.");
        return;
      }
      setStatus("Saved. Your vault is encrypted — the server can't read it.");
    } finally {
      setBusy(false);
    }
  }

  function addEntry() {
    setEntries((prev) => [
      {
        id: randomId(),
        name: "",
        username: "",
        password: "",
        url: "",
        note: "",
        updatedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  function update(id: string, patch: Partial<VaultEntry>) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, ...patch, updatedAt: new Date().toISOString() }
          : e
      )
    );
  }

  function remove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function lock() {
    setMaster("");
    setEntries([]);
    setState("locked");
    setStatus(null);
  }

  if (state === "locked") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4" /> Your password vault
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Unlock with your master password. It never leaves your device — it
            decrypts your vault right here in the browser.
          </p>
          <form onSubmit={unlock} className="flex gap-2">
            <PasswordInput
              placeholder="Master password"
              value={master}
              onChange={(e) => setMaster(e.target.value)}
              required
            />
            <Button type="submit" disabled={busy || !master}>
              {busy ? "…" : "Unlock"}
            </Button>
          </form>
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4" /> Your password vault
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addEntry}>
              <Plus className="size-4" /> Add
            </Button>
            <Button size="sm" onClick={save} disabled={busy}>
              <Save className="size-4" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={lock}>
              Lock
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {status && (
          <div className="rounded-lg border border-border bg-muted/40 p-2 text-xs">
            {status}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No saved passwords yet. Click “Add” to store one. Everything is
            encrypted before it leaves your device.
          </p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-lg border border-border p-3 space-y-2"
          >
            <div className="flex gap-2">
              <Input
                placeholder="App or site (e.g. Gmail)"
                value={entry.name}
                onChange={(e) => update(entry.id, { name: e.target.value })}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => remove(entry.id)}
                aria-label="Delete entry"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Input
              placeholder="Username or email"
              value={entry.username}
              onChange={(e) => update(entry.id, { username: e.target.value })}
            />
            <div className="flex gap-2">
              <PasswordInput
                placeholder="Password"
                value={entry.password}
                onChange={(e) =>
                  update(entry.id, { password: e.target.value })
                }
              />
              <Button
                size="icon"
                variant="outline"
                aria-label="Generate strong password"
                onClick={() =>
                  update(entry.id, { password: generatePassword() })
                }
              >
                <RefreshCw className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Copy password"
                onClick={() =>
                  navigator.clipboard?.writeText(entry.password)
                }
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <Input
              placeholder="URL (optional)"
              value={entry.url}
              onChange={(e) => update(entry.id, { url: e.target.value })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
