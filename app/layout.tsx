import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "中國醫藥大學-醫技系 臨床生化/生化國考題庫練習",
  description: "中國醫藥大學醫技系臨床生化與生化國考題庫練習網站",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <Providers>{children}</Providers>
        <footer
          style={{
            textAlign: "center",
            padding: "20px 16px",
            fontSize: 12,
            color: "#444",
            borderTop: "1px solid #222",
            marginTop: 32,
          }}
        >
          版權所有 © 2026 YC Chen
        </footer>
      </body>
    </html>
  );
}
