import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/contexts/LanguageContext";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://yawmi.app"),
  title: "يَومي | Yawmi - نظام إدارة الحضور والانصراف السحابي الذكي",
  description: "المنصة السحابية المتقدمة لإدارة حضور وانصراف الموظفين بتقنية QR الديناميكي والنطاق الجغرافي GPS للشركات والمؤسسات في السعودية والخليج.",
  icons: {
    icon: "/yawmi.jpeg",
    apple: "/yawmi.jpeg",
  },
  openGraph: {
    title: "يَومي | Yawmi - نظام إدارة الحضور والانصراف السحابي الذكي",
    description: "حضور وانصراف دقيق، بدون تلاعب. كشك QR متجدد، نطاق جغرافي GPS، وربط الأجهزة الذكية.",
    images: [{ url: "/yawmi.jpeg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} ${cairo.className}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`min-h-screen bg-background text-foreground font-cairo ${cairo.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
