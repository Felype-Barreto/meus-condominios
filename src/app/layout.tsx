import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Meus Condomínios | Gestão moderna de condomínios",
    template: "%s | Meus Condomínios",
  },
  description:
    "SaaS simples, seguro e moderno para gestão de condomínios, moradores, guarita, convites e permissões.",
  metadataBase: new URL("https://meus-condominios.vercel.app"),
  applicationName: "Meus Condomínios",
  appleWebApp: {
    capable: true,
    title: "Meus Condomínios",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/morai-icon.svg",
    apple: "/icons/morai-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#7C5C3E",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
