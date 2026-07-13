import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Doto, Space_Grotesk, Space_Mono } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Nothing Design font stack:
// - Doto: display/hero (≥36px)
// - Space Grotesk: body/UI
// - Space Mono: data, labels (ALL CAPS instrumentation)
const fontDisplay = Doto({
  variable: "--font-nd-display",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const fontBody = Space_Grotesk({
  variable: "--font-nd-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const fontMono = Space_Mono({
  variable: "--font-nd-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Syntrix",
    template: "%s | Syntrix",
  },
  description: "Synchronization & Validation Matrix untuk inventory, validasi, dan approval aset jaringan.",
  applicationName: "Syntrix",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
