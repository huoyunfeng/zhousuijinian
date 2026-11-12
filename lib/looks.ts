/**
 * 风格配方与曝光归一（DEV_SPEC v1.8 8.5.1 / v1.9 4.10.1）。
 * 所有调色参数集中在这里，脚本与页面共用同一份配方。
 */
import sharp from "sharp";
import type { LookKey } from "./types";

export type { LookKey };

export const LOOK_KEYS = ["none", "warm", "film", "mono", "soft", "punch"] as const;

export const LOOK_RECIPE_VERSION = 1;

/** 颗粒：512×512 一张 PNG，模块内只生成一次 */
export const GRAIN = {
  size: 512,
  /** 颗粒最大不透明度 4% */
  alpha: 0.04,
  /** 灰度在 128 上下浮动的幅度 */
  spread: 64,
} as const;

/** 曝光归一参数 */
export const EXPOSURE = {
  target: 0.55,
  floor: 0.08,
  minGain: 0.85,
  maxGain: 1.15,
} as const;

interface SolidLayer {
  color: string;
  blend: sharp.Blend;
}

interface BlurScreen {
  sigma: number;
  opacity: number;
}

export interface LookRecipe {
  grayscale?: boolean;
  linear?: { a: number; b: number };
  modulate?: { brightness?: number; saturation?: number };
  solid?: SolidLayer;
  grain?: boolean;
  blurScreen?: BlurScreen;
}

export const LOOK_CONFIG: Record<LookKey, LookRecipe> = {
  none: {},
  warm: {
    modulate: { brightness: 1.03, saturation: 0.94 },
    linear: { a: 0.95, b: 12 },
    solid: { color: "#FFE3C2", blend: "soft-light" },
  },
  film: {
    modulate: { brightness: 0.98, saturation: 0.85 },
    solid: { color: "#173F3A", blend: "soft-light" },
    grain: true,
  },
  mono: {
    grayscale: true,
    linear: { a: 1.08, b: -8 },
    grain: true,
  },
  soft: {
    modulate: { brightness: 1.05 },
    blurScreen: { sigma: 14, opacity: 0.2 },
  },
  punch: {
    linear: { a: 1.12, b: -14 },
    modulate: { saturation: 1.08 },
  },
};

let grainTask: Promise<Buffer> | null = null;

function grainLayer(): Promise<Buffer> {
  grainTask ??= createGrain();
  return grainTask;
}

async function createGrain(): Promise<Buffer> {
  const { size, alpha, spread } = GRAIN;
  const pixels = Buffer.alloc(size * size * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const value = 128 + Math.round((Math.random() - 0.5) * spread * 2);
    pixels[offset] = value;
    pixels[offset + 1] = value;
    pixels[offset + 2] = value;
    pixels[offset + 3] = Math.round(alpha * 255);
  }
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 128, g: 128, b: 128, alpha: 0 },
    },
  })
    .composite([{ input: pixels, raw: { width: size, height: size, channels: 4 }, blend: "over" }])
    .png()
    .toBuffer();
}

function solidLayer(color: string, width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: color },
  })
    .png()
    .toBuffer();
}

/**
 * 按配方处理一张已经缩放好的图。
 * width/height 用于生成与图同尺寸的纯色 / 颗粒图层。
 */
export async function applyLook(
  image: sharp.Sharp,
  key: LookKey,
  width: number,
  height: number,
): Promise<sharp.Sharp> {
  const recipe = LOOK_CONFIG[key];
  let pipeline = image;
  if (recipe.grayscale) pipeline = pipeline.grayscale();
  if (recipe.linear) pipeline = pipeline.linear(recipe.linear.a, recipe.linear.b);
  if (recipe.modulate) pipeline = pipeline.modulate(recipe.modulate);

  const overlays: sharp.OverlayOptions[] = [];
  if (recipe.solid) {
    overlays.push({
      input: await solidLayer(recipe.solid.color, width, height),
      blend: recipe.solid.blend,
    });
  }
  if (recipe.blurScreen) {
    const { sigma, opacity } = recipe.blurScreen;
    const blurred = await image.clone().blur(sigma).ensureAlpha(opacity).png().toBuffer();
    overlays.push({ input: blurred, blend: "screen" });
  }
  if (recipe.grain) {
    overlays.push({ input: await grainLayer(), tile: true, blend: "over" });
  }

  return overlays.length > 0 ? pipeline.composite(overlays) : pipeline;
}

/**
 * 曝光归一：把画面平均亮度拉向 0.55，增益限制在 0.85–1.15，避免过曝或死黑。
 */
export async function normalizeExposure(
  image: sharp.Sharp,
  _width: number,
  _height: number,
): Promise<sharp.Sharp> {
  const stats = await image.clone().stats();
  const channels = stats.channels.slice(0, 3);
  const sum = channels.reduce((total, channel) => total + channel.mean, 0);
  const mean = sum / channels.length / 255;
  const gain = Math.min(
    EXPOSURE.maxGain,
    Math.max(EXPOSURE.minGain, EXPOSURE.target / Math.max(mean, EXPOSURE.floor)),
  );
  return image.modulate({ brightness: gain });
}
