import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dig — Follow the Thread",
  description: "Explore music influence networks",
};

/**
 * Root layout — full-bleed dark canvas shell (UX-DR1).
 *
 * The <body> is the canvas: 100 % height, overflow hidden, no
 * padding/margin/container. Chrome elements (TopNav, FilterPanel,
 * NodeDetailPanel) float over this surface using absolute/fixed
 * positioning added in later stories.
 *
 * QueryClientProvider wraps the full tree via <Providers> so every
 * page and component can use TanStack Query hooks without additional
 * setup.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      {/*
       * bg-canvas + text-text-primary are Tailwind tokens defined in
       * tailwind.config.ts. h-full + overflow-hidden enforce the
       * no-scrollbar, full-bleed canvas requirement.
       */}
      <body className="h-full overflow-hidden bg-canvas font-sans text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}