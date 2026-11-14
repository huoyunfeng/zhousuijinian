import type { Ratio } from "./types";

/**
 * 图片档位与 URL 约定（DEV_SPEC 8.5）
 * public/orders/{slug}/{key}-lg.avif / -lg.webp / -lg.jpg / -md.webp / -sm.webp
 */
export const RATIO_VALUES: Record<Ratio, string> = {
  "1:1": "1 / 1",
  "4:5": "4 / 5",
  "3:4": "3 / 4",
  "16:9": "16 / 9",
};

export function photoKey(src: string): string {
  return src.replace(/\.[a-z0-9]+$/i, "");
}

export interface ImageSources {
  avif: string;
  webp: string;
  webpSet: string;
  jpg: string;
  original: string;
}

export function imageSources(base: string, src: string, version?: string): ImageSources {
  const key = photoKey(src);
  const suffix = version ? `?v=${encodeURIComponent(version)}` : "";
  const url = (name: string) => `${base}/${key}-${name}${suffix}`;
  return {
    avif: url("lg.avif"),
    webp: url("lg.webp"),
    webpSet: `${url("lg.webp")} 1600w, ${url("md.webp")} 900w, ${url("sm.webp")} 320w`,
    jpg: url("lg.jpg"),
    original: `${base}/${src}${suffix}`,
  };
}
