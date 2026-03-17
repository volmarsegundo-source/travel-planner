"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhaseShell } from "./PhaseShell";
import { DestinationAutocomplete } from "./DestinationAutocomplete";
import {
  createExpeditionAction,
  updatePhase1Action,
} from "@/server/actions/expedition.actions";
import { classifyTrip, type TripType } from "@/lib/travel/trip-classifier";
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

interface Phase1WizardProps {
  passportExpiry?: string;
  userCountry?: string;
  userProfile?: UserProfileData;
  userName?: string;
  /** Previously saved trip data for revisit pre-population */
  savedDestination?: string;
  savedOrigin?: string;
  savedStartDate?: string;
  savedEndDate?: string;
  /** Trip ID -- present when revisiting an existing expedition */
  tripId?: string;
  /** Access mode from navigation engine */
  accessMode?: PhaseAccessMode;
  /** Trip's current phase from DB */
  tripCurrentPhase?: number;
  /** Completed phase numbers from DB */
  completedPhases?: number[];
}

export function Phase1Wizard({
  passportExpiry,
  // userCountry prop kept for backward compat but no longer used for classification
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
}: Phase1WizardProps) {
  const t = useTranslations("expedition.phase1");
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

  // Profile persistence: show summary card when profile is complete
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const profileComplete = useMemo(
    () => isProfileComplete(userProfile),
    [userProfile]
  );

  // Form data -- pre-populate from saved trip data when revisiting
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
  // Track whether destination/origin were selected via autocomplete
  const [destinationSelectedRef] = useState<{ value: string | null }>({ value: null });
  const [originSelectedRef] = useState<{ value: string | null }>({ value: null });
  const [startDate, setStartDate] = useState(savedStartDate ?? "");
  const [endDate, setEndDate] = useState(savedEndDate ?? "");
  const [flexibleDates, setFlexibleDates] = useState(false);

  // Profile fields (Step 1: About You) -- pre-populated from saved profile
  const [birthDate, setBirthDate] = useState(userProfile?.birthDate ?? "");
  const [phone, setPhone] = useState(userProfile?.phone ?? "");
  const [country, setCountry] = useState(userProfile?.country ?? "");
  const [city, setCity] = useState(userProfile?.city ?? "");
  const [bio, setBio] = useState(userProfile?.bio ?? "");
  const [name, setName] = useState(userName ?? "");

  const stepContentRef = useRef<HTMLDivElement>(null);
  const tripIdRef = useRef<string>(_tripId ?? "");
  const locale = useLocale();

  // Auto-resolve origin country code when pre-populated from profile
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
      // Silently degrade -- classification will default to null
    }
  }, [locale]);

  useEffect(() => {
    // If origin is pre-populated (from profile) but no country code, auto-resolve
    if (origin && !originCountryCode && !savedOrigin) {
      resolveCountryCode(origin, setOriginCountryCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trip type classification -- uses ISO country codes for locale-independent matching
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
    // Warning: passport expires within 6 months of trip end
    const sixMonthsAfterEnd = new Date(tripEndDate);
    sixMonthsAfterEnd.setMonth(sixMonthsAfterEnd.getMonth() + 6);
    return passportDate < sixMonthsAfterEnd;
  }, [passportExpiry, endDate]);

  function goToStep(step: number) {
    setCurrentStep(step);
    setErrorMessage(null);
    // Persist step in URL for language switch preservation
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
    // Dates are mandatory unless flexible dates is checked
    if (!flexibleDates && (!startDate || !endDate)) {
      setErrorMessage(t("errors.datesRequired"));
      return;
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setErrorMessage(t("errors.endDateBeforeStart"));
      return;
    }
    goToStep(4);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMessage(null);

    // Build profile fields (only non-empty)
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
        // Revisit: update existing trip data without re-creating expedition
        const result = await updatePhase1Action(_tripId, payload);

        if (!result.success) {
          setErrorMessage(result.error);
          setIsSubmitting(false);
          return;
        }

        // Navigate to phase-2 after saving changes
        router.push(`/expedition/${_tripId}/phase-2`);
      } else {
        // First visit: create new expedition
        const result = await createExpeditionAction(payload);

        if (!result.success) {
          setErrorMessage(result.error);
          setIsSubmitting(false);
          return;
        }

        tripIdRef.current = result.data!.tripId;
        // Navigate directly to phase-2
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

  // Clear stale country codes when user edits text after autocomplete selection
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

  // Determine the footer action for step 4 based on the current step
  const getFooterProps = () => {
    if (currentStep === 1) {
      return undefined; // Step 1 uses inline buttons
    }
    if (currentStep === 2) {
      return {
        onBack: () => goToStep(1),
        onPrimary: handleStep2Next,
        primaryLabel: tCommon("next"),
      };
    }
    if (currentStep === 3) {
      return {
        onBack: () => goToStep(2),
        onPrimary: handleStep3Next,
        primaryLabel: tCommon("next"),
      };
    }
    // Step 4: confirmation
    return {
      onBack: () => goToStep(3),
      onPrimary: handleSubmit,
      primaryLabel: isEditMode
        ? tCommon("save")
        : tExpedition("cta.advance"),
      isLoading: isSubmitting,
      isDisabled: isSubmitting,
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
      >
        {errorMessage && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30"
          >
            {errorMessage.startsWith("errors.")
              ? tErrors(errorMessage.replace("errors.", ""))
              : errorMessage}
          </div>
        )}

        {/* Step 1: About You */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{t("step1.title")}</h2>

            {/* Show summary card when profile is complete and user is not editing */}
            {profileComplete && !isEditingProfile ? (
              <>
                <div className="rounded-xl border border-border bg-muted p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {t("step1.savedProfileTitle")}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingProfile(true)}
                      data-testid="edit-profile-btn"
                    >
                      {t("step1.editProfile")}
                    </Button>
                  </div>
                  <dl className="space-y-2 text-sm">
                    {name && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("step1.name")}</dt>
                        <dd className="font-medium">{name}</dd>
                      </div>
                    )}
                    {birthDate && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("step1.birthDate")}</dt>
                        <dd className="font-medium">{birthDate}</dd>
                      </div>
                    )}
                    {phone && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("step1.phone")}</dt>
                        <dd className="font-medium">{phone}</dd>
                      </div>
                    )}
                    {(country || city) && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("step1.country")}</dt>
                        <dd className="font-medium">
                          {[city, country].filter(Boolean).join(", ")}
                        </dd>
                      </div>
                    )}
                    {bio && (
                      <div className="flex justify-between gap-4">
                        <dt className="shrink-0 text-muted-foreground">{t("step1.bio")}</dt>
                        <dd className="font-medium text-right">
                          {bio.length > 80 ? `${bio.slice(0, 80)}...` : bio}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <Button onClick={handleStep1Next} size="lg" className="w-full">
                  {tCommon("next")}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t("step1.subtitle")}</p>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="profile-name">
                      {t("step1.name")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      placeholder={t("step1.namePlaceholder")}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="profile-birthdate">
                      {t("step1.birthDate")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="profile-birthdate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="profile-phone">{t("step1.phone")}</Label>
                    <Input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={20}
                      placeholder={t("step1.phonePlaceholder")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="profile-country">{t("step1.country")}</Label>
                      <Input
                        id="profile-country"
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="profile-city">{t("step1.city")}</Label>
                      <Input
                        id="profile-city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="profile-bio">{t("step1.bio")}</Label>
                    <textarea
                      id="profile-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background text-foreground px-4 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
                      placeholder={t("step1.bioPlaceholder")}
                    />
                    <span className="text-xs text-muted-foreground/70">{bio.length}/500</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground/70">{t("step1.optional")}</p>

                <Button onClick={handleStep1Next} size="lg" className="w-full">
                  {tCommon("next")}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step 2: Destination */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-4">
            <Label htmlFor="destination">{t("step2.title")}</Label>
            <DestinationAutocomplete
              value={destination}
              onChange={handleDestinationChange}
              onSelect={handleDestinationSelect}
              placeholder={t("step2.placeholder")}
            />
            <div className="mt-4">
              <Label htmlFor="origin">{t("step2.origin")}</Label>
              <DestinationAutocomplete
                value={origin}
                onChange={handleOriginChange}
                onSelect={handleOriginSelect}
                placeholder={t("step2.originPlaceholder")}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("step2.originHint")}</p>
            </div>
            {tripType && (
              <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
                <span>{TRIP_TYPE_BADGES[tripType].emoji}</span>
                <span>{t(`tripType.${TRIP_TYPE_BADGES[tripType].key}`)}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Dates */}
        {currentStep === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{t("step3.title")}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expedition-start-date">{t("step3.startDate")}</Label>
                <Input
                  id="expedition-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expedition-end-date">{t("step3.endDate")}</Label>
                <Input
                  id="expedition-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            {showPassportWarning && (
              <div className="flex items-start gap-2 rounded-lg bg-atlas-gold/10 border border-atlas-gold/30 px-4 py-3 text-sm text-atlas-gold">
                <span className="mt-0.5">{"\u26A0\uFE0F"}</span>
                <span>{t("passportExpiryWarning")}</span>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={flexibleDates}
                onChange={(e) => setFlexibleDates(e.target.checked)}
                className="rounded border-border"
              />
              {t("step3.flexibleDates")}
            </label>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{t("step4.title")}</h2>
            <div className="rounded-xl border border-border bg-muted p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {t("step4.summary")}
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step4.destination")}</dt>
                  <dd className="font-medium">{destination}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step4.origin")}</dt>
                  <dd className={origin ? "font-medium" : "text-muted-foreground/60 italic"}>
                    {origin || tCommon("notProvided")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step4.dates")}</dt>
                  <dd className="font-medium">
                    {startDate && endDate
                      ? `${startDate} \u2192 ${endDate}`
                      : flexibleDates
                        ? t("step4.yes")
                        : "\u2014"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step4.flexibleDates")}</dt>
                  <dd className="font-medium">
                    {flexibleDates ? t("step4.yes") : t("step4.no")}
                  </dd>
                </div>
              </dl>
              <h3 className="mb-3 mt-4 text-sm font-medium text-muted-foreground">
                {t("step4.profileSummary")}
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step1.name")}</dt>
                  <dd className={name ? "font-medium" : "text-muted-foreground/60 italic"}>
                    {name || tCommon("notProvided")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step1.birthDate")}</dt>
                  <dd className={birthDate ? "font-medium" : "text-muted-foreground/60 italic"}>
                    {birthDate || tCommon("notProvided")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step1.phone")}</dt>
                  <dd className={phone ? "font-medium" : "text-muted-foreground/60 italic"}>
                    {phone || tCommon("notProvided")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step4.location")}</dt>
                  <dd className={(country || city) ? "font-medium" : "text-muted-foreground/60 italic"}>
                    {(country || city) ? [city, country].filter(Boolean).join(", ") : tCommon("notProvided")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">{t("step4.bio")}</dt>
                  <dd className={bio ? "font-medium text-right" : "text-muted-foreground/60 italic"}>
                    {bio ? (bio.length > 100 ? `${bio.slice(0, 100)}...` : bio) : tCommon("notProvided")}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </PhaseShell>
  );
}
