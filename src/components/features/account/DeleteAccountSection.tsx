"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DeleteAccountModal } from "@/components/features/account/DeleteAccountModal";

interface DeleteAccountSectionProps {
  userEmail: string;
}

export function DeleteAccountSection({ userEmail }: DeleteAccountSectionProps) {
  const t = useTranslations("account");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section
        aria-labelledby="account-section-heading"
        className="rounded-lg border border-destructive/30 bg-card p-6"
      >
        <h2
          id="account-section-heading"
          className="text-lg font-semibold text-foreground"
        >
          {t("accountSection")}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {t("deleteWarning")}
        </p>

        <div className="mt-4">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setIsModalOpen(true)}
          >
            {t("deleteAccount")}
          </Button>
        </div>
      </section>

      {isModalOpen && (
        <DeleteAccountModal
          userEmail={userEmail}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
