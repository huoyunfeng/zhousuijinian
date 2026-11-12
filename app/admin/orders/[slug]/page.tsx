import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADMIN, COMMON } from "@/lib/copy";
import { dottedDate } from "@/lib/date";
import { assetChecklist, findOrder, loadStorySafe, readStoryText } from "@/lib/orders";
import { loadManifest, publicOrderDir } from "@/lib/story";
import { OrderTabs } from "@/components/admin/OrderTabs";

export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const { slug } = await params;
  const order = await findOrder(slug);
  if (!order) notFound();

  const storyText = readStoryText(slug) ?? "";
  const loaded = loadStorySafe(slug);
  const manifest = loadManifest(slug);
  const checklist = assetChecklist(slug);
  const thumbs = Object.keys(manifest).slice(0, 24);
  const qrReady = fs.existsSync(path.join(publicOrderDir(slug), "qr.png"));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-[11px] text-ink-3">
            {COMMON.back}
          </Link>
          <h1 className="font-display text-lg">
            {order.babyName} <span className="ml-2 text-xs text-ink-3">{order.slug}</span>
          </h1>
          <p className="text-[11px] text-ink-3">{dottedDate(order.birthday)}</p>
        </div>
        <span className="status-tag" data-status={order.status}>
          {ADMIN.statusLabels[order.status]}
        </span>
      </div>

      <OrderTabs
        order={order}
        story={loaded.ok ? loaded.story : null}
        initialJson={storyText}
        manifest={manifest}
        checklist={checklist}
        thumbs={thumbs}
        qrReady={qrReady}
      />
    </div>
  );
}
