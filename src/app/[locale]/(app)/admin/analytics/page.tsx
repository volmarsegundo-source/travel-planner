import { getTranslations } from "next-intl/server";
import { AtlasCard } from "@/components/ui/AtlasCard";

export default async function AdminAnalyticsPage() {
  const t = await getTranslations("admin.adminAnalytics");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-atlas-on-surface-variant">{t("subtitle")}</p>
      </div>

      <AtlasCard>
        <div className="p-6 text-center">
          <h3 className="text-lg font-bold mb-2">{t("vercelLink")}</h3>
          <p className="text-atlas-on-surface-variant mb-4">
            {t("vercelDescription")}
          </p>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-atlas-primary text-atlas-on-primary font-bold text-sm hover:opacity-90 transition-opacity motion-reduce:transition-none min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2"
          >
            {t("vercelLink")} →
          </a>
        </div>
      </AtlasCard>
    </div>
  );
}
