/**
 * 海报生成（DEV_SPEC 6.9 / 8.7）
 * 纯函数部分可单测；Canvas 部分只在浏览器执行。
 */

export function truncateLine(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

/** 按最大字数切成最多 N 行，超出的最后一行加省略号 */
export function truncateLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length === 0) return [];
  const lines: string[] = [];
  let cursor = 0;
  while (cursor < clean.length && lines.length < maxLines) {
    const isLast = lines.length === maxLines - 1;
    if (isLast) {
      lines.push(truncateLine(clean.slice(cursor), maxCharsPerLine));
      break;
    }
    lines.push(clean.slice(cursor, cursor + maxCharsPerLine));
    cursor += maxCharsPerLine;
  }
  return lines;
}

export interface PosterInput {
  cover: HTMLImageElement;
  qr: HTMLImageElement;
  name: string;
  dateLine: string;
  tagline: string;
}

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1920;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image load failed"));
    image.src = src;
  });
}

export async function loadPosterImages(coverUrl: string, qrUrl: string): Promise<{ cover: HTMLImageElement; qr: HTMLImageElement }> {
  const [cover, qr] = await Promise.all([loadImage(coverUrl), loadImage(qrUrl)]);
  return { cover, qr };
}

export interface ZhuazhouPosterInput {
  label: string;
  fortune: string;
  meaning: string;
  name: string;
  accent: string;
  ink: string;
  background: string;
}

/** 抓周结果海报 1080×1350（DEV_SPEC 6.4） */
export function drawZhuazhouPoster(canvas: HTMLCanvasElement, input: ZhuazhouPosterInput): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  canvas.width = 1080;
  canvas.height = 1350;

  ctx.fillStyle = input.background;
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.strokeStyle = input.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, 984, 1254);

  ctx.textAlign = "center";
  ctx.fillStyle = input.ink;
  ctx.font = '96px "Songti SC", "STSong", "SimSun", serif';
  ctx.fillText(input.label, 540, 480);

  ctx.font = '500 64px "Songti SC", "STSong", "SimSun", serif';
  ctx.fillText(input.fortune, 540, 660);

  ctx.fillStyle = input.accent;
  ctx.font = '32px "PingFang SC", "Microsoft YaHei", sans-serif';
  const lines = truncateLines(input.meaning, 16, 3);
  lines.forEach((line, index) => {
    ctx.fillText(line, 540, 760 + index * 52);
  });

  ctx.fillStyle = input.ink;
  ctx.font = '28px "Songti SC", "STSong", "SimSun", serif';
  ctx.fillText(`${input.name} · 一周岁`, 540, 1150);
}

/** 1080×1920，坐标见 DEV_SPEC 6.9 */
export function drawPoster(canvas: HTMLCanvasElement, input: PosterInput): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;

  ctx.fillStyle = "#FBF7F0";
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  // 封面：1080×1080，object-fit: cover
  const size = 1080;
  const scale = Math.max(size / input.cover.width, size / input.cover.height);
  const drawWidth = input.cover.width * scale;
  const drawHeight = input.cover.height * scale;
  ctx.drawImage(
    input.cover,
    (size - drawWidth) / 2,
    (size - drawHeight) * 0.3,
    drawWidth,
    drawHeight,
  );

  // 底部渐隐到纸色
  const fade = ctx.createLinearGradient(0, size - 160, 0, size);
  fade.addColorStop(0, "rgba(251,247,240,0)");
  fade.addColorStop(1, "rgba(251,247,240,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, size - 160, size, 160);

  ctx.textAlign = "center";
  ctx.fillStyle = "#2B2622";
  ctx.font = '500 72px "Songti SC", "STSong", "SimSun", serif';
  ctx.fillText(input.name, POSTER_WIDTH / 2, 1170);

  ctx.fillStyle = "#6B625A";
  ctx.font = '28px "Songti SC", "STSong", "SimSun", serif';
  ctx.fillText(input.dateLine, POSTER_WIDTH / 2, 1220);

  ctx.fillStyle = "#2B2622";
  ctx.font = '32px "PingFang SC", "Microsoft YaHei", sans-serif';
  const lines = truncateLines(input.tagline, 18, 2);
  lines.forEach((line, index) => {
    ctx.fillText(line, POSTER_WIDTH / 2, 1280 + index * 48);
  });

  // 二维码：240×240，白底圆角
  const qrSize = 240;
  const qrX = (POSTER_WIDTH - qrSize) / 2;
  const qrY = 1600;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 12);
  ctx.fill();
  ctx.drawImage(input.qr, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#9C9289";
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText("扫码看看他的一年", POSTER_WIDTH / 2, 1890);
}
