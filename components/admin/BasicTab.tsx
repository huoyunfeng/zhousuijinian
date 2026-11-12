"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN, API_ERRORS, COMMON } from "@/lib/copy";
import { canTransition, ORDER_STATUSES, transitionReason } from "@/lib/orderStatus";
import type { AdminOrder } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

interface ApiResponse {
  ok?: boolean;
  error?: { message?: string };
}

interface BasicTabProps {
  order: AdminOrder;
}

export function BasicTab({ order }: BasicTabProps) {
  const router = useRouter();
  const [contact, setContact] = useState(order.contact);
  const [amount, setAmount] = useState((order.amount / 100).toFixed(2));
  const [note, setNote] = useState(order.note);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<OrderStatus | null>(null);

  const patch = async (body: Record<string, unknown>): Promise<boolean> => {
    const response = await fetch(`/api/admin/orders/${order.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as ApiResponse;
    if (!response.ok || payload.ok === false) {
      setMessage(payload.error?.message ?? ADMIN.errors.general);
      return false;
    }
    return true;
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const ok = await patch({
        contact,
        note,
        amount: Math.round(Number(amount || "0") * 100),
      });
      if (ok) {
        setMessage(ADMIN.detail.basic.saved);
        router.refresh();
      }
    } catch {
      setMessage(ADMIN.errors.general);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (next: OrderStatus) => {
    if (statusBusy) return;
    setStatusBusy(next);
    setMessage("");
    try {
      const ok = await patch({ status: next });
      if (ok) router.refresh();
    } catch {
      setMessage(ADMIN.errors.general);
    } finally {
      setStatusBusy(null);
    }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="admin-panel space-y-3">
        <h2 className="font-display text-sm">{ADMIN.detail.basic.title}</h2>
        <label className="block text-xs text-ink-2">
          {ADMIN.detail.basic.contact}
          <input className="admin-input mt-1" value={contact} onChange={(event) => setContact(event.target.value)} />
        </label>
        <label className="block text-xs text-ink-2">
          {ADMIN.detail.basic.amount}
          <input
            className="admin-input mt-1"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="block text-xs text-ink-2">
          {ADMIN.detail.basic.note}
          <textarea
            className="admin-input mt-1 min-h-[64px]"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <p className="text-[11px] text-ink-3">
          {ADMIN.detail.basic.revisions}：{order.revisions}
        </p>
        {order.revisions > 2 ? (
          <p className="text-[11px] text-accent">{ADMIN.detail.basic.revisionWarn}</p>
        ) : null}
        <button type="button" className="admin-btn" onClick={() => void save()} disabled={busy}>
          {busy ? COMMON.loading : ADMIN.detail.basic.save}
        </button>
        {message ? <p className="text-[11px] text-accent">{message}</p> : null}
      </div>

      <div className="admin-panel space-y-3">
        <h2 className="font-display text-sm">{ADMIN.detail.basic.statusTitle}</h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((status) => {
            const reason = transitionReason(order.status, status);
            const enabled = order.status !== status && canTransition(order.status, status);
            return (
              <button
                key={status}
                type="button"
                className="admin-btn admin-btn--ghost"
                disabled={!enabled || statusBusy !== null}
                title={reason ?? ""}
                onClick={() => void changeStatus(status)}
              >
                {statusBusy === status ? COMMON.loading : ADMIN.statusLabels[status]}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-ink-3">{ADMIN.detail.basic.pausedHint}</p>
        {message === API_ERRORS.UNAUTHORIZED ? <p className="text-[11px] text-accent">{message}</p> : null}
      </div>
    </div>
  );
}
