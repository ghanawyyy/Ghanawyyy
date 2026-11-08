"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Remembers the user's OWN emails locally (in their browser) so they don't
 * have to retype them. Stored only in localStorage on this device — never
 * sent to the server, never shared. Cleared with `clear()`.
 */
const KEY = "ra:email-history";
const MAX = 8;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useEmailHistory() {
  // Lazy initialize from storage. On the server `read()` throws/returns [],
  // and the first client render re-reads via the ref sync below.
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    // Hydrate from localStorage after mount (not available during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(read());
  }, []);

  const remember = useCallback((email: string) => {
    const e = email.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    try {
      const next = [e, ...read().filter((x) => x !== e)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
      setHistory(next);
    } catch {
      /* storage unavailable (private mode) — silently skip */
    }
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setHistory([]);
  }, []);

  return { history, remember, clear };
}
