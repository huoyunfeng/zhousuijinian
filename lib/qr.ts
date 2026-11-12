import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { publicOrderDir } from "./story";

/** 生成 public/orders/{slug}/qr.png（DEV_SPEC 8.7） */
export async function writeQr(slug: string): Promise<string> {
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  const url = `${site.replace(/\/$/, "")}/s/${slug}`;
  const dir = publicOrderDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 480,
    margin: 1,
    color: { dark: "#2B2622", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
  fs.writeFileSync(path.join(dir, "qr.png"), buffer);
  return url;
}
