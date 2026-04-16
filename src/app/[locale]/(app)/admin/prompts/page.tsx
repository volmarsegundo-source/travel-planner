import { getTranslations } from "next-intl/server";
import { getAiInteractionsAction } from "@/server/actions/admin.actions";
import { PromptViewer } from "@/components/features/admin/PromptViewer";

export default async function AdminPromptsPage() {
  const t = await getTranslations("admin.prompts");

  const { interactions, error } = await getAiInteractionsAction({ limit: 50 });

  if (error === "unauthorized" || error === "forbidden") {
    return null;
  }

  return (
    <section aria-labelledby="prompts-page-title">
      <div className="mb-6">
        <h2
          id="prompts-page-title"
          className="text-xl font-atlas-headline font-bold text-atlas-on-surface"
        >
          {t("title")}
        </h2>
        <p className="text-sm text-atlas-on-surface-variant font-atlas-body">
          {t("subtitle")}
        </p>
      </div>
      <PromptViewer interactions={interactions} />
    </section>
  );
}
