import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  variable: "--font-merriweather",
  subsets: ["latin"],
});

import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";

export const metadata: Metadata = {
  title: "PerenneAI",
  description: "Your intelligent, all-in-one productivity and AI companion.",
  verification: {
    google: "Q4TDzE3G5_scwK2g96A50ooFKe2T1soFPCZP77_2Ja0",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} ${merriweather.variable} h-full antialiased dark`}
        suppressHydrationWarning
      >
        <head>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
        </head>
        <body className="min-h-full flex flex-col font-sans">
          {children}
          <Script src="https://unpkg.com/mathlive" strategy="afterInteractive" />
          <Script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js" strategy="afterInteractive" />
          <Script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js" strategy="afterInteractive" />
        </body>
      </html>
    </ClerkProvider>
  );
}
