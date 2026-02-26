import Link from "next/link";

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

// Auth.js routes to this page on provider-level errors (e.g. OAuth failure).
// The `error` query param contains an Auth.js error code.
export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const { error } = await searchParams;

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification link has expired or has already been used.",
    Default: "An unexpected authentication error occurred.",
  };

  const message =
    (error && errorMessages[error]) ?? errorMessages["Default"];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <h1 className="text-2xl font-bold text-red-700">Authentication Error</h1>
        <p className="mt-4 text-gray-700">{message}</p>
        {process.env.NODE_ENV === "development" && error && (
          <p className="mt-2 text-sm text-gray-400">Error code: {error}</p>
        )}
        <Link
          href="/auth/login"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}
