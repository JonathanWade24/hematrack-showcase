// import { PrismaAdapter } from "@next-auth/prisma-adapter" // Remove Prisma Adapter
import NextAuth from "next-auth" // Simplified import
// Removed `type User` import to rely on global augmentation from next-auth.d.ts
// Removed `NextAuthOptions` import as type will be inferred
import type { JWT } from "next-auth/jwt" // Import JWT type
import type { Session } from "next-auth" // Import Session type
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
// import { prisma } from "@/lib/prisma" // Remove Prisma client

// Import Drizzle Adapter, db instance, and schema tables
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db" // Re-confirming export exists
import { UserInApp, AccountInApp, SessionInApp, VerificationTokenInApp } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// Define the auth options object without explicit NextAuthOptions type annotation
export const authOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: UserInApp,
    accountsTable: AccountInApp,
    sessionsTable: SessionInApp,
    verificationTokensTable: VerificationTokenInApp, 
  }),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("[Authorize] Attempting login for:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log("[Authorize] Missing credentials.");
          throw new Error("CredentialsSignin");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.UserInApp.findFirst({
          where: eq(UserInApp.email, email)
        });

        if (!user) {
          console.log(`[Authorize] User not found for email: ${email}`);
          throw new Error("CredentialsSignin");
        }
        console.log(`[Authorize] User found (from DB):`, { id: user.id, email: user.email, name: user.name, role: user.role });

        if (!user.password) {
          console.log(`[Authorize] User ${user.email} has no password set.`);
          throw new Error("CredentialsSignin");
        }
        
        const userPassword = user.password as string;
        const isValid = await bcrypt.compare(password, userPassword);
        console.log(`[Authorize] Password validation result for ${user.email}:`, isValid);

        if (!isValid) {
          console.log(`[Authorize] Invalid password for user: ${user.email}`);
          throw new Error("CredentialsSignin");
        }

        const userPayloadForToken = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
        console.log("[Authorize] Login successful. Returning user payload for token:", userPayloadForToken);
        return userPayloadForToken as import("next-auth").User;
      }
    })
  ],
  session: {
    strategy: "jwt" as const
  },
  pages: {
    signIn: "/login",
    error: "/auth/error"
  },
  callbacks: {
    async jwt({ token, user, account, profile, isNewUser }: { token: JWT; user?: import("next-auth").User; account?: any; profile?: any; isNewUser?: boolean }) {
      console.log("[JWT Callback] Invoked.");
      if (user) {
        console.log("[JWT Callback] User object present:", user);
        token.id = user.id;
        token.role = (user as any).role;
        token.name = user.name;
        token.email = user.email;
      } else {
        console.log("[JWT Callback] User object NOT present.");
      }
      console.log("[JWT Callback] Returning token:", token);
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      console.log("[Session Callback] Invoked.");
      console.log("[Session Callback] Received token:", token);
      console.log("[Session Callback] Initial session object:", JSON.parse(JSON.stringify(session)));
      
      session.user = {
        id: token.id as string,
        name: token.name,      
        email: token.email,    
        role: token.role as string,
      };
      console.log("[Session Callback] Modified session object (with user from token):", JSON.parse(JSON.stringify(session)));
      return session;
    }
  }
};

// Initialize NextAuth and export handlers directly
// Use a temporary variable to avoid potential TS errors on direct destructure/export
const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
export const { GET, POST } = handlers;

// Export auth for use in Server Components and Server Actions
export { auth, signIn, signOut }; 