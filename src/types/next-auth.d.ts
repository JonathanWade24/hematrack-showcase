import type { DefaultSession, User as DefaultUser } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

// Extend the User type
interface User extends DefaultUser {
  role?: string; // Add your custom role property
  id?: string;   // And any other custom properties like id
}

// Extend the Session type to use the augmented User type
declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getServerSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user?: User; // Use the augmented User interface
    }
  }

// Extend the built-in JWT type
declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** The user's role */
    role?: string; // Match the type from your DB schema/authorize return
    /** The user's id */
    id?: string; // Add id if you added it in the jwt callback
  }
} 