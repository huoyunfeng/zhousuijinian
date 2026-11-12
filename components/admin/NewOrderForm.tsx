"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { ADMIN, COMMON } from "@/lib/copy";
import { THEMES } from "@/lib/theme";
import type { ThemeKey } from "@/lib/types";

interface CreateResponse {
  ok?: boolean;
  data?: { slug?: string };
  error?: { message?: string };
}

function slugFromBirthday(birthday: string): string {
  return birthday ? `bb-${birthday.replaceAll("-", "")}` : "";
}

function passwordFromBirthday(birthday: string): string {
  if (!birthday) return "";
  return `${birthday.slice(5, 7)}${birthday.slice(8, 10)}`;
}

export function NewOrderForm() {
  const router = useRouter();
  const [babyName, setBabyName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("paper-warm");
  const [tier, setTier] = useState<"basic" | "plus">("basic");
  const [deposit, setDeposit] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const changeBirthday = (value: string) => {
    setBirthday(value);
    if (!slugTouched) setSlug(slugFromBirthday(value));
    if (!passwordTouched) setPassword(passwordFromBirthday(value));
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyName,
          birthday,
          slug: slug || undefined,
          theme,
          tier,
          password,
          deposit: Number(deposit || "0"),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as CreateResponse;
      if (!response.ok || payload.ok === false || !payload.data?.slug) {
        setError(payload.error?.message ?? ADMIN.newOrder.error);
        return;
      }
      router.push(`/admin/orders/${payload.data.slug}`);
      router.refresh();
    } catch {
      setError(ADMIN.newOrder.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="admin-panel max-w-2xl space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h1 className="font-display text-lg">{ADMIN.newOrder.title}</h1>

      <label className="block text-xs text-ink-2">
        {ADMIN.newOrder.babyName}
        <input className="admin-input mt-1" value={babyName} onChange={(event) => setBabyName(event.target.value)} maxLength={8} />
      </label>

      <label className="block text-xs text-ink-2">
        {ADMIN.newOrder.birthday}
        <input
          type="date"
          className="admin-input mt-1"
          value={birthday}
          onChange={(event) => changeBirthday(event.target.value)}
        />
      </label>

      <label className="block text-xs text-ink-2">
        {ADMIN.newOrder.slug}
        <input
          className="admin-input mt-1"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value.toLowerCase());
          }}
        />
        <span className="mt-1 block text-[11px] text-ink-3">{ADMIN.newOrder.slugHint}</span>
      </label>

      <div className="text-xs text-ink-2">
        {ADMIN.newOrder.theme}
        <div className="mt-1 grid grid-cols-3 gap-2">
          {THEMES.map((key) => (
            <button
              key={key}
              type="button"
              data-theme={key}
              onClick={() => setTheme(key)}
              className={clsx(
                "rounded-md border bg-bg p-2 text-left",
                theme === key ? "border-accent" : "border-line",
              )}
            >
              <span className="block rounded-sm border border-line bg-surface p-2">
                <span className="block h-8 rounded-sm bg-accent-soft" />
                <span className="mt-2 block h-1 w-8 bg-accent" />
              </span>
              <span className="mt-1 block text-[11px] text-ink-2">{ADMIN.newOrder.themeLabels[key]}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="block text-xs text-ink-2">
        {ADMIN.newOrder.password}
        <input
          className="admin-input mt-1 max-w-[160px]"
          value={password}
          maxLength={4}
          inputMode="numeric"
          onChange={(event) => {
            setPasswordTouched(true);
            setPassword(event.target.value.replace(/\D/g, ""));
          }}
        />
      </label>

      <div className="flex flex-wrap gap-6">
        <label className="block text-xs text-ink-2">
          {ADMIN.newOrder.tier}
          <select className="admin-select mt-1" value={tier} onChange={(event) => setTier(event.target.value === "plus" ? "plus" : "basic")}>
            <option value="basic">{ADMIN.newOrder.tierLabels.basic}</option>
            <option value="plus">{ADMIN.newOrder.tierLabels.plus}</option>
          </select>
        </label>
        <label className="block text-xs text-ink-2">
          {ADMIN.newOrder.deposit}
          <input
            className="admin-input mt-1 max-w-[160px]"
            inputMode="decimal"
            value={deposit}
            onChange={(event) => setDeposit(event.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="admin-btn" disabled={busy || !babyName || !birthday || password.length !== 4}>
          {busy ? ADMIN.newOrder.submitting : ADMIN.newOrder.submit}
        </button>
        <Link href="/admin/orders" className="text-xs text-ink-3">
          {COMMON.back}
        </Link>
      </div>
      {error ? <p className="text-[11px] text-accent">{error}</p> : null}
    </form>
  );
}
