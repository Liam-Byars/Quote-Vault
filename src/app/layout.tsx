import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppProviders } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quote Vault — Funny Things People Say",
  description:
    "A mobile-friendly journal for the funny, weird, and memorable things people say. Save quotes with who said them, when, where, tags, and a funny-meter rating.",
  keywords: [
    "quotes",
    "quote journal",
    "funny quotes",
    "things people say",
    "journal",
  ],
  // App icon: the Q logo in src/app/icon.svg (+ favicon.ico + apple-icon.png),
  // picked up automatically by Next.js file conventions.
  authors: [{ name: "Quote Vault" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fef9f0" },
    { media: "(prefers-color-scheme: dark)", color: "#2a2520" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AppProviders>
          {children}
          <Toaster richColors position="top-center" />
        </AppProviders>
      </body>
    </html>
  );
}
