import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import Providers from "@/components/Providers";
import { getMessages, DEFAULT_LOCALE } from "@/lib/i18n";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const meta = getMessages(DEFAULT_LOCALE).meta;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--background)] text-stone-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
