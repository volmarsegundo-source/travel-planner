import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");

  const sectionKeys = [
    "acceptance",
    "service",
    "accounts",
    "ai",
    "privacy",
    "liability",
    "changes",
  ] as const;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: t("breadcrumb") },
            ]}
          />

          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {t("title")}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {t("lastUpdated")}
          </p>

          <p className="mt-6 text-base text-foreground leading-relaxed">
            {t("intro")}
          </p>

          <div className="mt-8 space-y-8">
            {sectionKeys.map((key) => (
              <section key={key}>
                <h2 className="text-lg font-semibold text-foreground">
                  {t(`sections.${key}.title`)}
                </h2>
                <p className="mt-2 text-base text-muted-foreground leading-relaxed">
                  {t(`sections.${key}.content`)}
                </p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
