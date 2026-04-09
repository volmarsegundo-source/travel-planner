"use client";

import dynamic from "next/dynamic";

const FeedbackWidget = dynamic(
  () => import("./FeedbackWidget").then((m) => m.FeedbackWidget),
  { ssr: false }
);

export function FeedbackWidgetLoader() {
  return <FeedbackWidget />;
}
