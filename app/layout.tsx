import type { Metadata } from "next";
import { RadixThemeProvider } from "@/components/RadixThemeProvider";
// Import Radix CSS in proper order to allow overrides
import "@radix-ui/themes/tokens.css";
import "@radix-ui/themes/components.css";
import "./globals.css"; // Our custom styles go here, between components and utilities
import "@radix-ui/themes/utilities.css";

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
    <html lang="en">
      <body>
        <RadixThemeProvider>{children}</RadixThemeProvider>
      </body>
    </html>
  );
}

