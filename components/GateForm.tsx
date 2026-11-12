"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GATE } from "@/lib/copy";

interface GateFormProps {
  slug: string;
  name: string;
}

export function GateForm({ slug, name }: GateFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (locked <= 0) return;
    const timer = window.setInterval(() => {
      setLocked((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [locked]);

  const submit = useCallback(
    async (password: string) => {
      if (submitting || locked > 0) return;
      setSubmitting(true);
      setError("");
      try {
        const response = await fetch("/api/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, password }),
        });
        if (response.ok) {
          router.replace(`/s/${slug}`);
          router.refresh();
          return;
        }
        if (response.status === 429) {
          const retry = Number(response.headers.get("Retry-After") ?? "60");
          setLocked(Number.isFinite(retry) && retry > 0 ? retry : 60);
          setError(GATE.locked(Number.isFinite(retry) && retry > 0 ? retry : 60));
          return;
        }
        setShaking(true);
        setError(GATE.error);
        window.setTimeout(() => setShaking(false), 700);
        window.setTimeout(() => {
          setValue("");
          inputRef.current?.focus();
        }, 1200);
      } catch {
        setError(GATE.error);
      } finally {
        setSubmitting(false);
      }
    },
    [locked, router, slug, submitting],
  );

  const handleChange = (next: string) => {
    const digits = next.replace(/\D/g, "").slice(0, 4);
    setValue(digits);
    setError("");
    if (digits.length === 4) void submit(digits);
  };

  return (
    <main className="gate">
      <div className="gate__inner">
        <h1 className="gate__name">{name}</h1>
        <p className="gate__hint">{GATE.hint}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(value);
          }}
        >
          <label htmlFor="gate-password" className="sr-only">
            {GATE.hint}
          </label>
          <input
            ref={inputRef}
            id="gate-password"
            className={`gate__input ${shaking ? "shake" : ""}`}
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            disabled={locked > 0 || submitting}
            aria-describedby="gate-error"
          />
          <div id="gate-error" className="gate__error" role="alert">
            {locked > 0 ? GATE.locked(locked) : error}
          </div>
        </form>
        <p className="gate__help">{GATE.help}</p>
      </div>
    </main>
  );
}
