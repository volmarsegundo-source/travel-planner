import { verifyEmailAction } from "@/server/actions/auth.actions";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

// Server Component — processes the token from the query string on load.
export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;

  if (!token) {
    // Render the "waiting for verification" state when no token is present.
    return <VerifyEmailPending />;
  }

  const result = await verifyEmailAction(token);

  if (result.success) {
    redirect("/auth/login?verified=true");
  }

  return <VerifyEmailError errorKey={result.error} />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerifyEmailPending() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="mt-4 text-gray-600">
          Check your inbox for a verification link.
        </p>
      </div>
    </main>
  );
}

function VerifyEmailError({ errorKey }: { errorKey: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-600">Verification failed</h1>
        <p className="mt-4 text-gray-600">
          This link may have expired. Please request a new verification email.
        </p>
        {/* errorKey is an i18n key — displayed for debugging in dev only */}
        {process.env.NODE_ENV === "development" && (
          <p className="mt-2 text-sm text-gray-400">{errorKey}</p>
        )}
        <a
          href="/auth/login"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Back to login
        </a>
      </div>
    </main>
  );
}
