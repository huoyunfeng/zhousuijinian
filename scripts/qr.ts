/**
 * 二维码生成（DEV_SPEC 8.7）
 * 用法：pnpm qr --slug=bb-20250417
 */
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

function arg(name: string): string | undefined {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main(): Promise<void> {
  const slug = arg("slug");
  if (!slug) throw new Error("用法：pnpm qr --slug=bb-20250417");
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  const url = `${site.replace(/\/$/, "")}/s/${slug}`;
  const outDir = path.join(process.cwd(), "public", "orders", slug);
  fs.mkdirSync(outDir, { recursive: true });
  const buf = await QRCode.toBuffer(url, {
    type: "png",
    width: 480,
    margin: 1,
    color: { dark: "#2B2622", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
  fs.writeFileSync(path.join(outDir, "qr.png"), buf);
  console.log(`✓ ${url} → public/orders/${slug}/qr.png`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
