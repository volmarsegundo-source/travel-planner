import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Auth layout — minimal wrapper for login/register pages.
 *
 * Sprint 40 V2: LoginFormV2 and RegisterForm are full-page components
 * (split-screen 60/40) that handle their own layout including nav,
 * branding, and footer. No V1 wrapper (Header, Footer, card container)
 * should be applied here.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return <>{children}</>;
}
