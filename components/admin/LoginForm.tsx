"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ADMIN } from "@/lib/copy";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password || busy || locked > 0) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.replace(params.get("next") ?? "/admin/orders");
        router.refresh();
        return;
      }
      if (response.status === 429) {
        const retry = Number(response.headers.get("Retry-After") ?? "60");
        setLocked(retry > 0 ? retry : 60);
        setError(ADMIN.login.locked(retry > 0 ? retry : 60));
        const timer = window.setInterval(() => {
          setLocked((current) => {
            if (current <= 1) window.clearInterval(timer);
            return Math.max(0, current - 1);
          });
        }, 1000);
        return;
      }
      setError(ADMIN.login.error);
    } catch {
      setError(ADMIN.login.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="admin-panel mx-auto mt-10 max-w-sm space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h1 className="font-display text-lg">{ADMIN.login.title}</h1>
      <label className="block text-xs text-ink-2">
        {ADMIN.login.password}
        <input
          type="password"
          className="admin-input mt-1"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
          autoComplete="current-password"
        />
      </label>
      <button type="submit" className="admin-btn w-full" disabled={busy || locked > 0}>
        {busy ? ADMIN.login.submitting : ADMIN.login.submit}
      </button>
      {error ? <p className="text-xs text-accent">{error}</p> : null}
      <p className="text-[11px] text-ink-3">{ADMIN.login.hint}</p>
    </form>
  );
}
