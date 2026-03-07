"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileFieldAction } from "@/server/actions/profile.actions";

interface ProfileData {
  birthDate: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  nationalId: string | null;
  bio: string | null;
  dietaryRestrictions: string | null;
  accessibility: string | null;
  completionScore: number;
}

interface ProfileAccordionProps {
  profile: ProfileData;
}

interface SectionConfig {
  key: string;
  titleKey: string;
  fields: FieldConfig[];
}

interface FieldConfig {
  key: string;
  labelKey: string;
  type: "text" | "date" | "tel" | "textarea";
  masked?: boolean;
  maxLength?: number;
  placeholder?: string;
}

const SECTIONS: SectionConfig[] = [
  {
    key: "personal",
    titleKey: "sections.personal",
    fields: [
      { key: "birthDate", labelKey: "fields.birthDate", type: "date" },
      { key: "phone", labelKey: "fields.phone", type: "tel", maxLength: 20 },
      { key: "country", labelKey: "fields.country", type: "text", maxLength: 100 },
      { key: "city", labelKey: "fields.city", type: "text", maxLength: 100 },
      { key: "address", labelKey: "fields.address", type: "text", maxLength: 300 },
    ],
  },
  {
    key: "documents",
    titleKey: "sections.documents",
    fields: [
      { key: "passportNumber", labelKey: "fields.passportNumber", type: "text", masked: true },
      { key: "passportExpiry", labelKey: "fields.passportExpiry", type: "date" },
      { key: "nationalId", labelKey: "fields.nationalId", type: "text", masked: true },
    ],
  },
  {
    key: "about",
    titleKey: "sections.about",
    fields: [
      { key: "bio", labelKey: "fields.bio", type: "textarea", maxLength: 500 },
    ],
  },
  {
    key: "preferences",
    titleKey: "sections.preferences",
    fields: [
      { key: "dietaryRestrictions", labelKey: "fields.dietaryRestrictions", type: "text", maxLength: 300 },
      { key: "accessibility", labelKey: "fields.accessibility", type: "text", maxLength: 300 },
    ],
  },
];

export function ProfileAccordion({ profile }: ProfileAccordionProps) {
  const t = useTranslations("profile.accordion");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    for (const section of SECTIONS) {
      for (const field of section.fields) {
        const profileValue = profile[field.key as keyof ProfileData];
        values[field.key] = typeof profileValue === "string" ? profileValue : "";
      }
    }
    return values;
  });
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());
  const [errorField, setErrorField] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleSection(key: string) {
    setOpenSection(openSection === key ? null : key);
  }

  function handleFieldChange(key: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setErrorField(null);
  }

  function handleSaveField(fieldKey: string) {
    const value = fieldValues[fieldKey]?.trim();
    if (!value) return;

    setSavingField(fieldKey);
    setErrorField(null);

    startTransition(async () => {
      const result = await updateProfileFieldAction(fieldKey, value);
      setSavingField(null);
      if (result.success) {
        setSavedFields((prev) => new Set(prev).add(fieldKey));
        setTimeout(() => {
          setSavedFields((prev) => {
            const next = new Set(prev);
            next.delete(fieldKey);
            return next;
          });
        }, 2000);
      } else {
        setErrorField(fieldKey);
      }
    });
  }

  // Progress bar
  const filledCount = Object.values(fieldValues).filter((v) => v.trim().length > 0).length;
  const totalFields = 11;
  const progressPercent = Math.round((filledCount / totalFields) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground/80">{t("profileCompletion")}</span>
          <span className="font-bold text-atlas-gold">{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {t("fieldsCompleted", { filled: filledCount, total: totalFields })}
        </p>
      </div>

      {/* Accordion sections */}
      {SECTIONS.map((section) => (
        <div
          key={section.key}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <button
            type="button"
            onClick={() => toggleSection(section.key)}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted"
            aria-expanded={openSection === section.key}
          >
            <span className="font-medium text-foreground">{t(section.titleKey)}</span>
            <span className="text-muted-foreground/70">
              {openSection === section.key ? "▲" : "▼"}
            </span>
          </button>

          {openSection === section.key && (
            <div className="border-t border-border/50 px-4 py-4">
              <div className="flex flex-col gap-4">
                {section.fields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <Label htmlFor={`profile-${field.key}`}>{t(field.labelKey)}</Label>
                    <div className="flex gap-2">
                      {field.type === "textarea" ? (
                        <textarea
                          id={`profile-${field.key}`}
                          value={fieldValues[field.key] ?? ""}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          maxLength={field.maxLength}
                          rows={3}
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                        />
                      ) : (
                        <Input
                          id={`profile-${field.key}`}
                          type={field.type}
                          value={fieldValues[field.key] ?? ""}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          maxLength={field.maxLength}
                          className="flex-1"
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveField(field.key)}
                        disabled={
                          savingField === field.key ||
                          isPending ||
                          !fieldValues[field.key]?.trim()
                        }
                        className="shrink-0"
                      >
                        {savingField === field.key
                          ? "..."
                          : savedFields.has(field.key)
                            ? "✓"
                            : t("save")}
                      </Button>
                    </div>
                    {errorField === field.key && (
                      <p className="text-xs text-destructive">{t("saveError")}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
