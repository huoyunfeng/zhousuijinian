"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN } from "@/lib/copy";

interface ArchiveButtonProps {
  slug: string;
  label?: string;
  className?: string;
}

export function ArchiveButton({ slug, label = ADMIN.detail.delivery.archive, className }: ArchiveButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const archive = async () => {
    if (busy) return;
    if (!window.confirm(ADMIN.detail.delivery.archiveConfirm)) return;
    const typed = window.prompt(ADMIN.detail.delivery.archivePrompt(slug), "");
    if (typed?.trim() !== slug) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${slug}/archive`, { method: "POST" });
      if (!response.ok) {
        setError(ADMIN.detail.delivery.archiveFailed);
        return;
      }
      router.refresh();
    } catch {
      setError(ADMIN.detail.delivery.archiveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        className={className ?? "admin-btn admin-btn--ghost"}
        onClick={() => void archive()}
        disabled={busy}
      >
        {busy ? ADMIN.orders.archiving : label}
      </button>
      {error ? <span className="text-[11px] text-accent">{error}</span> : null}
    </span>
  );
}
