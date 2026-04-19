/**
 * Edge-compatible Auth.js v5 configuration.
 *
 * This file must NOT import any Node.js-only modules (Prisma, ioredis, bcrypt,
 * server-only, etc.) because it is imported by src/middleware.ts which runs in
 * the Next.js Edge runtime.
 *
 * Node.js-only config (PrismaAdapter, database session, Credentials authorize)
 * lives in src/lib/auth.ts and is spread on top of this base config.
 */
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

// Build OAuth providers list conditionally based on env var presence.
// This prevents Auth.js from registering a provider that has no credentials,
// which would cause runtime errors on OAuth callback.
const oauthProviders: NextAuthConfig["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauthProviders.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.APPLE_ID && process.env.APPLE_SECRET) {
  oauthProviders.push(
    Apple({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET,
    })
  );
}

export default {
  providers: [
    ...oauthProviders,
    // authorize() is intentionally omitted here — defined in auth.ts (Node.js only).
    Credentials({}),
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    verifyRequest: "/auth/verify-email",
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // With PrismaAdapter + JWT + Credentials, Auth.js v5 requires an explicit
      // signIn callback to prevent the adapter from attempting a DB session write.
      if (account?.provider === "credentials") {
        return !!user?.id;
      }
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        // Carry role into JWT for Edge middleware admin guard.
        // The role is set from the User model during sign-in.
        token.role = (user as { role?: string }).role ?? "user";
        // SPEC-AUTH-AGE-002: profileComplete is set by the Node.js signIn
        // callback in auth.ts (which has DB access). Default to false here
        // so new OAuth users are funneled to /auth/complete-profile.
        token.profileComplete =
          (user as { profileComplete?: boolean }).profileComplete ?? false;
      }
      // When unstable_update({ user: { name } }) is called from a server action,
      // the JWT callback re-fires with trigger="update" and the new data in session.
      if (trigger === "update" && session?.user?.name !== undefined) {
        token.name = session.user.name;
      }
      if (trigger === "update" && session?.user?.role !== undefined) {
        token.role = session.user.role;
      }
      if (trigger === "update" && session?.user?.profileComplete !== undefined) {
        token.profileComplete = session.user.profileComplete;
      }
      return token;
    },
    session({ session, token }) {
      // With JWT strategy, user id comes from token.sub (set by NextAuth from user.id).
      if (session.user && token?.sub) {
        session.user.id = token.sub;
      }
      // Keep name in sync with the JWT token (refreshed via unstable_update)
      if (session.user && token?.name) {
        session.user.name = token.name as string;
      }
      // Expose role on session for server components and client
      if (session.user && token?.role) {
        (session.user as { role?: string }).role = token.role as string;
      }
      // SPEC-AUTH-AGE-002: expose profileComplete for middleware + app shell.
      if (session.user && typeof token?.profileComplete === "boolean") {
        (session.user as { profileComplete?: boolean }).profileComplete =
          token.profileComplete;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
