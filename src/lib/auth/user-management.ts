import { db } from '../db';
import { UserInApp, AccountInApp, SessionInApp } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // For generating UUIDs

/**
 * Clears all users, their associated accounts, and sessions.
 * IMPORTANT: This will wipe all user data from these tables.
 */
export async function clearAllUsers(): Promise<void> {
  console.log('[UserManagement] Clearing all users, accounts, and sessions...');
  try {
    // Order matters due to potential foreign key constraints.
    // Start with tables that reference UserInApp or depend on it.
    // AccountInApp and SessionInApp reference UserInApp.id
    await db.delete(AccountInApp); 
    console.log('[UserManagement] All accounts cleared.');
    await db.delete(SessionInApp); 
    console.log('[UserManagement] All sessions cleared.');
    await db.delete(UserInApp);    
    console.log('[UserManagement] All users cleared.');

    console.log('[UserManagement] All users, accounts, and sessions cleared successfully.');
  } catch (error) {
    console.error('[UserManagement] Error clearing user data:', error);
    throw error; 
  }
}

/**
 * Creates a new admin user with the given email and password.
 * The password will be hashed using bcrypt.
 *
 * @param email The email for the admin user.
 * @param plainPassword The plaintext password for the admin user.
 */
export async function createAdminUser(email: string, plainPassword: string): Promise<void> {
  console.log(`[UserManagement] Attempting to create admin user: ${email}`);
  if (!email || !plainPassword) {
    throw new Error('[UserManagement] Email and password are required to create an admin user.');
  }

  try {
    const saltRounds = 10; 
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    console.log(`[UserManagement] Password hashed for user: ${email}`);

    const userId = crypto.randomUUID();

    await db.insert(UserInApp).values({
      id: userId,
      email: email,
      password: hashedPassword,
      name: 'Admin User', // Default name for the admin
      emailVerified: new Date(), // Mark email as verified
      role: 'admin', // Set the role to admin
      image: null, // Optional, can be null
      // created_at and updated_at have defaultNow() in schema
    });

    console.log(`[UserManagement] Admin user ${email} with ID ${userId} created successfully.`);
  } catch (error) {
    console.error(`[UserManagement] Error creating admin user ${email}:`, error);
    if (error instanceof Error && error.message.includes('User_email_key')) { // Check for unique constraint on email
        console.warn(`[UserManagement] Admin user with email ${email} likely already exists.`);
    }
    throw error;
  }
}

// For CommonJS compatibility
module.exports = {
  clearAllUsers,
  createAdminUser
};

// --- Script to run these functions ---
// You would typically run this from a separate script file (e.g., scripts/seed-admin.ts)
// and execute it with something like `npx ts-node scripts/seed-admin.ts`

/*
async function setupAdmin() {
  try {
    await clearAllUsers();
    await createAdminUser('admin@email.com', 'admin');
    console.log('[SetupAdmin] Admin user setup complete.');
  } catch (error) {
    console.error('[SetupAdmin] Failed to set up admin user:', error);
  } finally {
    // If your Drizzle connection doesn't automatically close, you might need to do it here.
    // This depends on how `db` is initialized in `@/lib/db`.
    // For a typical Next.js setup with a long-running server, you usually don't manually close it here.
    // However, for a standalone script, it's good practice.
    // Example: await db.end(); // This is a placeholder; actual method depends on your db driver
    console.log('[SetupAdmin] Script finished.');
  }
}

// To run this, uncomment the line below and execute this file directly (e.g. using ts-node)
// setupAdmin();
*/ 