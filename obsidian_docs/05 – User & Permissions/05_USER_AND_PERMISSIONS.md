---
tags: [moc, users, permissions, authentication, authorization, auth]
aliases: [User Management, Auth, Access Control]
---

# 05 – User & Permissions

This document outlines user management, authentication, and authorization strategies within the application.

## 1. User Definition in Database

Users are primarily defined in the `app.users` table (or a similarly named table within the `app` or public schema) in the PostgreSQL database. Refer to `src/lib/db/schema.ts` for the exact structure.

**Key Table: `app.users`** (Example structure, verify from `src/lib/db/schema.ts`)
-   `id`: (e.g., `uuid().defaultRandom().primaryKey()`, `serial().primaryKey()`)
-   `name`: `varchar({ length: 255 })`
-   `email`: `varchar({ length: 255 }).unique().notNull()`
-   `emailVerified`: `timestamp({ withTimezone: true, mode: "date" })` (if email verification is used)
-   `passwordHash`: `text()` (stores the hashed password)
-   `image`: `text()` (URL to profile picture, optional)
-   `role`: `varchar({ length: 50 })` (e.g., 'admin', 'user', 'editor') or a foreign key to a `roles` table.
    - `[TODO: Determine if roles are simple strings or a separate app.roles table. If separate, document app.roles and app.user_roles join table if many-to-many.]`
-   `createdAt`: `timestamp().defaultNow()`
-   `updatedAt`: `timestamp().defaultNow()`

**Related Tables (Potential):**
-   `app.accounts`: If using NextAuth.js or similar, this table links user accounts to OAuth providers (Google, GitHub, etc.).
    - `userId` (FK to `users.id`)
    - `type` (e.g., 'oauth', 'credentials')
    - `provider` (e.g., 'google', 'github')
    - `providerAccountId`
    - `access_token`, `refresh_token`, `expires_at`
-   `app.sessions`: Stores active user sessions (common with NextAuth.js).
    - `sessionToken`
    - `userId` (FK to `users.id`)
    - `expires`
-   `app.verification_tokens`: For email verification or password reset tokens.

`[TODO: Read src/lib/db/schema.ts specifically for tables named users, accounts, sessions, roles, permissions in the app or public schema to confirm actual table structures and relationships. Create individual notes like [[usersInApp]], [[accountsInApp]] if they exist.]`

## 2. Authentication Strategy

`[TODO: Identify and document the precise authentication strategy. This is a critical section.]`

**Common Possibilities:**

-   **NextAuth.js**: Highly likely for a Next.js application.
    -   **Configuration**: Check for `src/app/api/auth/[...nextauth]/route.ts` or `src/pages/api/auth/[...nextauth].ts` (for Pages Router).
    -   **Providers**: Identify configured providers (e.g., Credentials, Google, GitHub, Email/Magic Link).
    -   **Callbacks**: Review `callbacks` in NextAuth options (e.g., `signIn`, `jwt`, `session`) for custom logic.
    -   **Adapter**: Check if a Drizzle Adapter for NextAuth.js is used (e.g., `@auth/drizzle-adapter`). This would manage `users`, `accounts`, `sessions`, `verification_tokens` tables.
        ```typescript
        // Example NextAuth.js setup with Drizzle Adapter
        // src/app/api/auth/[...nextauth]/route.ts
        import NextAuth from "next-auth";
        import GoogleProvider from "next-auth/providers/google";
        import CredentialsProvider from "next-auth/providers/credentials";
        import { DrizzleAdapter } from "@auth/drizzle-adapter";
        import { db } from "@/lib/db"; // Your Drizzle instance
        // import { users } from "@/lib/db/schema"; // If not using default table names

        export const authOptions = {
          adapter: DrizzleAdapter(db /*, { usersTable: users, ... } */),
          providers: [
            GoogleProvider({
              clientId: process.env.GOOGLE_CLIENT_ID!,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            }),
            CredentialsProvider({
              // ... configuration for username/password login
            }),
          ],
          session: { strategy: "jwt" }, // Or "database"
          callbacks: {
            async session({ session, token }) {
              if (token.sub && session.user) {
                session.user.id = token.sub;
                // session.user.role = token.role; // Example: Add role to session
              }
              return session;
            },
            async jwt({ token, user }) {
              if (user) {
                // token.role = user.role; // Example: Add role to JWT from user object
              }
              return token;
            },
          },
          // ... other NextAuth options (pages, secret, etc.)
        };

        const handler = NextAuth(authOptions);
        export { handler as GET, handler as POST };
        ```

-   **Custom JWT Authentication**: If NextAuth.js is not used, there might be a custom implementation involving JWTs.
    -   Look for API routes for login/registration.
    -   Identify how JWTs are generated, stored (e.g., httpOnly cookies), and validated (e.g., middleware).

-   **Other Third-Party Auth Services**: (e.g., Clerk, Supabase Auth, Auth0).
    -   Look for SDK installations and configurations.

**Key Files to Check:**
-   `src/app/api/auth/[...nextauth]/route.ts` (or Pages Router equivalent)
-   `src/lib/auth.ts` or `src/auth.ts` (potential helper file for auth logic/session access)
-   Middleware: `src/middleware.ts` (often used for protecting routes)
-   Environment variables related to auth (e.g., `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`).

## 3. Authorization (Permissions & Roles)

`[TODO: Document how authorization/permissions are handled.]`

**Common Approaches:**

-   **Role-Based Access Control (RBAC)**:
    -   Users have roles (e.g., 'admin', 'user', 'editor') stored in the `users` table or a dedicated `roles` table.
    -   Application logic checks the user's role before allowing access to certain features or data.
    -   This can be implemented in API routes, Server Actions, or even UI components (conditionally rendering elements).

-   **Permission-Based Access Control**: More granular.
    -   Might involve `permissions` and `role_permissions` tables.
    -   `[TODO: Check schema for these tables.]`

-   **Implementation Details**:
    -   **Middleware**: `src/middleware.ts` can be used to protect entire route segments based on authentication status or roles.
        ```typescript
        // src/middleware.ts (Example with NextAuth.js)
        export { default } from "next-auth/middleware";

        export const config = {
          matcher: ["/dashboard/:path*", "/admin/:path*"], // Protected routes
        };
        ```
    -   **Server-Side Checks**: In API routes, Server Actions, or Server Components, fetch the user's session/role and perform checks.
        ```typescript
        // Example in a Server Component or API route
        import { getServerSession } from "next-auth/next";
        import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Path to your auth options

        async function someSecureOperation() {
          const session = await getServerSession(authOptions);
          if (!session || session.user.role !== "admin") {
            throw new Error("Unauthorized");
          }
          // Proceed with admin-only operation
        }
        ```
    -   **UI Level**: Conditionally render UI elements based on user role or permissions.

## 4. Adding / Removing / Managing Users

`[TODO: Detail the process for user management. This depends heavily on the auth strategy.]`

-   **Self-Service Registration**: If enabled (e.g., through NextAuth.js providers or a registration form).
-   **Admin Interface**: Is there a dedicated admin section in the app for managing users?
    -   If so, document its location and capabilities (e.g., inviting users, changing roles, deactivating accounts).
    -   This might involve custom API routes and frontend components.
-   **Database Operations (Direct - Use with extreme caution)**:
    -   For emergency or backend-only user management, direct database manipulation might be an option, but it's generally discouraged if an admin interface or auth provider console exists.
    -   SQL commands to add a user (example, highly dependent on schema and password hashing):
        ```sql
        -- Example, NOT FOR PRODUCTION USE WITHOUT HASHING
        -- INSERT INTO app.users (name, email, password_hash, role) VALUES ('New User', 'new@example.com', 'hashed_password_here', 'user');
        ```
    -   The `test-user.ts` and `check-user.ts` files in the project root suggest scripts for creating/checking users, possibly for testing or initial setup. These should be investigated and documented if they are part of the standard user management toolkit.
        - [[test-user.ts]]
        - [[check-user.ts]]
-   **External Provider Management**: If using OAuth providers like Google, user management might partially occur on the provider's platform (e.g., revoking access).

## 5. Session Management

-   **NextAuth.js**: Handles session creation, storage (JWT or database), and expiry.
-   **Custom Auth**: Document how sessions are created, where tokens are stored (e.g., cookies), and how they are invalidated (logout).

---
Links to: [[03 – Database]], [[02 – System Architecture]], [[04 – Frontend & API]] 