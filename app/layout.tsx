import type { Metadata } from "next";
import { RadixThemeProvider } from "@/components/RadixThemeProvider";
import "@radix-ui/themes/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SportAI",
  description: "SportAI analysis tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: "#000000" }}>
      <body>
        <RadixThemeProvider>{children}</RadixThemeProvider>
      </body>
    </html>
  );
}

