import { redirect } from "next/navigation";

/**
 * V1 route — redirects to the canonical /termos page.
 * Safe to delete once all external links are updated.
 */
export default function TermsRedirect() {
  redirect("/termos");
}
