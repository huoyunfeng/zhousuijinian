"use client";

import { useState } from "react";
import { COMMON } from "@/lib/copy";

interface CopyUrlButtonProps {
  path: string;
  label?: string;
  className?: string;
}

/** 复制当前域名 + path（页面渲染阶段不用 window，避免 hydration 不一致） */
export function CopyUrlButton({ path, label = COMMON.copy, className }: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" className={className ?? "admin-btn admin-btn--ghost"} onClick={() => void copy()}>
      {copied ? COMMON.copied : label}
    </button>
  );
}
