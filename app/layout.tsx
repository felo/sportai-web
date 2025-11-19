import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SportAI Web",
  description: "Next.js app with Radix UI and Gemini 3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

