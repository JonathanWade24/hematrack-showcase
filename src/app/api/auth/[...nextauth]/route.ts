import { PrismaAdapter } from "@next-auth/prisma-adapter"
import NextAuth, { User, type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

// Define the auth options object
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
          throw new Error("CredentialsSignin")
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          console.log(`[Authorize] User not found for email: ${credentials.email}`);
          throw new Error("CredentialsSignin")
        }
        console.log(`[Authorize] User found: ${user.email}, ID: ${user.id}`);

        if (!user.password) {
          console.log(`[Authorize] User ${user.email} has no password set.`);
          throw new Error("CredentialsSignin")
        }

        console.log("[Authorize] Comparing passwords...");
        const isValid = await bcrypt.compare(credentials.password, user.password)
        console.log(`[Authorize] Password validation result for ${user.email}:`, isValid);

        if (!isValid) {
          console.log(`[Authorize] Invalid password for user: ${user.email}`);
          throw new Error("CredentialsSignin")
        }

        console.log(`[Authorize] Login successful for: ${user.email}`);
        // Return only necessary user fields for the session/token
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login",
    error: "/auth/error"
  },
  callbacks: {
    async jwt({ token, user }) {
      // The user object passed here is the one returned from authorize
      if (user) {
        token.id = user.id
        token.role = user.role // Add role to the JWT token
      }
      return token
    },
    async session({ session, token }) {
      // Add custom properties to the session object
      if (session?.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string // Add role to the session user
      }
      return session
    }
  }
};

// Initialize NextAuth with the options
const handler = NextAuth(authOptions);

// Export the handler for GET/POST requests
export { handler as GET, handler as POST }; 