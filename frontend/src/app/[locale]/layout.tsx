import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
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

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}>) {
  const {locale} = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${roboto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[var(--font-roboto)]">
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
