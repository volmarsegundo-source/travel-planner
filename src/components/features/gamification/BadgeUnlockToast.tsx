"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BadgeUnlockToastProps {
  badgeName: string;
  badgeDescription: string;
  badgeIcon: string;
  onClose: () => void;
  autoCloseMs?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BadgeUnlockToast({
  badgeName,
  badgeDescription,
  badgeIcon,
  onClose,
  autoCloseMs = 5000,
}: BadgeUnlockToastProps) {
  const t = useTranslations("gamification.badgeShowcase");
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    const timeout = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
    return () => clearTimeout(timeout);
  }, [onClose]);

  useEffect(() => {
    // Enter animation
    const enterTimeout = setTimeout(() => setIsVisible(true), 50);

    // Auto-close
    const closeTimeout = setTimeout(handleClose, autoCloseMs);

    return () => {
      clearTimeout(enterTimeout);
      clearTimeout(closeTimeout);
    };
  }, [autoCloseMs, handleClose]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-atlas-gold/30 bg-background shadow-xl transition-all duration-300 ${
        isVisible && !isExiting
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0"
      }`}
    >
      {/* Confetti overlay — CSS only, respects reduced motion */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
        aria-hidden="true"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="confetti-particle absolute"
            style={{
              left: `${(i * 8.3) % 100}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex items-start gap-3 p-4">
        <span className="text-3xl" aria-hidden="true">
          {badgeIcon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-atlas-gold">
            {t("newBadge")}
          </p>
          <p className="text-sm font-semibold">{badgeName}</p>
          <p className="text-xs text-muted-foreground">{badgeDescription}</p>
        </div>
        <button
          onClick={handleClose}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("closeToast")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Inline CSS for confetti animation — uses regular style tag (no styled-jsx) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
        }
        .confetti-particle {
          width: 6px; height: 6px;
          background: var(--atlas-gold, #f59e0b);
          border-radius: 50%;
          animation: confetti-fall 1.5s ease-out forwards;
        }
        .confetti-particle:nth-child(even) {
          background: #fbbf24; width: 4px; height: 8px; border-radius: 2px;
        }
        .confetti-particle:nth-child(3n) { background: #d97706; }
      ` }} />
    </div>
  );
}
