"use client";

import { useState } from "react";
import { COMMON } from "@/lib/copy";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label = COMMON.copy, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
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
