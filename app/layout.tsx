import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeWrapper } from "@/components/theme-wrapper";
import { LoadingProvider } from "@/components/providers/loading-provider";
import { LoadingBar } from "@/components/loading-bar";
import { FaviconAnimation } from "@/components/favicon-animation";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import FloatingMessageWidget from "@/components/messaging/floating-message-widget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Codura - Master Technical Interviews",
  description: "Practice coding problems, conduct mock interviews, and compete with peers from your university. Build the skills that land you the job.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body className={`${geistSans.variable} ${geistMono.variable}`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange={true}
            storageKey="codura-theme"
            themes={["light", "dark"]}
            enableColorScheme={true}
          >
            <ThemeWrapper>
              <Suspense fallback={null}>
                <LoadingProvider>
                  <LoadingBar />
                  <FaviconAnimation />
                  {children}
                  <FloatingMessageWidget />
                  <Toaster position="top-right" richColors />
                </LoadingProvider>
              </Suspense>
            </ThemeWrapper>
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}