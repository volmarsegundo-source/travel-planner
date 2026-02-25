import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db/client";
import { redis } from "@/server/cache/client";
import { verifyPassword } from "@/server/services/auth.service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/auth/login",
    verifyRequest: "/auth/verify-email",
    error: "/auth/login",
  },
  providers: [
    {
      id: "google",
      name: "Google",
      type: "oauth",
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: new Date(),
        };
      },
    },
    {
      id: "credentials",
      name: "Credentials",
      type: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
            locale: true,
          },
        });

        if (!user || !user.emailVerified) return null;

        // Check password stored in Redis (MVP approach — add `password` column to User for production)
        const storedHash = await redis.get(`pwd:${email}`);
        if (!storedHash) return null;

        const valid = await verifyPassword(password, storedHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          locale: user.locale,
        };
      },
    },
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
