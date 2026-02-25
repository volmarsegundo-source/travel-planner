import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const t = await getTranslations("auth.verifyEmail");
  const { email, token } = await searchParams;

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
          <Mail className="h-6 w-6 text-orange-600" aria-hidden="true" />
        </div>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-gray-600">
          {t("description", { email: email ?? "seu e-mail" })}
        </p>
        {token && (
          <p className="text-xs text-gray-400">Token: {token.slice(0, 8)}…</p>
        )}
        <form action="/api/auth/resend-verification" method="POST">
          <input type="hidden" name="email" value={email ?? ""} />
          <Button type="submit" variant="outline" className="w-full">
            {t("resend")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
