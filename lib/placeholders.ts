import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { orderDir } from "./story";

const PALETTES = [
  ["#F6E9E2", "#C0A062"],
  ["#E8EFE6", "#8BA888"],
  ["#F3E7D3", "#C99A63"],
  ["#E6EDF2", "#7E9DB3"],
  ["#F7E4E4", "#C98A8A"],
  ["#EDE8F2", "#9A8CB3"],
  ["#F4EFE2", "#B3A06E"],
  ["#E4F0ED", "#78A99B"],
  ["#F2E6DA", "#B98A63"],
  ["#E7E9F4", "#8288B3"],
  ["#F6EAE3", "#BF8E74"],
  ["#E9F1E4", "#8FAE7C"],
];

function svg(width: number, height: number, from: string, to: string, seed: number): Buffer {
  const cx = width * (0.3 + ((seed * 37) % 40) / 100);
  const cy = height * (0.3 + ((seed * 53) % 40) / 100);
  const r = Math.min(width, height) * (0.22 + ((seed * 17) % 20) / 100);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" opacity="0.28"/>
      <circle cx="${width - cx * 0.6}" cy="${height - cy * 0.5}" r="${r * 0.6}" fill="#FFFFFF" opacity="0.18"/>
    </svg>`,
  );
}

async function writeImage(file: string, width: number, height: number, seed: number): Promise<void> {
  const [from, to] = PALETTES[seed % PALETTES.length];
  await sharp(svg(width, height, from, to, seed)).jpeg({ quality: 90 }).toFile(file);
}

/** 静音 MP3（400 帧 ≈ 10 秒），避免新单打开 404（DEV_SPEC 9.1） */
export function silentMp3(): Buffer {
  const frame = Buffer.alloc(417);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  frame[2] = 0x90;
  frame[3] = 0x00;
  return Buffer.concat(Array.from({ length: 400 }, () => frame));
}

/** 新单占位素材：封面 + 12 个月 + 6 张精选，保证建单后可立刻预览 */
export async function generatePlaceholders(slug: string): Promise<void> {
  const rawDir = path.join(orderDir(slug), "raw");
  fs.mkdirSync(rawDir, { recursive: true });

  await writeImage(path.join(rawDir, "cover.jpg"), 1200, 1500, 0);
  for (let month = 1; month <= 12; month += 1) {
    await writeImage(path.join(rawDir, `m${String(month).padStart(2, "0")}.jpg`), 1000, 1250, month);
  }
  const ratios: Array<[number, number]> = [
    [1000, 1250],
    [1000, 1000],
    [900, 1200],
    [1280, 720],
    [1000, 1250],
    [1000, 1000],
  ];
  for (let index = 1; index <= 6; index += 1) {
    const [width, height] = ratios[index % ratios.length];
    await writeImage(path.join(rawDir, `p${String(index).padStart(2, "0")}.jpg`), width, height, index + 3);
  }
  fs.writeFileSync(path.join(rawDir, "bgm.mp3"), silentMp3());
}
