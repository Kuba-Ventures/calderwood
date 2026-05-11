import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Calderwood: How much is each carrier underpaying you?",
  description:
    "A code-by-code benchmark of your dental fee schedule against UCR data in your zip code, delivered within 24 hours. $199 flat. No sales call.",
  openGraph: {
    title: "Calderwood: How much is each carrier underpaying you?",
    description:
      "A code-by-code benchmark of your dental fee schedule against UCR data in your zip code, delivered within 24 hours. $199 flat. No sales call.",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-canvas text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
