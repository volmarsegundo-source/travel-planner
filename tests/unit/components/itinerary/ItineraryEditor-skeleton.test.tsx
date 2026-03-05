import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockAddDay, mockReorder } = vi.hoisted(() => ({
  mockAddDay: vi.fn(),
  mockReorder: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    return (key: string) => `${namespace}.${key}`;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/server/actions/itinerary.actions", () => ({
  addItineraryDayAction: mockAddDay,
  reorderActivitiesAction: mockReorder,
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSensor: () => ({}),
  useSensors: () => [],
  MouseSensor: {},
  TouchSensor: {},
  closestCenter: {},
}));

vi.mock("@dnd-kit/sortable", () => ({
  arrayMove: (arr: unknown[]) => arr,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

vi.mock("@/components/features/itinerary/ItineraryDayCard", () => ({
  ItineraryDayCard: () => <div data-testid="day-card" />,
}));

import { ItineraryEditor } from "@/components/features/itinerary/ItineraryEditor";

describe("ItineraryEditor skeleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows addingDay text and skeleton when adding day", async () => {
    // Make addDay hang
    mockAddDay.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    render(
      <ItineraryEditor initialDays={[]} tripId="trip-1" locale="en" />
    );

    // Click the add day button
    const addButton = screen.getByRole("button");
    await user.click(addButton);

    // Should show loading state
    expect(screen.getByText("itinerary.addingDay")).toBeInTheDocument();
    // Should show skeleton with role=status
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows add day text when not pending", () => {
    render(
      <ItineraryEditor initialDays={[]} tripId="trip-1" locale="en" />
    );

    // Should show normal add day text (contains "+" prefix)
    expect(screen.getByRole("button")).toHaveTextContent("itinerary.addDay");
  });
});
