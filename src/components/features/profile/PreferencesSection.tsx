"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PreferenceCategory } from "./PreferenceCategory";
import { PreferenceProgressBar } from "./PreferenceProgressBar";
import {
  PREFERENCE_CATEGORIES,
  countFilledCategories,
  parsePreferences,
  type UserPreferences,
  type PreferenceCategoryKey,
} from "@/lib/validations/preferences.schema";
import { savePreferencesAction } from "@/server/actions/profile.actions";

// ─── Category config ─────────────────────────────────────────────────────────

interface CategoryConfig {
  key: PreferenceCategoryKey;
  titleKey: string;
  questionKey: string;
  selectionType: "single" | "multi";
  options: { value: string; labelKey: string; descriptionKey?: string }[];
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    key: "travelPace",
    titleKey: "categories.travelPace.title",
    questionKey: "categories.travelPace.question",
    selectionType: "single",
    options: [
      { value: "relaxed", labelKey: "options.travelPace.relaxed", descriptionKey: "categories.travelPace.relaxedDesc" },
      { value: "moderate", labelKey: "options.travelPace.moderate", descriptionKey: "categories.travelPace.moderateDesc" },
      { value: "intense", labelKey: "options.travelPace.intense", descriptionKey: "categories.travelPace.intenseDesc" },
    ],
  },
  {
    key: "foodPreferences",
    titleKey: "categories.foodPreferences.title",
    questionKey: "categories.foodPreferences.question",
    selectionType: "multi",
    options: [
      { value: "vegetarian", labelKey: "options.foodPreferences.vegetarian" },
      { value: "vegan", labelKey: "options.foodPreferences.vegan" },
      { value: "halal", labelKey: "options.foodPreferences.halal" },
      { value: "kosher", labelKey: "options.foodPreferences.kosher" },
      { value: "gluten_free", labelKey: "options.foodPreferences.gluten_free" },
      { value: "lactose_free", labelKey: "options.foodPreferences.lactose_free" },
      { value: "local_cuisine", labelKey: "options.foodPreferences.local_cuisine" },
      { value: "street_food", labelKey: "options.foodPreferences.street_food" },
      { value: "fine_dining", labelKey: "options.foodPreferences.fine_dining" },
      { value: "no_restrictions", labelKey: "options.foodPreferences.no_restrictions" },
    ],
  },
  {
    key: "interests",
    titleKey: "categories.interests.title",
    questionKey: "categories.interests.question",
    selectionType: "multi",
    options: [
      { value: "history_museums", labelKey: "options.interests.history_museums" },
      { value: "art_galleries", labelKey: "options.interests.art_galleries" },
      { value: "nature_hiking", labelKey: "options.interests.nature_hiking" },
      { value: "nightlife", labelKey: "options.interests.nightlife" },
      { value: "shopping", labelKey: "options.interests.shopping" },
      { value: "photography", labelKey: "options.interests.photography" },
      { value: "sports_adventure", labelKey: "options.interests.sports_adventure" },
      { value: "wellness_spa", labelKey: "options.interests.wellness_spa" },
      { value: "gastronomy", labelKey: "options.interests.gastronomy" },
      { value: "beaches", labelKey: "options.interests.beaches" },
      { value: "architecture", labelKey: "options.interests.architecture" },
      { value: "wildlife", labelKey: "options.interests.wildlife" },
    ],
  },
  {
    key: "budgetStyle",
    titleKey: "categories.budgetStyle.title",
    questionKey: "categories.budgetStyle.question",
    selectionType: "single",
    options: [
      { value: "budget", labelKey: "options.budgetStyle.budget", descriptionKey: "categories.budgetStyle.budgetDesc" },
      { value: "moderate", labelKey: "options.budgetStyle.moderate", descriptionKey: "categories.budgetStyle.moderateDesc" },
      { value: "comfortable", labelKey: "options.budgetStyle.comfortable", descriptionKey: "categories.budgetStyle.comfortableDesc" },
      { value: "luxury", labelKey: "options.budgetStyle.luxury", descriptionKey: "categories.budgetStyle.luxuryDesc" },
    ],
  },
  {
    key: "socialPreference",
    titleKey: "categories.socialPreference.title",
    questionKey: "categories.socialPreference.question",
    selectionType: "multi",
    options: [
      { value: "solo", labelKey: "options.socialPreference.solo" },
      { value: "meet_travelers", labelKey: "options.socialPreference.meet_travelers" },
      { value: "group_activities", labelKey: "options.socialPreference.group_activities" },
      { value: "family", labelKey: "options.socialPreference.family" },
      { value: "romantic_couple", labelKey: "options.socialPreference.romantic_couple" },
    ],
  },
  {
    key: "accommodationStyle",
    titleKey: "categories.accommodationStyle.title",
    questionKey: "categories.accommodationStyle.question",
    selectionType: "multi",
    options: [
      { value: "hostel", labelKey: "options.accommodationStyle.hostel" },
      { value: "hotel", labelKey: "options.accommodationStyle.hotel" },
      { value: "airbnb", labelKey: "options.accommodationStyle.airbnb" },
      { value: "glamping", labelKey: "options.accommodationStyle.glamping" },
      { value: "resort", labelKey: "options.accommodationStyle.resort" },
      { value: "bed_and_breakfast", labelKey: "options.accommodationStyle.bed_and_breakfast" },
    ],
  },
  {
    key: "fitnessLevel",
    titleKey: "categories.fitnessLevel.title",
    questionKey: "categories.fitnessLevel.question",
    selectionType: "single",
    options: [
      { value: "low", labelKey: "options.fitnessLevel.low", descriptionKey: "categories.fitnessLevel.lowDesc" },
      { value: "moderate", labelKey: "options.fitnessLevel.moderate", descriptionKey: "categories.fitnessLevel.moderateDesc" },
      { value: "high", labelKey: "options.fitnessLevel.high", descriptionKey: "categories.fitnessLevel.highDesc" },
    ],
  },
  {
    key: "photographyInterest",
    titleKey: "categories.photographyInterest.title",
    questionKey: "categories.photographyInterest.question",
    selectionType: "single",
    options: [
      { value: "casual", labelKey: "options.photographyInterest.casual", descriptionKey: "categories.photographyInterest.casualDesc" },
      { value: "enthusiast", labelKey: "options.photographyInterest.enthusiast", descriptionKey: "categories.photographyInterest.enthusiastDesc" },
      { value: "professional", labelKey: "options.photographyInterest.professional", descriptionKey: "categories.photographyInterest.professionalDesc" },
    ],
  },
  {
    key: "wakePreference",
    titleKey: "categories.wakePreference.title",
    questionKey: "categories.wakePreference.question",
    selectionType: "single",
    options: [
      { value: "early_bird", labelKey: "options.wakePreference.early_bird", descriptionKey: "categories.wakePreference.earlyBirdDesc" },
      { value: "flexible", labelKey: "options.wakePreference.flexible", descriptionKey: "categories.wakePreference.flexibleDesc" },
      { value: "night_owl", labelKey: "options.wakePreference.night_owl", descriptionKey: "categories.wakePreference.nightOwlDesc" },
    ],
  },
  {
    key: "connectivityNeeds",
    titleKey: "categories.connectivityNeeds.title",
    questionKey: "categories.connectivityNeeds.question",
    selectionType: "single",
    options: [
      { value: "essential", labelKey: "options.connectivityNeeds.essential", descriptionKey: "categories.connectivityNeeds.essentialDesc" },
      { value: "occasional", labelKey: "options.connectivityNeeds.occasional", descriptionKey: "categories.connectivityNeeds.occasionalDesc" },
      { value: "digital_detox", labelKey: "options.connectivityNeeds.digital_detox", descriptionKey: "categories.connectivityNeeds.digitalDetoxDesc" },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

interface PreferencesSectionProps {
  initialPreferences: unknown;
}

export function PreferencesSection({ initialPreferences }: PreferencesSectionProps) {
  const t = useTranslations("preferences");
  const [preferences, setPreferences] = useState<UserPreferences>(
    () => parsePreferences(initialPreferences)
  );
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filledCount = countFilledCategories(preferences);

  const debouncedSave = useCallback(
    (newPrefs: UserPreferences) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSaveError(false);
        startTransition(async () => {
          const result = await savePreferencesAction(newPrefs);
          if (!result.success) {
            setSaveError(true);
          }
        });
      }, 500);
    },
    [startTransition]
  );

  function handleCategoryChange(
    categoryKey: PreferenceCategoryKey,
    values: string | string[] | null
  ) {
    const updated = { ...preferences, [categoryKey]: values };
    setPreferences(updated);
    debouncedSave(updated);
  }

  // Progress text
  let progressText: string;
  if (filledCount === 0) {
    progressText = t("progressHintStart");
  } else if (filledCount < 10) {
    progressText = t("progressHintContinue", { remaining: 10 - filledCount });
  } else {
    progressText = t("progressComplete");
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-base font-semibold text-foreground">
          {t("sectionTitle")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("sectionSubtitle")}
        </p>
        <div className="mt-3">
          <PreferenceProgressBar
            filledCount={filledCount}
            progressText={progressText}
          />
        </div>
        {saveError && (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {t("saveError")}
          </p>
        )}
        {isPending && (
          <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
            {t("saving")}
          </p>
        )}
      </div>

      {/* Category cards */}
      {CATEGORY_CONFIGS.map((config) => (
        <PreferenceCategory
          key={config.key}
          categoryKey={config.key}
          title={t(config.titleKey)}
          question={t(config.questionKey)}
          options={config.options}
          selectionType={config.selectionType}
          selectedValues={preferences[config.key]}
          onSelectionChange={(values) =>
            handleCategoryChange(config.key, values)
          }
          t={t}
          pointsLabel={t("pointsPerCategory")}
        />
      ))}
    </div>
  );
}
