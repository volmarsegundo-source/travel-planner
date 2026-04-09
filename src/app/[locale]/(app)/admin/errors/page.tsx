import { getTranslations } from "next-intl/server";
import { AtlasCard } from "@/components/ui/AtlasCard";

export default async function AdminErrorsPage() {
  const t = await getTranslations("admin.adminErrors");
  const hasSentry = !!process.env.SENTRY_DSN;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-atlas-on-surface-variant">{t("subtitle")}</p>
      </div>

      <AtlasCard>
        <div className="p-6 text-center">
          {hasSentry ? (
            <>
              <h3 className="text-lg font-bold mb-2">{t("sentryLink")}</h3>
              <p className="text-atlas-on-surface-variant mb-4">
                {t("sentryDescription")}
              </p>
              <a
                href="https://atlas-travel.sentry.io/issues/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-atlas-error text-white font-bold text-sm hover:opacity-90 transition-opacity motion-reduce:transition-none min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2"
              >
                {t("sentryLink")} →
              </a>
            </>
          ) : (
            <p className="text-atlas-on-surface-variant">
              {t("notConfigured")}
            </p>
          )}
        </div>
      </AtlasCard>
    </div>
  );
}
