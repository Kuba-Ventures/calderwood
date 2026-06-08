import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { Header } from "@/components/header";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/analytics/gtm";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Calderwood: How much is each carrier underpaying you?",
  description:
    "A code-by-code benchmark of your dental fee schedule against UCR data in your zip code, delivered in minutes. $199 flat. No sales call.",
  openGraph: {
    title: "Calderwood: How much is each carrier underpaying you?",
    description:
      "A code-by-code benchmark of your dental fee schedule against UCR data in your zip code, delivered in minutes. $199 flat. No sales call.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable}`}
    >
      <head>
        <GoogleTagManager />
      </head>
      <body className="font-sans bg-canvas text-ink-900 antialiased">
        <GoogleTagManagerNoScript />
        <Header />
        {children}
      </body>
    </html>
  );
}
