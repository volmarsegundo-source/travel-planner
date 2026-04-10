import { redirect } from "next/navigation";

/**
 * Admin root (`/admin`) — redirects to the dashboard landing page.
 *
 * Previously, hitting `/admin` directly returned 404 because only
 * subdirectories (`dashboard`, `analytics`, `feedback`, etc.) had `page.tsx`
 * files. The layout's auth/role guard already runs for this redirect, so
 * non-admins are still bounced to `/expeditions` before reaching the target.
 */
export default function AdminRootPage() {
  redirect("/admin/dashboard");
}
