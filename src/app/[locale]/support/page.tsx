import { getTranslations } from "next-intl/server";
import { LandingNav } from "@/components/features/landing/LandingNav";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

export default async function SupportPage() {
  const t = await getTranslations("legal.support");

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
          <section className="mt-8" aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="text-xl font-semibold text-atlas-primary font-atlas-headline"
            >
              {t("faq.title")}
            </h2>

            <div className="mt-4 space-y-4">
              {FAQ_KEYS.map((key) => (
                <details
                  key={key}
                  className="group rounded-lg border border-atlas-outline-variant/20 bg-atlas-surface-container-low motion-reduce:transition-none"
                >
                  <summary className="flex min-h-[44px] cursor-pointer items-center px-4 py-3 font-medium text-atlas-on-surface font-atlas-headline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:rounded-lg">
                    <span
                      className="mr-2 inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none"
                      aria-hidden="true"
                    >
                      &#9654;
                    </span>
                    {t(`faq.items.${key}.question`)}
                  </summary>
                  <div className="px-4 pb-4 pt-1">
                    <p className="text-sm text-atlas-on-surface-variant font-atlas-body leading-relaxed pl-6">
                      {t(`faq.items.${key}.answer`)}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Contact Section */}
          <section className="mt-10 rounded-lg border border-atlas-outline-variant/20 bg-atlas-surface-container-low p-6" aria-labelledby="contact-heading">
            <h2
              id="contact-heading"
              className="text-xl font-semibold text-atlas-primary font-atlas-headline"
            >
              {t("contact.title")}
            </h2>
            <p className="mt-2 text-base text-atlas-on-surface-variant font-atlas-body">
              {t("contact.description")}
            </p>
            <p className="mt-3">
              <a
                href={`mailto:${t("contact.email")}`}
                className="font-medium text-atlas-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:rounded-sm"
              >
                {t("contact.email")}
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
