import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
    expiresIn: 60 * 60 * 24, // 24 hours in seconds
    autoSignInAfterVerification: true,
    callbackURL: "/dashboard",
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh session cookie if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minute client-side cookie cache
    },
  },
  user: {
    additionalFields: {
      businessName: {
        type: "string",
        required: true,
        input: true,
      },
      country: {
        type: "string",
        required: false,
        defaultValue: "AR",
        input: true,
      },
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
