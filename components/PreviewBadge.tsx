"use client";

import { m } from "framer-motion";
import { PREVIEW } from "@/lib/copy";

export function PreviewBadge() {
  return (
    <m.div
      className="preview-badge"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 0.9, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {PREVIEW.badge}
    </m.div>
  );
}
