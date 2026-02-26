"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const MESSAGE_ROTATION_MS = 4000;

export function LoadingPlanAnimation() {
  const t = useTranslations("itinerary.wizard");

  const messages = [
    t("loadingAnalyzing"),
    t("loadingBuilding"),
    t("loadingFinalizing"),
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, MESSAGE_ROTATION_MS);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={messages[messageIndex]}
    >
      {/* Spinner */}
      <div
        className="h-16 w-16 animate-spin rounded-full border-4 border-primary/30 border-t-primary"
        aria-hidden="true"
      />

      {/* Rotating message */}
      <p className="text-center text-lg font-medium text-foreground transition-opacity duration-500">
        {messages[messageIndex]}
      </p>

      {/* Subtle progress dots */}
      <div className="flex gap-2" aria-hidden="true">
        {messages.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${
              index === messageIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
