"use client";

import { useState } from "react";
import { LETTER } from "@/lib/copy";

interface SignatureProps {
  src: string;
}

/**
 * 手写签名图专用：不参与图片管线（不走 manifest，不生成多格式）。
 * 加载失败时不渲染，避免出现破图。
 */
export function Signature({ src }: SignatureProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={src}
      alt={LETTER.handwritingAlt}
      className="signature"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
