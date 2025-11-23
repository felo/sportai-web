import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { RadixThemeProvider } from "@/components/RadixThemeProvider";
// Import Radix CSS in proper order to allow overrides
import "@radix-ui/themes/tokens.css";
import "@radix-ui/themes/components.css";
import "./globals.css"; // Our custom styles go here, between components and utilities
import "@radix-ui/themes/utilities.css";

// Optimize font loading with next/font
const poppins = Poppins({
  subsets: ["latin"],
  display: "swap", // Use font-display: swap for better performance
  preload: true,
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "SportAI - AI-Powered Sports Video Analysis",
    template: "%s | SportAI"
  },
  description: "Advanced AI-powered sports video analysis for tennis, pickleball, and padel. Get expert coaching insights, technique analysis, and performance recommendations.",
  keywords: ["sports analysis", "AI coach", "video analysis", "tennis", "pickleball", "padel", "sports coaching", "technique analysis"],
  authors: [{ name: "SportAI" }],
  creator: "SportAI",
  publisher: "SportAI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "SportAI - AI-Powered Sports Video Analysis",
    description: "Get expert AI coaching insights for tennis, pickleball, and padel. Analyze your technique and improve your game.",
    type: "website",
    locale: "en_US",
    siteName: "SportAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SportAI - AI-Powered Sports Video Analysis",
    description: "Get expert AI coaching insights for tennis, pickleball, and padel.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SportAI',
  },
};

// Separate viewport export (Next.js 15 requirement)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1C1C1C' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-sans">
        <RadixThemeProvider>{children}</RadixThemeProvider>
      </body>
    </html>
  );
}

