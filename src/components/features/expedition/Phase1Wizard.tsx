"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhaseProgressBar } from "./PhaseProgressBar";
import { PointsAnimation } from "./PointsAnimation";
import { PhaseTransition } from "./PhaseTransition";
import { DestinationAutocomplete } from "./DestinationAutocomplete";
import { createExpeditionAction } from "@/server/actions/expedition.actions";
import { classifyTrip, type TripType } from "@/lib/travel/trip-classifier";

const TOTAL_STEPS = 4;

const TRIP_TYPE_BADGES: Record<TripType, { emoji: string; key: string }> = {
  domestic: { emoji: "\u{1F3E0}", key: "domestic" },
  mercosul: { emoji: "\u{1F33F}", key: "mercosul" },
  international: { emoji: "\u{1F30D}", key: "international" },
  schengen: { emoji: "\u{1F1EA}\u{1F1FA}", key: "schengen" },
};

interface Phase1WizardProps {
  passportExpiry?: string;
  userCountry?: string;
}

export function Phase1Wizard({ passportExpiry, userCountry }: Phase1WizardProps) {
  const t = useTranslations("expedition.phase1");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [animationData, setAnimationData] = useState<{
    points: number;
    badge?: string | null;
  }>({ points: 0 });

  // Form data
  const [destination, setDestination] = useState("");
  const [destinationCountry, setDestinationCountry] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);

  // Profile fields (Step 3: About You)
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");

  const stepContentRef = useRef<HTMLDivElement>(null);
  const tripIdRef = useRef<string>("");

  // Trip type classification
  const tripType = useMemo(() => {
    if (userCountry && destinationCountry) {
      return classifyTrip(userCountry, destinationCountry);
    }
    return null;
  }, [userCountry, destinationCountry]);

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
    requestAnimationFrame(() => {
      const firstInput = stepContentRef.current?.querySelector<HTMLElement>(
        "input, button[type='submit']"
      );
      firstInput?.focus();
    });
  }

  function handleStep1Next() {
    // Step 1: About You — no validation, all fields optional
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

    try {
      const result = await createExpeditionAction({
        destination: destination.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        flexibleDates,
        profileFields: Object.keys(profileFields).length > 0 ? profileFields : undefined,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setIsSubmitting(false);
        return;
      }

      tripIdRef.current = result.data!.tripId;
      setAnimationData({
        points: result.data!.phaseResult.pointsEarned,
        badge: result.data!.phaseResult.badgeAwarded,
      });
      setShowAnimation(true);
    } catch {
      setErrorMessage("errors.generic");
      setIsSubmitting(false);
    }
  }

  function handleAnimationDismiss() {
    setShowAnimation(false);
    setShowTransition(true);
  }

  function handleTransitionContinue() {
    setShowTransition(false);
    router.push(`/expedition/${tripIdRef.current}/phase-2`);
  }

  function handleDestinationSelect(result: { displayName: string; country: string | null }) {
    setDestinationCountry(result.country);
  }

  if (showAnimation) {
    return (
      <PointsAnimation
        points={animationData.points}
        badge={animationData.badge as "first_step" | null}
        onDismiss={handleAnimationDismiss}
      />
    );
  }

  if (showTransition) {
    return (
      <PhaseTransition
        fromPhase={1}
        toPhase={2}
        onContinue={handleTransitionContinue}
      />
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <PhaseProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        <div className="mt-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div
          ref={stepContentRef}
          key={currentStep}
          className="mt-8 flex flex-col gap-6"
          aria-live="polite"
          aria-atomic="true"
        >
          {errorMessage && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30"
            >
              {errorMessage}
            </div>
          )}

          {/* Step 1: About You */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step1.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("step1.subtitle")}</p>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profile-birthdate">{t("step1.birthDate")}</Label>
                  <Input
                    id="profile-birthdate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
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
            </div>
          )}

          {/* Step 2: Destination */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-4">
              <Label htmlFor="destination">{t("step2.title")}</Label>
              <DestinationAutocomplete
                value={destination}
                onChange={setDestination}
                onSelect={handleDestinationSelect}
                placeholder={t("step2.placeholder")}
              />
              {tripType && (
                <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
                  <span>{TRIP_TYPE_BADGES[tripType].emoji}</span>
                  <span>{t(`tripType.${TRIP_TYPE_BADGES[tripType].key}`)}</span>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep(1)} className="flex-1">
                  {"\u2190"}
                </Button>
                <Button onClick={handleStep2Next} className="flex-[3]">
                  {tCommon("next")}
                </Button>
              </div>
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
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep(2)} className="flex-1">
                  {"\u2190"}
                </Button>
                <Button onClick={handleStep3Next} className="flex-[3]">
                  {tCommon("next")}
                </Button>
              </div>
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
                {(birthDate || phone || country || city || bio) && (
                  <>
                    <h3 className="mb-3 mt-4 text-sm font-medium text-muted-foreground">
                      {t("step4.profileSummary")}
                    </h3>
                    <dl className="space-y-2 text-sm">
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
                          <dt className="text-muted-foreground">{t("step4.location")}</dt>
                          <dd className="font-medium">
                            {[city, country].filter(Boolean).join(", ")}
                          </dd>
                        </div>
                      )}
                      {bio && (
                        <div className="flex justify-between gap-4">
                          <dt className="shrink-0 text-muted-foreground">{t("step4.bio")}</dt>
                          <dd className="font-medium text-right">
                            {bio.length > 100 ? `${bio.slice(0, 100)}...` : bio}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep(3)} className="flex-1">
                  {"\u2190"}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-[3]"
                  size="lg"
                >
                  {isSubmitting ? tCommon("loading") : t("step4.cta")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
