"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useFormDirty } from "@/hooks/useFormDirty";
import { AtlasButton, AtlasInput, AtlasCard } from "@/components/ui";
import { PhaseShell } from "./PhaseShell";
import { DestinationAutocomplete } from "./DestinationAutocomplete";
import {
  createExpeditionAction,
  updatePhase1Action,
} from "@/server/actions/expedition.actions";
import { classifyTrip, type TripType } from "@/lib/travel/trip-classifier";
import { formatBrazilianPhone, isValidBrazilianPhone } from "@/lib/utils/phone";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";

const TOTAL_STEPS = 4;

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

  // Profile fields
  const [birthDate, setBirthDate] = useState(userProfile?.birthDate ?? "");
  const [phone, setPhone] = useState(userProfile?.phone ?? "");
  const [country, setCountry] = useState(userProfile?.country ?? "");
  const [city, setCity] = useState(userProfile?.city ?? "");
  const [bio, setBio] = useState(userProfile?.bio ?? "");
  const [name, setName] = useState(userName ?? "");

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

  async function handleSave() {
    if (!isEditMode || !_tripId) return;
    const profileFields: Record<string, string | undefined> = {};
    if (birthDate) profileFields.birthDate = birthDate;
    if (phone) profileFields.phone = phone;
    if (country) profileFields.country = country;
    if (city) profileFields.city = city;
    if (bio) profileFields.bio = bio;
    if (name) profileFields.name = name;

    const payload = {
      destination: destination.trim(),
      origin: origin.trim() || undefined,
      destinationCountryCode: destinationCountryCode ?? undefined,
      originCountryCode: originCountryCode ?? undefined,
      destinationLat,
      destinationLon,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      flexibleDates,
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
    if (!destination.trim()) {
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

    const payload = {
      destination: destination.trim(),
      origin: origin.trim() || undefined,
      destinationCountryCode: destinationCountryCode ?? undefined,
      originCountryCode: originCountryCode ?? undefined,
      destinationLat,
      destinationLon,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      flexibleDates,
      profileFields: Object.keys(profileFields).length > 0 ? profileFields : undefined,
    };

    try {
      if (isEditMode && _tripId) {
        const result = await updatePhase1Action(_tripId, payload);
        if (!result.success) {
          setErrorMessage(result.error);
          setIsSubmitting(false);
          return;
        }
        router.push(`/expedition/${_tripId}/phase-2`);
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
    } catch {
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

    if (currentStep === 1) {
      return undefined;
    }
    if (currentStep === 2) {
      return {
        onBack: () => goToStep(1),
        onPrimary: handleStep2Next,
        primaryLabel: tCommon("next"),
        ...dirtyProps,
      };
    }
    if (currentStep === 3) {
      return {
        onBack: () => goToStep(2),
        onPrimary: handleStep3Next,
        primaryLabel: tCommon("next"),
        ...dirtyProps,
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
      showFooter={currentStep > 1}
      footerProps={getFooterProps()}
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
            {errorMessage.startsWith("errors.")
              ? tErrors(errorMessage.replace("errors.", ""))
              : errorMessage}
          </div>
        )}

        {/* Step 1: About You */}
        {currentStep === 1 && (
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

                <AtlasButton onClick={handleStep1Next} size="lg" fullWidth>
                  {tCommon("next")}
                </AtlasButton>
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

                  <div className="grid grid-cols-2 gap-3">
                    <AtlasInput
                      id="profile-country-v2"
                      label={t("step1.country")}
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      maxLength={100}
                    />
                    <AtlasInput
                      id="profile-city-v2"
                      label={t("step1.city")}
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      maxLength={100}
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

                <AtlasButton onClick={handleStep1Next} size="lg" fullWidth>
                  {tCommon("next")}
                </AtlasButton>
              </div>
            )}
          </AtlasCard>
        )}

        {/* Step 2: Destination */}
        {currentStep === 2 && (
          <AtlasCard variant="base">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="step2-fields-grid">
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
        )}
      </div>
    </PhaseShell>
  );
}
