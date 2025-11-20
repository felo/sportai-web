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
    <html lang="en" style={{ backgroundColor: "#000000" }} data-theme="dark" data-radix-theme-appearance="dark">
      <body style={{ backgroundColor: "#1C1C1C", colorScheme: "dark" }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){document.documentElement.setAttribute('data-theme','dark');document.documentElement.setAttribute('data-radix-theme-appearance','dark');document.documentElement.style.colorScheme='dark';document.documentElement.style.backgroundColor='#000000';document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');let m=document.querySelector('meta[name="color-scheme"]');if(!m){m=document.createElement('meta');m.name='color-scheme';document.head.appendChild(m);}m.content='dark';let t=document.querySelector('meta[name="theme-color"]');if(!t){t=document.createElement('meta');t.name='theme-color';document.head.appendChild(t);}t.content='#000000';let a=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(!a){a=document.createElement('meta');a.name='apple-mobile-web-app-status-bar-style';document.head.appendChild(a);}a.content='black-translucent';})();`,
          }}
        />
        <RadixThemeProvider>{children}</RadixThemeProvider>
      </body>
    </html>
  );
}

