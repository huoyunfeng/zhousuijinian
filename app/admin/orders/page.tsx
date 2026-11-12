import Link from "next/link";
import { ADMIN } from "@/lib/copy";
import { dottedDate } from "@/lib/date";
import { daysToBirthday, listOrders, orderStats } from "@/lib/orders";
import { CopyUrlButton } from "@/components/admin/CopyUrlButton";
import { ArchiveButton } from "@/components/admin/ArchiveButton";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const [orders, stats] = await Promise.all([listOrders(), orderStats()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg">{ADMIN.orders.title}</h1>
        <Link href="/admin/orders/new" className="admin-btn">
          {ADMIN.orders.newOrder}
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["month", "pending", "overdue"] as const).map((key) => (
          <div key={key} className="admin-panel">
            <p className="text-[11px] text-ink-3">{ADMIN.orders.stats[key]}</p>
            <p className="font-num text-2xl">{stats[key]}</p>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="admin-panel text-sm text-ink-2">{ADMIN.orders.empty}</div>
      ) : (
        <div className="admin-panel overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-line text-ink-3">
              <tr>
                <th className="px-4 py-3 font-normal">{ADMIN.orders.columns.baby}</th>
                <th className="px-4 py-3 font-normal">{ADMIN.orders.columns.status}</th>
                <th className="px-4 py-3 font-normal">{ADMIN.orders.columns.birthday}</th>
                <th className="px-4 py-3 font-normal">{ADMIN.orders.columns.countdown}</th>
                <th className="px-4 py-3 font-normal">{ADMIN.orders.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const days = daysToBirthday(order.birthday);
                return (
                  <tr key={order.slug} className="border-b border-line last:border-none">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.slug}`} className="font-display text-sm text-ink">
                        {order.babyName}
                      </Link>
                      <p className="text-[11px] text-ink-3">{order.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="status-tag" data-status={order.status}>
                        {ADMIN.statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{dottedDate(order.birthday)}</td>
                    <td className={days < 0 ? "px-4 py-3 text-accent" : "px-4 py-3 text-ink-2"}>
                      {ADMIN.orders.countdown(days)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/orders/${order.slug}`} className="admin-btn admin-btn--ghost">
                          {ADMIN.orders.open}
                        </Link>
                        <CopyUrlButton path={`/s/${order.slug}`} label={ADMIN.orders.copyLink} />
                        <ArchiveButton slug={order.slug} label={ADMIN.orders.archive} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
