"use client";

import { useState } from "react";
import clsx from "clsx";
import { ADMIN } from "@/lib/copy";
import type { AdminOrder, AssetCheckItem } from "@/lib/orders";
import type { ImageManifest, Story } from "@/lib/types";
import { BasicTab } from "@/components/admin/BasicTab";
import { AssetsTab } from "@/components/admin/AssetsTab";
import { ContentTab } from "@/components/admin/ContentTab";
import { DeliveryTab } from "@/components/admin/DeliveryTab";

type TabKey = "basic" | "assets" | "content" | "delivery";

const TABS: TabKey[] = ["basic", "assets", "content", "delivery"];

interface OrderTabsProps {
  order: AdminOrder;
  story: Story | null;
  initialJson: string;
  manifest: ImageManifest;
  checklist: AssetCheckItem[];
  thumbs: string[];
  qrReady: boolean;
}

export function OrderTabs({ order, story, initialJson, manifest, checklist, thumbs, qrReady }: OrderTabsProps) {
  const [tab, setTab] = useState<TabKey>("basic");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-line pb-2">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={clsx(
              "rounded-sm border px-3 py-1.5 text-xs",
              tab === key ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2",
            )}
          >
            {ADMIN.detail.tabs[key]}
          </button>
        ))}
      </div>

      {tab === "basic" ? <BasicTab order={order} /> : null}
      {tab === "assets" ? (
        <AssetsTab slug={order.slug} manifest={manifest} thumbs={thumbs} checklist={checklist} />
      ) : null}
      {tab === "content" ? <ContentTab slug={order.slug} story={story} initialJson={initialJson} /> : null}
      {tab === "delivery" ? <DeliveryTab slug={order.slug} qrReady={qrReady} /> : null}
    </div>
  );
}
