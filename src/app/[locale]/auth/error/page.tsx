import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

// Auth.js routes to this page on provider-level errors (e.g. OAuth failure).
// The `error` query param contains an Auth.js error code.
export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const { error } = await searchParams;
  const t = await getTranslations("auth");

  const errorMessageKeys: Record<string, string> = {
    Configuration: "errors.oauthConfiguration",
    AccessDenied: "errors.oauthAccessDenied",
    Verification: "errors.oauthVerification",
    OAuthSignin: "errors.oauthError",
    OAuthCallback: "errors.oauthError",
    OAuthCreateAccount: "errors.oauthError",
    OAuthAccountNotLinked: "errors.oauthAccountNotLinked",
    Default: "errors.oauthError",
  };

  const messageKey =
    (error && errorMessageKeys[error]) ?? errorMessageKeys["Default"];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive">
          {t("errors.oauthTitle")}
        </h1>
        <p className="mt-4 text-foreground">{t(messageKey)}</p>
        {process.env.NODE_ENV === "development" && error && (
          <p className="mt-2 text-sm text-muted-foreground">
            Error code: {error}
          </p>
        )}
        <Link
          href="/auth/login"
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          {t("errors.backToLogin")}
        </Link>
      </div>
    </main>
  );
}
