"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { AtlasButton } from "@/components/ui";

/** Simulated delay for newsletter subscription (no backend) */
const NEWSLETTER_SIMULATED_DELAY_MS = 500;

export function FooterV2() {
  const t = useTranslations("landingV2.footer");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleNewsletterSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim() || isSubmitting) return;

      setIsSubmitting(true);
      // Simulated delay — no backend integration for v1
      await new Promise((resolve) =>
        setTimeout(resolve, NEWSLETTER_SIMULATED_DELAY_MS),
      );
      setIsSubmitting(false);
      setShowSuccess(true);
      setEmail("");

      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    },
    [email, isSubmitting],
  );

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-atlas-primary w-full pt-16 pb-8 border-t border-atlas-primary-container">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 px-8 max-w-screen-2xl mx-auto">
        {/* Column 1: Logo + tagline */}
        <div className="space-y-6">
          <span className="text-xl font-black text-white font-atlas-headline">
            Atlas
          </span>
          <p className="text-atlas-on-primary-container text-sm leading-relaxed font-atlas-body">
            {t("tagline")}
          </p>
        </div>

        {/* Column 2: Explore links */}
        <div>
          <h4 className="text-white font-bold mb-6 font-atlas-headline">
            {t("explore")}
          </h4>
          <ul className="space-y-4">
            <li>
              <a
                href="/como-funciona"
                className="text-atlas-on-primary-container hover:text-white transition-colors underline-offset-4 hover:underline font-atlas-body"
              >
                {t("destinationGuides")}
              </a>
            </li>
            <li>
              <a
                href="/como-funciona"
                className="text-atlas-on-primary-container hover:text-white transition-colors underline-offset-4 hover:underline font-atlas-body"
              >
                {t("travelInsurance")}
              </a>
            </li>
            <li>
              <a
                href="/como-funciona"
                className="text-atlas-on-primary-container hover:text-white transition-colors underline-offset-4 hover:underline font-atlas-body"
              >
                {t("blog")}
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Company links */}
        <div>
          <h4 className="text-white font-bold mb-6 font-atlas-headline">
            {t("company")}
          </h4>
          <ul className="space-y-4">
            <li>
              <a
                href="/sobre"
                className="text-atlas-on-primary-container hover:text-white transition-colors underline-offset-4 hover:underline font-atlas-body"
              >
                {t("about")}
              </a>
            </li>
            <li>
              <a
                href="/contato"
                className="text-atlas-on-primary-container hover:text-white transition-colors underline-offset-4 hover:underline font-atlas-body"
              >
                {t("contact")}
              </a>
            </li>
            <li>
              <a
                href="/privacidade"
                className="text-atlas-on-primary-container hover:text-white transition-colors underline-offset-4 hover:underline font-atlas-body"
              >
                {t("privacy")}
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4: Newsletter */}
        <div>
          <h4 className="text-white font-bold mb-6 font-atlas-headline">
            {t("newsletter")}
          </h4>
          <p className="text-atlas-on-primary-container text-sm mb-4 font-atlas-body">
            {t("newsletterDescription")}
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
            <label htmlFor="footer-newsletter-email" className="sr-only">
              {t("emailLabel")}
            </label>
            <input
              id="footer-newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-none rounded-lg text-white px-4 py-2 w-full focus:ring-2 focus:ring-atlas-secondary-container placeholder:text-white/50 font-atlas-body"
              placeholder={t("emailPlaceholder")}
              disabled={isSubmitting}
            />
            <AtlasButton
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
              aria-label={t("send")}
            >
              <Send className="size-4" aria-hidden="true" />
            </AtlasButton>
          </form>

          {/* Success message */}
          {showSuccess && (
            <p
              className="text-atlas-secondary-container text-sm mt-2 font-atlas-body"
              role="status"
              aria-live="polite"
            >
              {t("newsletterSuccess")}
            </p>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-screen-2xl mx-auto px-8 mt-16 pt-8 border-t border-atlas-primary-container text-center space-y-2">
        <p className="text-atlas-on-primary-container/60 text-sm font-atlas-body">
          &copy; {currentYear} {t("copyright")}
        </p>
        <p className="text-atlas-on-primary-container/40 text-xs font-atlas-body">
          {t("lgpd")}
        </p>
      </div>
    </footer>
  );
}
