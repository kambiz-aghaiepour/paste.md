import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "@/app/components/theme-script";
import { Header } from "@/app/components/header";

export const metadata: Metadata = {
  title: "paste.md",
  description: "A Markdown pastebin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <Header />
        {children}
      </body>
    </html>
  );
}
