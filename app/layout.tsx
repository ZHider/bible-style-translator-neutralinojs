import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "《圣经》文体翻译器｜用寻常的话 写出你的《圣经》故事",
  description:
    "保留任意现代中文文案的原意与结构，将它改写成故意庄严过度、略显生硬的和合本翻译腔。",
  keywords: ["圣经翻译腔", "和合本", "文体改写", "文案改写", "DeepSeek"],
  openGraph: {
    title: "《圣经》文体翻译器｜用寻常的话 写出你的《圣经》故事",
    description: "保留原意与结构，把任意现代文案改成故意庄严过度的旧译腔。",
    type: "website",
    locale: "zh_CN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
