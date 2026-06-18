---
tags: [moc, users, permissions, authentication, authorization, auth]
aliases: [User Management, Auth, Access Control]
---

# 05 – User & Permissions

This document outlines user management, authentication, and authorization strategies within the application.

## 1. User Definition in Database

Users are primarily defined in the `app.User` table (Drizzle variable: `UserInApp`) in the PostgreSQL database, as specified in `src/lib/db/schema.ts`. This table, along with `app.Account`, `app.Session`, and `app.VerificationToken`, supports NextAuth.js functionality.

**Key Table: `app.User`**
-   `id`: `text` (Primary Key) - User's unique identifier.
-   `name`: `text` (Nullable) - User's display name.
-   `email`: `text` (Not Null, Unique) - User's email address.
-   `emailVerified`: `timestamp({ withTimezone: true, mode: 'date' })` (Nullable) - Timestamp if email has been verified.
-   `password`: `text` (Nullable) - Stores the hashed password (used by the Credentials provider).
-   `image`: `text` (Nullable) - URL to profile picture.
-   `role`: `text` (Nullable) - Stores the user's role as a simple string (e.g., 'admin', 'user', 'editor'). There is no separate `app.roles` table; roles are managed directly on the user record.
-   `isActive`: `boolean` (Not Null, Default: `true`) - Indicates if the user account is active.
-   `created_at`: `timestamp({ withTimezone: true, mode: 'string' })` (Default: `CURRENT_TIMESTAMP`)
-   `updated_at`: `timestamp({ withTimezone: true, mode: 'string' })` (Default: `CURRENT_TIMESTAMP`)

**Related NextAuth.js Tables (all in `app` schema):**
-   **`app.Account`** (Drizzle: `AccountInApp`): Links user accounts to authentication providers. Given the primary use of a Credentials provider, this table might store entries with `type: 'credentials'` or might be less utilized if only credentials are in play. It's structured to support OAuth providers as well.
    - `userId` (FK to `app.User.id`)
    - `type` (e.g., 'oauth', 'credentials', 'email')
    - `provider` (e.g., 'credentials', 'google')
    - `providerAccountId`
    - OAuth-specific fields: `access_token`, `refresh_token`, `expires_at`, `token_type`, `scope`, `id_token`, `session_state`.
-   **`app.Session`** (Drizzle: `SessionInApp`): Stores active user sessions when using database session strategy with NextAuth.js.
    - `sessionToken` (Primary Key)
    - `userId` (FK to `app.User.id`)
    - `expires` (Timestamp when the session expires)
-   **`app.VerificationToken`** (Drizzle: `VerificationTokenInApp`): Used by NextAuth.js for email verification links or passwordless login (if an Email provider is configured).
    - `identifier`
    - `token`
    - `expires`

Individual notes with more details on these Drizzle schema definitions:
- [[UserInApp]]
- [[AccountInApp]]
- [[SessionInApp]]
- [[VerificationTokenInApp]]

## 2. Authentication Strategy

The application uses NextAuth.js for authentication, configured in `src/app/api/auth/[...nextauth]/route.ts`.

**Key Configuration Points:**

-   **Adapter**: `DrizzleAdapter` is used, connecting NextAuth.js to the PostgreSQL database using the `app.User`, `app.Account`, `app.Session`, and `app.VerificationToken` tables defined in `src/lib/db/schema.ts`.

-   **Providers**:
    -   The primary (and currently sole) authentication method is **Credentials Provider**.
        -   It expects `email` and `password` for login.
        -   The `authorize` function in its configuration:
            1.  Retrieves the user from the `app.User` table by email.
            2.  Uses `bcrypt.compare` to validate the provided password against the hashed password stored in `app.User.password`.
            3.  If successful, it returns a user object that includes `id`, `email`, `name`, and `role`.
    -   No OAuth providers (like Google, GitHub, etc.) are currently configured.

-   **Session Strategy**: JWT (JSON Web Tokens) are used for session management (`strategy: "jwt"`).
    -   While the `DrizzleAdapter` is provided with `sessionsTable: SessionInApp`, this table will not be used for storing sessions when the JWT strategy is active. It would be used if the strategy were set to `"database"`.

-   **Custom Pages**:
    -   Sign-in page: `/login`
    -   Error page: `/auth/error` (for authentication-related errors).

-   **Callbacks for Role Propagation**:
    -   **`jwt` callback**: When a user signs in, this callback is invoked. It takes the user object returned by the `authorize` function (which includes the `role`) and adds `id`, `name`, `email`, and `role` to the JWT (`token`).
    -   **`session` callback**: This callback receives the JWT (`token`) and uses it to populate the `session.user` object. Crucially, `session.user.role` is set from `token.role`. This makes the user's role available both on the client-side (via `useSession()`) and server-side (via `getServerSession()` or the `auth()` helper).

-   **Exports for Server-Side Auth**: The `authOptions` and helper functions like `auth`, `signIn`, and `signOut` are exported from the NextAuth.js route file, allowing them to be used in Server Components and Server Actions for accessing session information or initiating auth flows.

**Relevant Environment Variables:**
-   `NEXTAUTH_URL`: The canonical URL of the application.
-   `NEXTAUTH_SECRET`: A secret key used to sign JWTs and other tokens.
-   `DATABASE_URL`: Used by the Drizzle adapter to connect to the database.

This setup ensures that the user's role, defined in the `app.User` table, is embedded into the JWT upon login and then made available in the session object for use throughout the application for authorization purposes.

## 3. Authorization (Permissions & Roles)

Authorization in this application is primarily Role-Based Access Control (RBAC), centered around the `role` attribute (e.g., 'admin', 'user', 'editor') stored as a text field in the `app.User` table. This role is propagated to the JWT and then to the user's session object, making it available for authorization checks.

No separate `permissions` or `role_permissions` tables are currently used; permissions are implicitly tied to roles.

**Implementation Details:**

-   **Middleware (`src/middleware.ts`)**: This is the primary mechanism for general route protection based on authentication status.
    -   **Authentication Checks (Active)**:
        -   It ensures that users are authenticated to access protected routes. If an unauthenticated user tries to access a protected path, they are redirected to `/login`.
        -   If an authenticated user tries to access public-only paths like `/login`, they are redirected to the application's home page (`/`).
        -   Protected paths are essentially any path not explicitly listed in `PUBLIC_PATHS` (e.g., `/login`, `/access-denied`).
    -   **Role-Based Route Protection (Intended but Currently Commented Out in Middleware)**:
        -   The `src/middleware.ts` file contains a commented-out section designed for broader role-based route protection (e.g., restricting `/dashboard/*` to certain roles). This is not currently active due to noted "type errors."
        -   Addressing this would enhance route-level RBAC.

-   **Page-Level and Action-Level Admin Checks (e.g., `/admin` route)**:
    -   Specific routes like `/admin` implement their own admin checks. The `src/app/admin/page.tsx` component verifies if `session.user.role === 'admin'` before rendering content or fetching data.
    -   All Server Actions defined in `src/app/admin/actions.ts` (e.g., for user management, data purge) also explicitly check if the invoking user has an 'admin' role using `await auth()` at the beginning of each action.

-   **Server-Side Checks (General API Routes, Server Actions, Server Components)**:
    -   For granular access control within other specific server-side logic, the pattern is to fetch the current user's session and role, then conditionally allow/deny operations.
        ```typescript
        // Example: Server-side check
        import { auth } from "@/app/api/auth/[...nextauth]/route";

        export async function someSpecificOperation() {
          const session = await auth();
          if (!session?.user?.role || session.user.role !== 'specific_required_role') {
            throw new Error("Unauthorized");
          }
          // Proceed with operation
        }
        ```

-   **UI Level**: React components conditionally render UI elements based on the user's role from the session.
    ```tsx
    // Example in a Client Component
    "use client";
    import { useSession } from "next-auth/react";

    function MyFeatureButton() {
      const { data: session } = useSession();
      if (session?.user?.role === 'admin') {
        return <button>Admin Only Action</button>;
      }
      return null;
    }
    ```

While middleware provides coarse-grained auth status checks, fine-grained role-based authorization for specific features like the admin panel is implemented at the page and Server Action level.

## 4. Adding / Removing / Managing Users

User management is primarily handled through a dedicated admin interface, supplemented by scripts for initial setup.

**In-App Admin User Management UI (`/admin` route):**

-   The application includes an admin page at `/admin` (`src/app/admin/page.tsx`) specifically for user management and other administrative tasks.
-   **Access**: This page is restricted to users with the 'admin' role. This is enforced both in the page component (client-side redirect/denial if not admin) and in all associated Server Actions.
-   **Features**:
    -   **List Users**: Displays a table of all users with their name, email, role, and active status.
    -   **Add User**: A dialog form allows admins to add new users by providing name, email, password, and role (selected from `PERMITTED_ROLES`). The password is hashed by the server. New users are set to active by default.
    -   **Edit User Role**: Admins can change a user's role directly in the user list.
    -   **Activate/Deactivate User**: Admins can toggle a user's `isActive` status.
-   **Backend Logic**: These UI operations are powered by Server Actions in `src/app/admin/actions.ts`, including `getAllUsersAction`, `addUserAction`, `updateUserRoleAction`, and `toggleUserActiveStateAction`. Each action re-verifies admin privileges before execution.

**Initial Admin User Creation (Scripts):**

-   **Primary Method (Drizzle/SQL-aligned script):** `scripts/seed-admin.mjs` is suitable for creating an initial admin user, especially in development or for initial deployment.
    -   Connects directly to PostgreSQL, clears `app.User`, `app.Account`, `app.Session` tables, then inserts a new admin user (e.g., `admin@email.com`, password 'admin' - hashed by script) with the 'admin' role.
    -   **Caution**: This script is destructive to existing user data.

-   **Alternative Script (`npm run create-admin` - Prisma-based - Requires Verification):**
    -   `scripts/create-admin.ts` (run via `npm run create-admin`) uses Prisma ORM. Its compatibility with the Drizzle-managed schema needs verification, as it might be legacy.

**Other User Management Aspects:**

-   **Self-Service Registration**: Not implemented. User creation is an admin-initiated task through the `/admin` UI or setup scripts.
-   **Password Resets / Email Verification**: While `app.VerificationToken` table exists, full flows for these features are not apparent and would require further implementation.

## 5. Session Management

-   **NextAuth.js**: Handles session creation, storage (JWT or database), and expiry.
-   **Custom Auth**: Document how sessions are created, where tokens are stored (e.g., cookies), and how they are invalidated (logout).

---
Links to: [[03 – Database]], [[02 – System Architecture]], [[04 – Frontend & API]] 