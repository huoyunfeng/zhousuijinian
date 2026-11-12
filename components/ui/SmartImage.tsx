"use client";

import clsx from "clsx";
import type { CSSProperties } from "react";
import { imageSources, photoKey, RATIO_VALUES } from "@/lib/images";
import type { Photo } from "@/lib/types";
import { useStoryUi } from "@/components/StoryContext";

interface SmartImageProps {
  photo: Photo;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  fit?: "cover" | "contain";
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
}

/**
 * 全站唯一图片出口（DEV_SPEC 0.5 / 8.5）。
 * <picture> 输出 AVIF → WebP → JPG，三档 srcset，LQIP 占位，禁止 CLS。
 */
export function SmartImage({
  photo,
  sizes = "(max-width: 768px) 100vw, 720px",
  priority = false,
  fill = false,
  fit = "cover",
  className,
  imgClassName,
  style,
}: SmartImageProps) {
  const { base, manifest } = useStoryUi();

  if (!photo.src) {
    return <div className={clsx("skeleton", className)} style={{ aspectRatio: RATIO_VALUES[photo.ratio], ...style }} />;
  }

  const sources = imageSources(base, photo.src);
  const entry = manifest[photoKey(photo.src)];
  const aspect = RATIO_VALUES[photo.ratio];
  const wrapperStyle: CSSProperties = {
    ...(fill ? {} : { aspectRatio: aspect }),
    ...(entry?.lqip ? { backgroundImage: `url(${entry.lqip})`, backgroundSize: "cover", backgroundPosition: "center 30%" } : {}),
    ...style,
  };

  const loading = priority ? "eager" : "lazy";

  if (!entry) {
    return (
      <div
        className={clsx("smart-image", fill && "smart-image--fill", fit === "contain" && "smart-image--contain", className)}
        style={wrapperStyle}
      >
        {/* 没有 manifest 的图片（二维码等）：直接单源输出 */}
        <img
          src={sources.original}
          alt={photo.alt}
          loading={loading}
          decoding="async"
          className={imgClassName}
          style={fill ? { height: "100%" } : undefined}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx("smart-image", fill && "smart-image--fill", fit === "contain" && "smart-image--contain", className)}
      style={wrapperStyle}
    >
      <picture>
        <source type="image/avif" srcSet={sources.avif} sizes={sizes} />
        <source type="image/webp" srcSet={sources.webpSet} sizes={sizes} />
        <img
          src={sources.jpg}
          alt={photo.alt}
          width={entry.w}
          height={entry.h}
          loading={loading}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className={imgClassName}
          style={fill ? { height: "100%", width: "100%" } : undefined}
        />
      </picture>
    </div>
  );
}
