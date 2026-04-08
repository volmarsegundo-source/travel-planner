import type { Metadata } from "next";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { LandingPageV2 } from "@/components/features/landing/LandingPageV2";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landingV2" });
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://atlas-travel.app";

  const title = t("meta.title");
  const description = t("meta.description");
  const ogDescription = t("meta.ogDescription");

  const localeUrl =
    locale === "pt-BR" ? baseUrl : `${baseUrl}/${locale}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description: ogDescription,
      url: localeUrl,
      siteName: "Atlas",
      type: "website",
      locale: locale === "pt-BR" ? "pt_BR" : "en_US",
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "Atlas Travel Planner",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: ogDescription,
      images: [`${baseUrl}/og-image.png`],
    },
    alternates: {
      canonical: localeUrl,
      languages: {
        "pt-BR": baseUrl,
        en: `${baseUrl}/en`,
      },
    },
    robots: { index: true, follow: true },
  };
}

function JsonLd() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://atlas-travel.app";

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Atlas",
        url: baseUrl,
        description: "AI-powered travel planning platform",
      },
      {
        "@type": "WebSite",
        name: "Atlas",
        url: baseUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${baseUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default async function HomePage({ params }: HomePageProps) {
  const session = await auth();
  const { locale } = await params;

  if (session) {
    redirect({ href: "/expeditions", locale });
  }

  const isAuthenticated = !!session;

  return (
    <>
      <JsonLd />
      <LandingPageV2 isAuthenticated={isAuthenticated} />
    </>
  );
}
