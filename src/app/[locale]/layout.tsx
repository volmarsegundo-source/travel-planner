import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { routing } from "@/i18n/routing";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { cormorantGaramond, dmSans, spaceMono, plusJakartaSans, workSans } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Atlas — Travel Planner",
  description: "Transform your travel dreams into expeditions",
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Load messages server-side and pass them to the client provider.
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${cormorantGaramond.variable} ${dmSans.variable} ${spaceMono.variable} ${plusJakartaSans.variable} ${workSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <NextIntlClientProvider messages={messages}>
            <QueryProvider>{children}</QueryProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
