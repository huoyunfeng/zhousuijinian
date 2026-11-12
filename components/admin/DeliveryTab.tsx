"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN, COMMON, OUTRO } from "@/lib/copy";
import { StoryContext } from "@/components/StoryContext";
import { SmartImage } from "@/components/ui/SmartImage";
import { CopyUrlButton } from "@/components/admin/CopyUrlButton";
import { ArchiveButton } from "@/components/admin/ArchiveButton";

interface DeliveryTabProps {
  slug: string;
  qrReady: boolean;
}

interface ApiResponse {
  ok?: boolean;
  data?: { warnings?: string[] };
  error?: { message?: string; detail?: string[] };
}

export function DeliveryTab({ slug, qrReady }: DeliveryTabProps) {
  const router = useRouter();
  const [building, setBuilding] = useState(false);
  const [buildMessage, setBuildMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetting, setResetting] = useState(false);

  const build = async () => {
    if (building) return;
    setBuilding(true);
    setBuildMessage("");
    setWarnings([]);
    try {
      const response = await fetch(`/api/admin/orders/${slug}/build`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok || payload.ok === false) {
        setBuildMessage(payload.error?.message ?? ADMIN.detail.build.failed);
        setWarnings(payload.error?.detail ?? []);
        return;
      }
      const list = payload.data?.warnings ?? [];
      setWarnings(list);
      setBuildMessage(list.length > 0 ? ADMIN.detail.build.warn : ADMIN.detail.build.ok);
      router.refresh();
    } catch {
      setBuildMessage(ADMIN.detail.build.failed);
    } finally {
      setBuilding(false);
    }
  };

  const reset = async () => {
    if (resetting) return;
    setResetting(true);
    setResetMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok || payload.ok === false) {
        setResetMessage(payload.error?.message ?? ADMIN.errors.general);
        return;
      }
      setResetMessage(ADMIN.detail.delivery.resetDone);
      setPassword("");
    } catch {
      setResetMessage(ADMIN.errors.general);
    } finally {
      setResetting(false);
    }
  };

  const previewPath = `/s/${slug}?preview=1`;
  const officialPath = `/s/${slug}`;

  return (
    <div className="space-y-5">
      <div className="admin-panel space-y-3">
        <h2 className="font-display text-sm">{ADMIN.detail.build.title}</h2>
        <button type="button" className="admin-btn" onClick={() => void build()} disabled={building}>
          {building ? ADMIN.detail.build.building : ADMIN.detail.build.action}
        </button>
        {buildMessage ? <p className="text-[11px] text-accent">{buildMessage}</p> : null}
        {warnings.map((warning) => (
          <p key={warning} className="text-[11px] text-ink-2">
            {warning}
          </p>
        ))}
      </div>

      <div className="admin-panel space-y-3">
        <h2 className="font-display text-sm">{ADMIN.detail.delivery.title}</h2>
        <div className="space-y-2 text-xs text-ink-2">
          <div className="flex flex-wrap items-center gap-2">
            <span>{ADMIN.detail.delivery.preview}</span>
            <code className="text-[11px] text-ink-3">{previewPath}</code>
            <a href={previewPath} target="_blank" rel="noreferrer" className="text-accent">
              {COMMON.open}
            </a>
            <CopyUrlButton path={previewPath} className="admin-btn admin-btn--ghost" />
          </div>
          <p className="text-[11px] text-ink-3">{ADMIN.detail.delivery.previewHint}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span>{ADMIN.detail.delivery.official}</span>
            <code className="text-[11px] text-ink-3">{officialPath}</code>
            <a href={officialPath} target="_blank" rel="noreferrer" className="text-accent">
              {COMMON.open}
            </a>
            <CopyUrlButton path={officialPath} className="admin-btn admin-btn--ghost" />
          </div>
        </div>
      </div>

      <div className="admin-panel space-y-3">
        <h2 className="font-display text-sm">{ADMIN.detail.delivery.qr}</h2>
        {qrReady ? (
          <div className="flex items-end gap-4">
            <StoryContext.Provider
              value={{
                slug,
                base: `/orders/${slug}`,
                manifest: {},
                theme: "paper-warm",
                preview: false,
                hero: null,
              }}
            >
              <SmartImage photo={{ src: "qr.png", alt: OUTRO.qrAlt, ratio: "1:1" }} className="w-32" sizes="128px" />
            </StoryContext.Provider>
            <a className="admin-btn admin-btn--ghost" href={`/orders/${slug}/qr.png`} download={`${slug}-qr.png`}>
              {ADMIN.detail.delivery.qrDownload}
            </a>
          </div>
        ) : (
          <p className="text-[11px] text-ink-3">{ADMIN.detail.delivery.qrMissing}</p>
        )}
      </div>

      <div className="admin-panel space-y-3">
        <h2 className="font-display text-sm">{ADMIN.detail.delivery.passwordReset}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="admin-input max-w-[160px]"
            placeholder={ADMIN.detail.delivery.newPassword}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            maxLength={4}
            inputMode="numeric"
          />
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => void reset()}
            disabled={resetting || password.length !== 4}
          >
            {ADMIN.detail.delivery.reset}
          </button>
        </div>
        {resetMessage ? <p className="text-[11px] text-accent">{resetMessage}</p> : null}
      </div>

      <div className="admin-panel space-y-3">
        <h2 className="font-display text-sm">{ADMIN.detail.delivery.archive}</h2>
        <ArchiveButton slug={slug} />
      </div>
    </div>
  );
}
