/**
 * Full Auth.js v5 configuration — Node.js runtime only.
 *
 * Spreads the Edge-safe base config from auth.config.ts and adds
 * Node.js-only dependencies: PrismaAdapter (db sessions/users) and
 * bcrypt (password verification in Credentials authorize).
 *
 * IMPORTANT: Do NOT import this file from middleware.ts — import auth.config.ts
 * instead to keep the Edge bundle free of Prisma and ioredis.
 */
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { UserSignInSchema } from "@/lib/validations/user.schema";
import authConfig from "./auth.config";

// Build OAuth providers list conditionally based on env var presence.
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

export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  // JWT strategy: session validated via signed JWT cookie — no DB round-trip
  // in middleware, while user/account data is still persisted via PrismaAdapter.
  session: { strategy: "jwt" },
  events: {
    // SPEC-AUTH-AGE-002: OAuth sign-in fires createUser the first time. Mark
    // profile as complete only if UserProfile.birthDate already exists.
    async createUser({ user }) {
      // No-op — the signIn callback below will check profile state each time.
      void user;
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn(params) {
      // SPEC-AUTH-AGE-002 v2.0.1 (BUG-C-F3 Iter 7.1): prior versions of
      // this callback mutated `params.user.profileComplete` so the JWT
      // callback could pick it up. That mutation broke `adapter.createUser`
      // on fresh OAuth signups because `@auth/prisma-adapter` spreads the
      // user into `db.user.create({ data: user })`, and `User` has no
      // `profileComplete` column.
      //
      // Post-v2.0.0 the JWT claim is a UX hint only — the Node `(app)`
      // layout derives truth from `UserProfile.birthDate` in the DB. So
      // the mutation was dead code and is removed. The claim defaults to
      // `false` in `auth.config.ts:78-79` (`?? false`), which is safe:
      // layout still redirects to /auth/complete-profile when birthDate
      // is null, and `patchSessionToken({ profileComplete: true })` in
      // `completeProfileAction` flips the hint after a successful DOB
      // submission.
      //
      // Delegate to the Edge-safe base signIn (which handles the
      // credentials-path `!!user?.id` check) and return its result.
      const base = authConfig.callbacks?.signIn;
      return base ? await base(params) : true;
    },
  },
  providers: [
    ...oauthProviders,
    Credentials({
      async authorize(credentials) {
        try {
          const parsed = UserSignInSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const user = await db.user.findUnique({
            where: { email: parsed.data.email, deletedAt: null },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              passwordHash: true,
              role: true,
            },
          });

          if (!user) return null;
          if (!user.passwordHash) return null;

          // TODO(T-003): restore emailVerified guard when email verification ships
          // if (!user.emailVerified) return null;

          const isValid = await bcrypt.compare(
            parsed.data.password,
            user.passwordHash
          );
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
});
