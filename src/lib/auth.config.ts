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
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
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
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      // With JWT strategy, user id comes from token.sub (set by NextAuth from user.id).
      if (session.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
