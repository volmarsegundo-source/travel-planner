import { getTranslations } from "next-intl/server";
import { LandingNav } from "@/components/features/landing/LandingNav";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export default async function SupportPage() {
  const t = await getTranslations("legal.support");

  const faqKeys = ["q1", "q2", "q3", "q4"] as const;

  return (
    <div className="flex min-h-screen flex-col bg-atlas-surface">
      <LandingNav />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: t("breadcrumb") },
            ]}
          />

          <h1 className="text-2xl font-bold text-atlas-primary font-atlas-headline sm:text-3xl">
            {t("title")}
          </h1>

          <p className="mt-6 text-base text-atlas-on-surface font-atlas-body leading-relaxed">
            {t("intro")}
          </p>

          {/* FAQ Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-atlas-primary font-atlas-headline">
              {t("faq.title")}
            </h2>

            <div className="mt-4 space-y-6">
              {faqKeys.map((key) => (
                <div key={key} className="rounded-lg border border-atlas-outline-variant/20 bg-atlas-surface-container-low p-4">
                  <h3 className="font-medium text-atlas-on-surface font-atlas-headline">
                    {t(`faq.items.${key}.question`)}
                  </h3>
                  <p className="mt-2 text-sm text-atlas-on-surface-variant font-atlas-body leading-relaxed">
                    {t(`faq.items.${key}.answer`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="mt-10 rounded-lg border border-atlas-outline-variant/20 bg-atlas-surface-container-low p-6">
            <h2 className="text-xl font-semibold text-atlas-primary font-atlas-headline">
              {t("contact.title")}
            </h2>
            <p className="mt-2 text-base text-atlas-on-surface-variant font-atlas-body">
              {t("contact.description")}
            </p>
            <p className="mt-3">
              <a
                href={`mailto:${t("contact.email")}`}
                className="font-medium text-atlas-primary hover:underline"
              >
                {t("contact.email")}
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
