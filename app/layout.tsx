import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: {
    default: "Zweisam",
    template: "%s | Zweisam",
  },
  description: "Nhiệm vụ nhỏ, yêu thương lớn — quest và phần thưởng cho cặp đôi.",
  applicationName: "Zweisam",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Zweisam",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1415" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
