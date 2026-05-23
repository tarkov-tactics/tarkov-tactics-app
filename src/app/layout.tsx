import type { Metadata } from "next";
import { Red_Hat_Text } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const redHatText = Red_Hat_Text({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tarkov Tactics",
  description:
    "Personalized raid recommendations for Escape from Tarkov — powered by TarkovTracker and tarkov.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${redHatText.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="h-full bg-background text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
