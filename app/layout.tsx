import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { RadixThemeProvider } from "@/components/RadixThemeProvider";
// Import Radix CSS in proper order to allow overrides
import "@radix-ui/themes/tokens.css";
import "@radix-ui/themes/components.css";
import "./globals.css"; // Our custom styles go here, between components and utilities
import "@radix-ui/themes/utilities.css";

// Optimize font loading with next/font
const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Use font-display: swap for better performance
  preload: true,
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SportAI",
  description: "SportAI analysis tool",
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover", // Ensures safe area insets work on iPhone
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <RadixThemeProvider>{children}</RadixThemeProvider>
      </body>
    </html>
  );
}

