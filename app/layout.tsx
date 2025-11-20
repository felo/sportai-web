import type { Metadata, Viewport } from "next";
import { RadixThemeProvider } from "@/components/RadixThemeProvider";
import "@radix-ui/themes/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SportAI",
  description: "SportAI analysis tool",
  other: {
    "color-scheme": "dark",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: "#000000" }} data-theme="dark">
      <body>
        <RadixThemeProvider>{children}</RadixThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Force dark mode on iOS Safari
                const meta = document.createElement('meta');
                meta.name = 'color-scheme';
                meta.content = 'dark';
                document.head.appendChild(meta);
                
                const themeColor = document.createElement('meta');
                themeColor.name = 'theme-color';
                themeColor.content = '#000000';
                document.head.appendChild(themeColor);
                
                const appleStatusBar = document.createElement('meta');
                appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
                appleStatusBar.content = 'black-translucent';
                document.head.appendChild(appleStatusBar);
                
                // Set data-theme attribute immediately
                document.documentElement.setAttribute('data-theme', 'dark');
                document.documentElement.style.colorScheme = 'dark';
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}

