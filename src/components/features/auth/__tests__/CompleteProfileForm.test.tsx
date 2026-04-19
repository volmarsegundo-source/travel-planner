import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompleteProfileForm } from "../CompleteProfileForm";

const mockRouterPush = vi.hoisted(() => vi.fn());
const mockCompleteProfileAction = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/server/actions/profile.actions", () => ({
  completeProfileAction: mockCompleteProfileAction,
}));

describe("CompleteProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders DOB input with a11y label and submit button", () => {
    render(<CompleteProfileForm />);

    expect(screen.getByLabelText(/auth\.dateOfBirth/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "auth.completeProfile.submit" }),
    ).toBeInTheDocument();
  });

  it("keeps submit disabled until DOB is filled", () => {
    render(<CompleteProfileForm />);

    const submitBtn = screen.getByRole("button", {
      name: "auth.completeProfile.submit",
    });
    expect(submitBtn).toBeDisabled();

    const dobInput = screen.getByLabelText(/auth\.dateOfBirth/);
    fireEvent.change(dobInput, { target: { value: "1990-01-01" } });

    expect(submitBtn).not.toBeDisabled();
  });

  it("submits adult DOB and redirects to /expeditions by default", async () => {
    mockCompleteProfileAction.mockResolvedValueOnce({ success: true });

    render(<CompleteProfileForm />);

    const dobInput = screen.getByLabelText(/auth\.dateOfBirth/);
    fireEvent.change(dobInput, { target: { value: "1990-01-01" } });

    const form = dobInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCompleteProfileAction).toHaveBeenCalled();
    });
    const fd = mockCompleteProfileAction.mock.calls[0][0] as FormData;
    expect(fd.get("dateOfBirth")).toBe("1990-01-01");

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/expeditions");
    });
  });

  it("redirects to callbackUrl when provided and action succeeds", async () => {
    mockCompleteProfileAction.mockResolvedValueOnce({ success: true });

    render(<CompleteProfileForm callbackUrl="/expedition/abc-123" />);

    const dobInput = screen.getByLabelText(/auth\.dateOfBirth/);
    fireEvent.change(dobInput, { target: { value: "1990-01-01" } });

    const form = dobInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/expedition/abc-123");
    });
  });

  it("redirects to /auth/age-rejected when DOB is underage", async () => {
    mockCompleteProfileAction.mockResolvedValueOnce({
      success: false,
      error: "auth.errors.ageUnderage",
    });

    render(<CompleteProfileForm />);

    const dobInput = screen.getByLabelText(/auth\.dateOfBirth/);
    fireEvent.change(dobInput, { target: { value: "2020-01-01" } });

    const form = dobInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/auth/age-rejected");
    });
  });

  it("surfaces a validation error in an alert region", async () => {
    mockCompleteProfileAction.mockResolvedValueOnce({
      success: false,
      error: "auth.errors.dateInvalid",
    });

    render(<CompleteProfileForm />);

    const dobInput = screen.getByLabelText(/auth\.dateOfBirth/);
    fireEvent.change(dobInput, { target: { value: "1990-01-01" } });

    const form = dobInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("surfaces generic error when action throws", async () => {
    mockCompleteProfileAction.mockRejectedValueOnce(new Error("boom"));

    render(<CompleteProfileForm />);

    const dobInput = screen.getByLabelText(/auth\.dateOfBirth/);
    fireEvent.change(dobInput, { target: { value: "1990-01-01" } });

    const form = dobInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
