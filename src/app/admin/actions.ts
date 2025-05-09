'use server'

import { db } from '@/lib/db';
import { UserInApp } from '@/lib/db/schema';
import { auth } from '@/app/api/auth/[...nextauth]/route'; 
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { type UserRole, PERMITTED_ROLES } from '@/lib/definitions';

// Define a plain type for user data to be sent to the client
export interface UserForAdminClient {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  isActive: boolean;
}

export type AddUserFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
};

export type UpdateUserRoleFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
};

export type ToggleUserActiveStateFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
};

// Helper to check if the current user is an admin
async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === 'admin';
}

export async function getAllUsersAction(): Promise<{ users: UserForAdminClient[]; error?: string }> {
  if (!(await isAdmin())) {
    return { users: [], error: 'Unauthorized' };
  }
  try {
    const dbUsers = await db.select({
      id: UserInApp.id,
      name: UserInApp.name,
      email: UserInApp.email,
      role: UserInApp.role,
      isActive: UserInApp.isActive,
    }).from(UserInApp).orderBy(UserInApp.name);

    // Explicitly map to the client-safe type
    const users: UserForAdminClient[] = dbUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
    }));

    return { users };
  } catch (e) {
    console.error("Error fetching users:", e);
    return { users: [], error: 'Failed to fetch users.' };
  }
}

export async function addUserAction(
  prevState: AddUserFormState | null, 
  formData: FormData
): Promise<AddUserFormState> {
  if (!(await isAdmin())) {
    return { success: false, message: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as UserRole;

  // Basic validation
  if (!name || !email || !password || !role) {
    return { success: false, message: 'All fields are required.' };
  }
  if (!PERMITTED_ROLES.includes(role)) {
    return { success: false, message: 'Invalid role selected.' };
  }
  if (password.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters long.' };
  }

  try {
    const existingUser = await db.query.UserInApp.findFirst({
      where: eq(UserInApp.email, email),
    });
    if (existingUser) {
      return { success: false, message: 'User with this email already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await db.insert(UserInApp).values({
      id: userId,
      name,
      email,
      password: hashedPassword,
      role,
      isActive: true, // Explicitly set, though schema has default
      emailVerified: null, // Assuming email verification is a separate process
    });

    return { success: true, message: 'User added successfully.' };
  } catch (e) {
    console.error("Error adding user:", e);
    return { success: false, message: 'Failed to add user.' };
  }
}

export async function updateUserRoleAction(
  userId: string,
  newRole: UserRole
): Promise<UpdateUserRoleFormState> {
  if (!(await isAdmin())) {
    return { success: false, message: 'Unauthorized' };
  }

  if (!userId || !newRole) {
    return { success: false, message: 'User ID and new role are required.' };
  }

  if (!PERMITTED_ROLES.includes(newRole)) {
    return { success: false, message: 'Invalid role selected.' };
  }

  try {
    const userExists = await db.query.UserInApp.findFirst({
      where: eq(UserInApp.id, userId),
    });

    if (!userExists) {
      return { success: false, message: 'User not found.' };
    }

    await db.update(UserInApp)
      .set({ role: newRole, updated_at: new Date().toISOString() })
      .where(eq(UserInApp.id, userId));

    return { success: true, message: 'User role updated successfully.' };
  } catch (e) {
    console.error("Error updating user role:", e);
    return { success: false, message: 'Failed to update user role.' };
  }
}

export async function toggleUserActiveStateAction(
  userId: string,
  currentIsActive: boolean
): Promise<ToggleUserActiveStateFormState> {
   if (!(await isAdmin())) {
    return { success: false, message: 'Unauthorized' };
  }

  if (!userId) {
    return { success: false, message: 'User ID is required.' };
  }

  try {
    const userExists = await db.query.UserInApp.findFirst({
      where: eq(UserInApp.id, userId),
    });

    if (!userExists) {
      return { success: false, message: 'User not found.' };
    }

    await db.update(UserInApp)
      .set({ isActive: !currentIsActive, updated_at: new Date().toISOString() })
      .where(eq(UserInApp.id, userId));
    
    const actionVerb = !currentIsActive ? "activated" : "deactivated";
    return { success: true, message: `User ${actionVerb} successfully.` };
  } catch (e) {
    console.error(`Error toggling user active state for ${userId}:`, e);
    return { success: false, message: 'Failed to update user active state.' };
  }
} 