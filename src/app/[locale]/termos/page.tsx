import { getTranslations } from "next-intl/server";

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");

  const sections = [
    "acceptance", "service", "accounts", "ai", "privacy", "liability", "changes",
  ] as const;

  return (
    <main className="min-h-screen bg-atlas-surface py-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-atlas-primary font-atlas-headline mb-4">
          {t("title")}
        </h1>
        <p className="text-atlas-on-surface-variant text-sm mb-8">{t("lastUpdated")}</p>
        <p className="text-atlas-on-surface font-atlas-body mb-8">{t("intro")}</p>

        <div className="space-y-8">
          {sections.map((key) => (
            <section key={key}>
              <h2 className="text-xl font-bold text-atlas-primary font-atlas-headline mb-3">
                {t(`sections.${key}.title`)}
              </h2>
              <p className="text-atlas-on-surface font-atlas-body leading-relaxed">
                {t(`sections.${key}.content`)}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
