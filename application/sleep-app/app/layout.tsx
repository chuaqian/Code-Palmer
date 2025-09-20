import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UIProviders from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1220",
};

export const metadata: Metadata = {
  title: "SleepSync",
  description: "Smart Sleep Optimization (MVP)",
  applicationName: "SleepSync",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full min-h-screen bg-neutral-950 text-neutral-100`}
      >
        <UIProviders>
          <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
            {children}
          </div>
        </UIProviders>
      </body>
    </html>
  );
}
