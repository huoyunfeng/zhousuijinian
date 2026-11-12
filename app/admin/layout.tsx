import Link from "next/link";
import { ADMIN, SITE } from "@/lib/copy";

export const metadata = {
  title: `${ADMIN.brand} · ${SITE.name}`,
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="paper-warm" className="admin-shell">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <Link href="/admin/orders" className="font-display text-base tracking-wide">
            {ADMIN.brand}
          </Link>
          <nav className="flex items-center gap-4 text-xs text-ink-2">
            <Link href="/admin/orders">{ADMIN.nav.orders}</Link>
            <Link href="/admin/orders/new">{ADMIN.nav.newOrder}</Link>
            <Link href="/" target="_blank" rel="noreferrer">
              {ADMIN.nav.site}
            </Link>
            <a href="/api/admin/logout" className="text-ink-3">
              {ADMIN.nav.logout}
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
