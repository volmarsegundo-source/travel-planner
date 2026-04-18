"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useFormDirty } from "@/hooks/useFormDirty";
import { useRegisterWizardDirty } from "@/hooks/useRegisterWizardDirty";
import { AtlasButton, AtlasInput, AtlasCard } from "@/components/ui";
import { PhaseShell } from "./PhaseShell";
import { DestinationAutocomplete } from "./DestinationAutocomplete";
import {
  MultiCitySelector,
  type DestinationDraft,
} from "./MultiCitySelector";
import { UpsellModal } from "@/components/features/premium/UpsellModal";
import { useIsPremium } from "@/hooks/useIsPremium";
import {
  createExpeditionAction,
  updatePhase1Action,
} from "@/server/actions/expedition.actions";
import { classifyTrip, type TripType } from "@/lib/travel/trip-classifier";
import { formatBrazilianPhone, isValidBrazilianPhone } from "@/lib/utils/phone";
import { PhaseFooter } from "./PhaseFooter";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";

const TOTAL_STEPS = 4;

// Sprint 43 Wave 3: multi-city plan caps.
const FREE_MAX_CITIES = 1;
const PREMIUM_MAX_CITIES = 4;

const TRIP_TYPE_BADGES: Record<TripType, { emoji: string; key: string }> = {
  domestic: { emoji: "\u{1F3E0}", key: "domestic" },
  mercosul: { emoji: "\u{1F33F}", key: "mercosul" },
  international: { emoji: "\u{1F30D}", key: "international" },
  schengen: { emoji: "\u{1F30D}", key: "international" },
};

/** Pre-filled profile data from server. */
interface UserProfileData {
  birthDate?: string;
  phone?: string;
  country?: string;
  city?: string;
  bio?: string;
}

/** Minimum fields that count as a "complete" profile for skip logic. */
const PROFILE_COMPLETE_FIELDS: (keyof UserProfileData)[] = [
  "birthDate",
  "country",
  "city",
];

function isProfileComplete(profile?: UserProfileData): boolean {
  if (!profile) return false;
  return PROFILE_COMPLETE_FIELDS.every(
    (key) => profile[key] !== undefined && profile[key] !== ""
  );
}

interface Phase1WizardV2Props {
  passportExpiry?: string;
  userCountry?: string;
  userProfile?: UserProfileData;
  userName?: string;
  savedDestination?: string;
  savedOrigin?: string;
  savedStartDate?: string;
  savedEndDate?: string;
  tripId?: string;
  accessMode?: PhaseAccessMode;
  tripCurrentPhase?: number;
  completedPhases?: number[];
}

export function Phase1WizardV2({
  passportExpiry,
  userProfile,
  userName,
  savedDestination,
  savedOrigin,
  savedStartDate,
  savedEndDate,
  tripId: _tripId,
  accessMode = "first_visit",
  tripCurrentPhase = 1,
  completedPhases = [],
}: Phase1WizardV2Props) {
  const t = useTranslations("expedition.phase1");
  const tV2 = useTranslations("phase1V2");
  const tExpedition = useTranslations("expedition");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tRoot = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isEditMode = accessMode === "revisit";

  const [currentStep, setCurrentStep] = useState(() => {
    const stepParam = searchParams?.get("step") ?? null;
    const parsed = stepParam ? parseInt(stepParam, 10) : 1;
    return parsed >= 1 && parsed <= TOTAL_STEPS ? parsed : 1;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phoneInvalid, setPhoneInvalid] = useState(false);

  // Profile persistence: show summary card when profile is complete
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const profileComplete = useMemo(
    () => isProfileComplete(userProfile),
    [userProfile]
  );

  // Form data
  const [destination, setDestination] = useState(savedDestination ?? "");
  const [destinationCountryCode, setDestinationCountryCode] = useState<string | null>(null);
  const [destinationLat, setDestinationLat] = useState<number | undefined>(undefined);
  const [destinationLon, setDestinationLon] = useState<number | undefined>(undefined);
  const [originCountryCode, setOriginCountryCode] = useState<string | null>(null);
  const [origin, setOrigin] = useState(
    savedOrigin
      ?? (userProfile?.city && userProfile?.country
        ? `${userProfile.city}, ${userProfile.country}`
        : "")
  );
  const [destinationSelectedRef] = useState<{ value: string | null }>({ value: null });
  const [originSelectedRef] = useState<{ value: string | null }>({ value: null });
  const [startDate, setStartDate] = useState(savedStartDate ?? "");
  const [endDate, setEndDate] = useState(savedEndDate ?? "");
  const [flexibleDates, setFlexibleDates] = useState(false);

  // Sprint 43 Wave 3: multi-city state. When `multiCityEnabled` is true the
  // destination single-field is hidden and `<MultiCitySelector>` owns the
  // list of destinations. The single-field value stays mirrored with
  // `destinations[0].city` for backwards compatibility.
  const { isPremium } = useIsPremium();
  const [multiCityEnabled, setMultiCityEnabled] = useState(false);
  const [destinations, setDestinations] = useState<DestinationDraft[]>(() => [
    {
      order: 0,
      city: savedDestination ?? "",
      startDate: savedStartDate || undefined,
      endDate: savedEndDate || undefined,
    },
  ]);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const maxCities = isPremium ? PREMIUM_MAX_CITIES : FREE_MAX_CITIES;

  // Profile fields
  const [birthDate, setBirthDate] = useState(userProfile?.birthDate ?? "");
  const [phone, setPhone] = useState(userProfile?.phone ?? "");
  const [country, setCountry] = useState(userProfile?.country ?? "");
  const [city, setCity] = useState(userProfile?.city ?? "");
  const [bio, setBio] = useState(userProfile?.bio ?? "");
  const [name, setName] = useState(userName ?? "");

  // Derived display value for profile location autocomplete
  const profileLocationDisplay = useMemo(() => {
    if (city && country) return `${city}, ${country}`;
    return city || country || "";
  }, [city, country]);

  const [profileLocationSelectedRef] = useState<{ value: string | null }>({ value: null });

  function handleProfileLocationChange(newValue: string) {
    // When the user types freely (not selecting from dropdown), update city only
    if (profileLocationSelectedRef.value && newValue !== profileLocationSelectedRef.value) {
      setCity(newValue);
      setCountry("");
      profileLocationSelectedRef.value = null;
    } else if (!profileLocationSelectedRef.value) {
      setCity(newValue);
    }
  }

  function handleProfileLocationSelect(result: {
    displayName: string;
    country: string | null;
    countryCode: string | null;
    lat: number;
    lon: number;
    city: string | null;
    state: string | null;
  }) {
    setCity(result.city ?? "");
    setCountry(result.country ?? "");
    const display = result.city && result.country
      ? `${result.city}, ${result.country}`
      : result.city ?? result.country ?? result.displayName;
    profileLocationSelectedRef.value = display;
  }

  const stepContentRef = useRef<HTMLDivElement>(null);
  const tripIdRef = useRef<string>(_tripId ?? "");
  const locale = useLocale();

  // Dirty tracking
  const formValues = useMemo(() => ({
    destination, origin, startDate, endDate, flexibleDates: String(flexibleDates),
    birthDate, phone, country, city, bio, name,
  }), [destination, origin, startDate, endDate, flexibleDates, birthDate, phone, country, city, bio, name]);

  const { isDirty: formDirty, markClean } = useFormDirty(formValues);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sprint 43: Build a serializable `destinations` array for the server
  // action. Always returns at least one item. In single-city mode, derives
  // from the current form state so the server's dual-write stays consistent.
  const buildDestinationsPayload = useCallback((): DestinationDraft[] => {
    if (multiCityEnabled) {
      return destinations
        .filter((row) => row.city.trim().length > 0)
        .map((row, idx) => ({ ...row, order: idx }));
    }
    return [
      {
        order: 0,
        city: destination.trim(),
        country: undefined,
        latitude: destinationLat,
        longitude: destinationLon,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
    ];
  }, [
    multiCityEnabled,
    destinations,
    destination,
    destinationLat,
    destinationLon,
    startDate,
    endDate,
  ]);

  async function handleSave() {
    if (!isEditMode || !_tripId) return;
    const profileFields: Record<string, string | undefined> = {};
    if (birthDate) profileFields.birthDate = birthDate;
    if (phone) profileFields.phone = phone;
    if (country) profileFields.country = country;
    if (city) profileFields.city = city;
    if (bio) profileFields.bio = bio;
    if (name) profileFields.name = name;

    const destList = buildDestinationsPayload();
    const primaryCity = destList[0]?.city ?? destination.trim();

    const payload = {
      destination: primaryCity,
      origin: origin.trim() || undefined,
      destinationCountryCode: destinationCountryCode ?? undefined,
      originCountryCode: originCountryCode ?? undefined,
      destinationLat,
      destinationLon,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      flexibleDates,
      destinations: destList,
      profileFields: Object.keys(profileFields).length > 0 ? profileFields : undefined,
    };

    try {
      const result = await updatePhase1Action(_tripId, payload);
      if (result.success) {
        markClean();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setErrorMessage(result.error);
      }
    } catch {
      setErrorMessage("errors.generic");
    }
  }

  async function handleSaveDraft() {
    const destList = buildDestinationsPayload();
    const primaryCity = destList[0]?.city ?? destination.trim();
    if (!primaryCity) {
      setErrorMessage(t("errors.destinationRequired"));
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    const profileFields: Record<string, string | undefined> = {};
    if (birthDate) profileFields.birthDate = birthDate;
    if (phone) profileFields.phone = phone;
    if (country) profileFields.country = country;
    if (city) profileFields.city = city;
    if (bio) profileFields.bio = bio;
    if (name) profileFields.name = name;

    const payload = {
      destination: primaryCity,
      origin: origin.trim() || undefined,
      destinationCountryCode: destinationCountryCode ?? undefined,
      originCountryCode: originCountryCode ?? undefined,
      destinationLat,
      destinationLon,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      flexibleDates,
      destinations: destList,
      profileFields: Object.keys(profileFields).length > 0 ? profileFields : undefined,
    };

    try {
      if (_tripId) {
        const result = await updatePhase1Action(_tripId, payload);
        if (result.success) {
          markClean();
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        } else {
          setErrorMessage(result.error ?? "errors.generic");
        }
      } else {
        const result = await createExpeditionAction(payload);
        if (result.success && result.data) {
          tripIdRef.current = result.data.tripId;
          markClean();
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        } else if (!result.success) {
          setErrorMessage(result.error ?? "errors.generic");
        }
      }
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Register dirty state in context for LanguageSwitcher interception (D2)
  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;
  const stableSave = useCallback(() => saveRef.current(), []);
  const noopDiscard = useCallback(() => {}, []);
  useRegisterWizardDirty({
    isDirty: formDirty,
    save: stableSave,
    discard: noopDiscard,
  });

  // Auto-resolve origin country code
  const resolveCountryCode = useCallback(async (query: string, setter: (code: string | null) => void) => {
    if (query.length < 2) return;
    try {
      const response = await fetch(
        `/api/destinations/search?q=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`
      );
      if (response.ok) {
        const data = await response.json();
        const results = data.results ?? [];
        if (results.length > 0 && results[0].countryCode) {
          setter(results[0].countryCode);
        }
      }
    } catch {
      // Silently degrade
    }
  }, [locale]);

  useEffect(() => {
    if (origin && !originCountryCode && !savedOrigin) {
      resolveCountryCode(origin, setOriginCountryCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trip type classification
  const tripType = useMemo(() => {
    if (originCountryCode && destinationCountryCode) {
      return classifyTrip(originCountryCode, destinationCountryCode);
    }
    return null;
  }, [originCountryCode, destinationCountryCode]);

  // Passport expiry warning
  const showPassportWarning = useMemo(() => {
    if (!passportExpiry || !endDate) return false;
    const passportDate = new Date(passportExpiry);
    const tripEndDate = new Date(endDate);
    const sixMonthsAfterEnd = new Date(tripEndDate);
    sixMonthsAfterEnd.setMonth(sixMonthsAfterEnd.getMonth() + 6);
    return passportDate < sixMonthsAfterEnd;
  }, [passportExpiry, endDate]);

  function goToStep(step: number) {
    setCurrentStep(step);
    setErrorMessage(null);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(step));
    window.history.replaceState({}, "", url.toString());
    requestAnimationFrame(() => {
      const firstInput = stepContentRef.current?.querySelector<HTMLElement>(
        "input, button[type='submit']"
      );
      firstInput?.focus();
    });
  }

  function handleStep1Next() {
    if (!name.trim()) {
      setErrorMessage(t("errors.nameRequired"));
      return;
    }
    if (!birthDate) {
      setErrorMessage(t("errors.birthDateRequired"));
      return;
    }
    goToStep(2);
  }

  function handleStep2Next() {
    if (multiCityEnabled) {
      const hasAtLeastOne = destinations.some((row) => row.city.trim().length > 0);
      if (!hasAtLeastOne) {
        setErrorMessage(t("errors.destinationRequired"));
        return;
      }
    } else if (!destination.trim()) {
      setErrorMessage(t("errors.destinationRequired"));
      return;
    }
    goToStep(3);
  }

  function handleStep3Next() {
    if (!flexibleDates && (!startDate || !endDate)) {
      setErrorMessage(t("errors.datesRequired"));
      return;
    }
    if (startDate) {
      const start = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start <= today) {
        setErrorMessage(t("errors.dateInPast"));
        return;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (end <= today) {
        setErrorMessage(t("errors.dateInPast"));
        return;
      }
    }
    if (startDate && endDate) {
      if (startDate === endDate) {
        setErrorMessage(t("errors.sameDates"));
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setErrorMessage(t("errors.startAfterEnd"));
        return;
      }
    }
    goToStep(4);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMessage(null);

    const profileFields: Record<string, string | undefined> = {};
    if (birthDate) profileFields.birthDate = birthDate;
    if (phone) profileFields.phone = phone;
    if (country) profileFields.country = country;
    if (city) profileFields.city = city;
    if (bio) profileFields.bio = bio;
    if (name) profileFields.name = name;

    const destList = buildDestinationsPayload();
    const primaryCity = destList[0]?.city ?? destination.trim();

    const payload = {
      destination: primaryCity,
      origin: origin.trim() || undefined,
      destinationCountryCode: destinationCountryCode ?? undefined,
      originCountryCode: originCountryCode ?? undefined,
      destinationLat,
      destinationLon,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      flexibleDates,
      destinations: destList,
      profileFields: Object.keys(profileFields).length > 0 ? profileFields : undefined,
    };

    try {
      // Use tripIdRef (may have been set by auto-save) or _tripId from props
      const existingTripId = _tripId || tripIdRef.current || "";

      if (existingTripId) {
        const result = await updatePhase1Action(existingTripId, payload);
        if (!result.success) {
          setErrorMessage(result.error);
          setIsSubmitting(false);
          return;
        }
        router.push(`/expedition/${existingTripId}/phase-2`);
      } else {
        const result = await createExpeditionAction(payload);
        if (!result.success) {
          setErrorMessage(result.error);
          setIsSubmitting(false);
          return;
        }
        tripIdRef.current = result.data!.tripId;
        router.push(`/expedition/${result.data!.tripId}/phase-2`);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Phase1WizardV2] handleSubmit error:", error);
      }
      setErrorMessage("errors.generic");
      setIsSubmitting(false);
    }
  }

  function handleDestinationSelect(result: { displayName: string; country: string | null; countryCode: string | null; lat: number; lon: number }) {
    setDestinationCountryCode(result.countryCode);
    setDestinationLat(result.lat);
    setDestinationLon(result.lon);
    destinationSelectedRef.value = result.displayName;
  }

  function handleOriginSelect(result: { displayName: string; country: string | null; countryCode: string | null }) {
    setOriginCountryCode(result.countryCode);
    originSelectedRef.value = result.displayName;
  }

  function handleDestinationChange(newValue: string) {
    setDestination(newValue);
    if (destinationSelectedRef.value && newValue !== destinationSelectedRef.value) {
      setDestinationCountryCode(null);
      setDestinationLat(undefined);
      setDestinationLon(undefined);
      destinationSelectedRef.value = null;
    }
  }

  function handleOriginChange(newValue: string) {
    setOrigin(newValue);
    if (originSelectedRef.value && newValue !== originSelectedRef.value) {
      setOriginCountryCode(null);
      originSelectedRef.value = null;
    }
  }

  const getFooterProps = () => {
    const dirtyProps = isEditMode && _tripId
      ? { onSave: handleSave, isDirty: formDirty, saveSuccess }
      : {};

    const draftAction = !isEditMode
      ? { secondaryActions: [{ label: tV2("saveDraft"), onClick: handleSaveDraft }] }
      : {};

    if (currentStep === 1) {
      return undefined;
    }
    if (currentStep === 2) {
      return {
        onBack: () => goToStep(1),
        onPrimary: handleStep2Next,
        primaryLabel: tCommon("next"),
        ...dirtyProps,
        ...draftAction,
      };
    }
    if (currentStep === 3) {
      return {
        onBack: () => goToStep(2),
        onPrimary: handleStep3Next,
        primaryLabel: tCommon("next"),
        ...dirtyProps,
        ...draftAction,
      };
    }
    return {
      onBack: () => goToStep(3),
      onPrimary: handleSubmit,
      primaryLabel: isEditMode
        ? tCommon("save")
        : tExpedition("cta.advance"),
      isLoading: isSubmitting,
      isDisabled: isSubmitting,
      ...dirtyProps,
      ...draftAction,
    };
  };

  return (
    <PhaseShell
      tripId={_tripId ?? ""}
      viewingPhase={1}
      tripCurrentPhase={tripCurrentPhase}
      completedPhases={completedPhases}
      phaseTitle={t("title")}
      phaseSubtitle={t("subtitle")}
      currentStep={currentStep}
      totalSteps={TOTAL_STEPS}
      isEditMode={isEditMode}
      showFooter={currentStep > 1 && currentStep < 4}
      footerProps={currentStep > 1 && currentStep < 4 ? getFooterProps() : undefined}
    >
      <div
        ref={stepContentRef}
        key={currentStep}
        className="flex flex-col gap-6"
        aria-live="polite"
        aria-atomic="true"
        data-testid="phase1-v2"
      >
        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg bg-atlas-error-container px-4 py-3 text-sm font-atlas-body text-atlas-error border border-atlas-error/30"
          >
            {(() => {
              // Server actions may return either a pre-translated string or a
              // dotted i18n key (e.g. "limits.expeditionCap", "errors.generic").
              // Try root translator for any dotted key; fall back to raw text.
              if (errorMessage.startsWith("errors.")) {
                return tErrors(errorMessage.replace("errors.", ""));
              }
              if (/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(errorMessage)) {
                try {
                  return tRoot(errorMessage);
                } catch {
                  return errorMessage;
                }
              }
              return errorMessage;
            })()}
          </div>
        )}

        {/* Step 1: About You */}
        {currentStep === 1 && (
          <>
          <AtlasCard variant="base">
            <h2 className="font-atlas-headline text-lg font-bold text-atlas-on-surface">
              {t("step1.title")}
            </h2>

            {profileComplete && !isEditingProfile ? (
              <div className="mt-4 flex flex-col gap-4">
                <div className="rounded-lg bg-atlas-surface-container-low p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium font-atlas-body text-atlas-on-surface-variant">
                      {t("step1.savedProfileTitle")}
                    </h3>
                    <AtlasButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingProfile(true)}
                      data-testid="edit-profile-btn"
                    >
                      {t("step1.editProfile")}
                    </AtlasButton>
                  </div>
                  <dl className="space-y-2 text-sm font-atlas-body">
                    {name && (
                      <div className="flex justify-between">
                        <dt className="text-atlas-on-surface-variant">{t("step1.name")}</dt>
                        <dd className="font-medium text-atlas-on-surface">{name}</dd>
                      </div>
                    )}
                    {birthDate && (
                      <div className="flex justify-between">
                        <dt className="text-atlas-on-surface-variant">{t("step1.birthDate")}</dt>
                        <dd className="font-medium text-atlas-on-surface">{birthDate}</dd>
                      </div>
                    )}
                    {phone && (
                      <div className="flex justify-between">
                        <dt className="text-atlas-on-surface-variant">{t("step1.phone")}</dt>
                        <dd className="font-medium text-atlas-on-surface">{phone}</dd>
                      </div>
                    )}
                    {(country || city) && (
                      <div className="flex justify-between">
                        <dt className="text-atlas-on-surface-variant">{t("step1.country")}</dt>
                        <dd className="font-medium text-atlas-on-surface">
                          {[city, country].filter(Boolean).join(", ")}
                        </dd>
                      </div>
                    )}
                    {bio && (
                      <div className="flex justify-between gap-4">
                        <dt className="shrink-0 text-atlas-on-surface-variant">{t("step1.bio")}</dt>
                        <dd className="font-medium text-atlas-on-surface text-right">
                          {bio.length > 80 ? `${bio.slice(0, 80)}...` : bio}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-sm font-atlas-body text-atlas-on-surface-variant">
                  {t("step1.subtitle")}
                </p>

                <div className="flex flex-col gap-3">
                  <AtlasInput
                    id="profile-name-v2"
                    label={t("step1.name")}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    placeholder={t("step1.namePlaceholder")}
                    required
                  />

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="profile-birthdate-v2"
                      className="text-sm font-medium text-atlas-on-surface-variant"
                    >
                      {t("step1.birthDate")} <span className="text-atlas-error" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="profile-birthdate-v2"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      required
                      className="w-full min-h-[48px] px-4 py-3 text-base font-atlas-body bg-atlas-surface-container-low text-atlas-on-surface placeholder:text-atlas-outline-variant rounded-lg border border-atlas-outline-variant transition-all duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2 focus:border-atlas-outline focus:bg-atlas-surface-container-lowest"
                    />
                  </div>

                  <AtlasInput
                    id="profile-phone-v2"
                    label={t("step1.phone")}
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const formatted = formatBrazilianPhone(e.target.value);
                      setPhone(formatted);
                      if (phoneInvalid && isValidBrazilianPhone(formatted)) {
                        setPhoneInvalid(false);
                      }
                    }}
                    onBlur={() => {
                      setPhoneInvalid(!isValidBrazilianPhone(phone));
                    }}
                    maxLength={15}
                    placeholder={t("step1.phonePlaceholder")}
                    error={phoneInvalid ? t("step1.phoneInvalid") : undefined}
                    helperText={!phoneInvalid ? t("step1.phoneHint") : undefined}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-sm font-medium text-atlas-on-surface-variant"
                    >
                      {t("step1.city")} / {t("step1.country")}
                    </label>
                    <DestinationAutocomplete
                      id="profile-location-v2"
                      name="profile-location"
                      value={profileLocationDisplay}
                      onChange={handleProfileLocationChange}
                      onSelect={handleProfileLocationSelect}
                      placeholder={t("step1.locationPlaceholder")}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="profile-bio-v2"
                      className="text-sm font-medium text-atlas-on-surface-variant"
                    >
                      {t("step1.bio")}
                    </label>
                    <textarea
                      id="profile-bio-v2"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full min-h-[48px] px-4 py-3 text-base font-atlas-body bg-atlas-surface-container-low text-atlas-on-surface placeholder:text-atlas-outline-variant rounded-lg border border-atlas-outline-variant transition-all duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2 focus:border-atlas-outline focus:bg-atlas-surface-container-lowest"
                      placeholder={t("step1.bioPlaceholder")}
                    />
                    <span className="text-xs font-atlas-body text-atlas-on-surface-variant">
                      {bio.length}/500
                    </span>
                  </div>
                </div>

                <p className="text-xs font-atlas-body text-atlas-on-surface-variant">
                  {t("step1.optional")}
                </p>

              </div>
            )}
          </AtlasCard>

          <PhaseFooter
            onNext={handleStep1Next}
            isSubmitting={isSubmitting}
            canAdvance={!isSubmitting}
            showBackButton={false}
          />
          </>
        )}

        {/* Step 2: Destination */}
        {currentStep === 2 && (
          <AtlasCard variant="base">
            <div className="flex flex-col gap-4">
              {/* Sprint 43: multi-city toggle */}
              <div className="flex items-start justify-between gap-3 rounded-lg bg-atlas-surface-container-low px-4 py-3">
                <div className="flex-1">
                  <label
                    htmlFor="multi-city-toggle"
                    className={`flex items-center gap-2 font-atlas-body text-sm font-medium ${
                      isPremium
                        ? "text-atlas-on-surface cursor-pointer"
                        : "text-atlas-on-surface-variant"
                    }`}
                  >
                    <input
                      id="multi-city-toggle"
                      type="checkbox"
                      checked={multiCityEnabled}
                      disabled={!isPremium}
                      aria-disabled={!isPremium}
                      onChange={(event) => {
                        if (!isPremium) {
                          setIsUpsellOpen(true);
                          return;
                        }
                        setMultiCityEnabled(event.target.checked);
                      }}
                      onClick={(event) => {
                        if (!isPremium) {
                          event.preventDefault();
                          setIsUpsellOpen(true);
                        }
                      }}
                      className="h-4 w-4 rounded border-atlas-outline-variant focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
                      data-testid="multi-city-toggle"
                    />
                    {t("multiCityToggle")}
                    {!isPremium && (
                      <span
                        aria-label={t("premiumOnlyLabel")}
                        title={t("premiumOnlyLabel")}
                        className="inline-flex items-center gap-1 rounded-full bg-atlas-secondary-container/40 px-2 py-0.5 text-xs font-semibold text-atlas-primary"
                      >
                        <span aria-hidden="true">{"\u{1F512}"}</span>
                        <span>{t("premiumBadge")}</span>
                      </span>
                    )}
                  </label>
                  <p className="mt-1 font-atlas-body text-xs text-atlas-on-surface-variant">
                    {t("multiCityHint")}
                  </p>
                </div>
              </div>

              {multiCityEnabled ? (
                <div data-testid="multi-city-container">
                  <MultiCitySelector
                    value={destinations}
                    onChange={setDestinations}
                    maxCities={maxCities}
                    isPremium={isPremium}
                    onUpsellRequested={() => setIsUpsellOpen(true)}
                  />
                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-medium text-atlas-on-surface-variant">
                      {t("step2.origin")}
                    </label>
                    <DestinationAutocomplete
                      value={origin}
                      onChange={handleOriginChange}
                      onSelect={handleOriginSelect}
                      placeholder={t("step2.originPlaceholder")}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  data-testid="step2-fields-grid"
                >
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-atlas-on-surface-variant">
                      {t("step2.title")}
                    </label>
                    <DestinationAutocomplete
                      value={destination}
                      onChange={handleDestinationChange}
                      onSelect={handleDestinationSelect}
                      placeholder={t("step2.placeholder")}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-atlas-on-surface-variant">
                      {t("step2.origin")}
                    </label>
                    <DestinationAutocomplete
                      value={origin}
                      onChange={handleOriginChange}
                      onSelect={handleOriginSelect}
                      placeholder={t("step2.originPlaceholder")}
                    />
                    <p className="mt-1 text-xs font-atlas-body text-atlas-on-surface-variant">
                      {t("step2.originHint")}
                    </p>
                  </div>
                </div>
              )}
              {tripType && (
                <div className="flex items-center gap-2 rounded-lg bg-atlas-secondary-container/10 px-3 py-2 text-sm font-atlas-body text-atlas-primary">
                  <span>{TRIP_TYPE_BADGES[tripType].emoji}</span>
                  <span>{t(`tripType.${TRIP_TYPE_BADGES[tripType].key}`)}</span>
                </div>
              )}
            </div>
          </AtlasCard>
        )}

        {/* Step 3: Dates */}
        {currentStep === 3 && (
          <AtlasCard variant="base">
            <div className="flex flex-col gap-4">
              <h2 className="font-atlas-headline text-lg font-bold text-atlas-on-surface">
                {t("step3.title")}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="expedition-start-date-v2"
                    className="text-sm font-medium text-atlas-on-surface-variant"
                  >
                    {t("step3.startDate")}
                  </label>
                  <input
                    id="expedition-start-date-v2"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 text-base font-atlas-body bg-atlas-surface-container-low text-atlas-on-surface rounded-lg border border-atlas-outline-variant transition-all duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2 focus:border-atlas-outline focus:bg-atlas-surface-container-lowest"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="expedition-end-date-v2"
                    className="text-sm font-medium text-atlas-on-surface-variant"
                  >
                    {t("step3.endDate")}
                  </label>
                  <input
                    id="expedition-end-date-v2"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 text-base font-atlas-body bg-atlas-surface-container-low text-atlas-on-surface rounded-lg border border-atlas-outline-variant transition-all duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2 focus:border-atlas-outline focus:bg-atlas-surface-container-lowest"
                  />
                </div>
              </div>
              {startDate && endDate && new Date(endDate) > new Date(startDate) && (
                <p
                  className="text-sm font-atlas-body text-atlas-primary font-medium"
                  data-testid="trip-duration"
                >
                  {tV2("duration", {
                    days: Math.round(
                      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ),
                  })}
                </p>
              )}
              {showPassportWarning && (
                <div className="flex items-start gap-2 rounded-lg bg-atlas-warning-container border border-atlas-warning/30 px-4 py-3 text-sm font-atlas-body text-atlas-warning">
                  <span className="mt-0.5" aria-hidden="true">{"\u26A0\uFE0F"}</span>
                  <span>{t("passportExpiryWarning")}</span>
                </div>
              )}
              <label className="flex min-h-[44px] items-center gap-2 text-sm font-atlas-body text-atlas-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={flexibleDates}
                  onChange={(e) => setFlexibleDates(e.target.checked)}
                  className="rounded border-atlas-outline-variant focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
                />
                {t("step3.flexibleDates")}
              </label>
            </div>
          </AtlasCard>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <>
          <AtlasCard variant="base">
            <div className="flex flex-col gap-4">
              <h2 className="font-atlas-headline text-lg font-bold text-atlas-on-surface">
                {t("step4.title")}
              </h2>
              <div className="rounded-lg bg-atlas-surface-container-low p-4">
                <h3 className="mb-3 text-sm font-medium font-atlas-body text-atlas-on-surface-variant">
                  {t("step4.summary")}
                </h3>
                <dl className="space-y-2 text-sm font-atlas-body">
                  <div className="flex justify-between">
                    <dt className="text-atlas-on-surface-variant">{t("step4.destination")}</dt>
                    <dd className="font-medium text-atlas-on-surface">{destination}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-atlas-on-surface-variant">{t("step4.origin")}</dt>
                    <dd className={origin ? "font-medium text-atlas-on-surface" : "text-atlas-outline-variant italic"}>
                      {origin || tCommon("notProvided")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-atlas-on-surface-variant">{t("step4.dates")}</dt>
                    <dd className="font-medium text-atlas-on-surface">
                      {startDate && endDate
                        ? `${startDate} \u2192 ${endDate}`
                        : flexibleDates
                          ? t("step4.yes")
                          : "\u2014"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-atlas-on-surface-variant">{t("step4.flexibleDates")}</dt>
                    <dd className="font-medium text-atlas-on-surface">
                      {flexibleDates ? t("step4.yes") : t("step4.no")}
                    </dd>
                  </div>
                  {tripType && (
                    <div className="flex justify-between">
                      <dt className="text-atlas-on-surface-variant">{t("step4.tripType")}</dt>
                      <dd className="font-medium text-atlas-on-surface flex items-center gap-1.5">
                        <span>{TRIP_TYPE_BADGES[tripType].emoji}</span>
                        <span>{t(`tripType.${TRIP_TYPE_BADGES[tripType].key}`)}</span>
                      </dd>
                    </div>
                  )}
                </dl>
                <h3 className="mb-3 mt-4 text-sm font-medium font-atlas-body text-atlas-on-surface-variant">
                  {t("step4.profileSummary")}
                </h3>
                <dl className="space-y-2 text-sm font-atlas-body">
                  <div className="flex justify-between">
                    <dt className="text-atlas-on-surface-variant">{t("step1.name")}</dt>
                    <dd className={name ? "font-medium text-atlas-on-surface" : "text-atlas-outline-variant italic"}>
                      {name || tCommon("notProvided")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-atlas-on-surface-variant">{t("step1.birthDate")}</dt>
                    <dd className={birthDate ? "font-medium text-atlas-on-surface" : "text-atlas-outline-variant italic"}>
                      {birthDate || tCommon("notProvided")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-atlas-on-surface-variant">{t("step1.phone")}</dt>
                    <dd className={phone ? "font-medium text-atlas-on-surface" : "text-atlas-outline-variant italic"}>
                      {phone || tCommon("notProvided")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-atlas-on-surface-variant">{t("step4.location")}</dt>
                    <dd className={(country || city) ? "font-medium text-atlas-on-surface" : "text-atlas-outline-variant italic"}>
                      {(country || city) ? [city, country].filter(Boolean).join(", ") : tCommon("notProvided")}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-atlas-on-surface-variant">{t("step4.bio")}</dt>
                    <dd className={bio ? "font-medium text-atlas-on-surface text-right" : "text-atlas-outline-variant italic"}>
                      {bio ? (bio.length > 100 ? `${bio.slice(0, 100)}...` : bio) : tCommon("notProvided")}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </AtlasCard>

          <PhaseFooter
            onNext={handleSubmit}
            onBack={() => goToStep(3)}
            isSubmitting={isSubmitting}
            canAdvance={!isSubmitting}
            showBackButton={true}
            isDirty={isEditMode && _tripId ? formDirty : false}
            onSave={isEditMode && _tripId ? handleSave : undefined}
          />
          </>
        )}
      </div>
      <UpsellModal
        open={isUpsellOpen}
        onClose={() => setIsUpsellOpen(false)}
      />
    </PhaseShell>
  );
}
