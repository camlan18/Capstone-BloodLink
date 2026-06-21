import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "BloodLink - Hệ thống hiến máu nhân đạo",
  description: "Kết nối người hiến máu với những người cần máu. Tìm kiếm ngân hàng máu, đăng ký hiến máu, và tham gia các chiến dịch hiến máu trên toàn quốc.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" className={`${roboto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[var(--font-roboto)]">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
