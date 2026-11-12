import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/copy";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.defaultTitle,
  description: SITE.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBF7F0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 单页主题由 app/s/[slug] 的 story-root 携带 data-theme（DEV_SPEC 8.4 的唯一来源），
  // 根节点只保证默认主题与字体变量可用。
  return (
    <html lang="zh-CN" data-theme="paper-warm" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
