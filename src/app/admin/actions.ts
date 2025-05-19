'use server'

import { db } from '@/lib/db';
import { UserInApp, omics_subjectsInLaboratory, samplesInLaboratory } from '@/lib/db/schema';
import { auth } from '@/app/api/auth/[...nextauth]/route'; 
import { eq, inArray, sql, or, like, desc } from 'drizzle-orm';
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

export type PurgeSubjectDataFormState = {
  success: boolean;
  message: string;
  subjectId?: string;
};

export type ChangeUserPasswordFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
};

// Type for subject search results
export type OmicsSubjectSearchResult = {
  subject_id: string;
  project: string | null;
  // Add other fields if needed for display
};

export type SearchSubjectsFormState = {
  results?: OmicsSubjectSearchResult[];
  message?: string;
  error?: boolean;
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

export async function searchOmicsSubjectsAction(
  prevState: SearchSubjectsFormState | null,
  formData: FormData
): Promise<SearchSubjectsFormState> {
  if (!(await isAdmin())) {
    return { message: 'Unauthorized', error: true };
  }

  const query = formData.get('searchQuery') as string | null;

  if (!query || query.trim().length < 2) {
    return { message: 'Search term must be at least 2 characters long.', error: false, results: [] };
  }

  const searchTerm = `%${query.toLowerCase().trim()}%`;

  try {
    const foundSubjects = await db
      .select({
        subject_id: omics_subjectsInLaboratory.subject_id,
        project: omics_subjectsInLaboratory.project,
      })
      .from(omics_subjectsInLaboratory)
      .where(like(sql`lower(${omics_subjectsInLaboratory.subject_id})`, searchTerm))
      .orderBy(desc(omics_subjectsInLaboratory.created_at)) // Or order by subject_id
      .limit(10); // Limit results for performance

    if (foundSubjects.length === 0) {
      return { message: `No subjects found matching "${query}".`, results: [], error: false };
    }

    return { results: foundSubjects, error: false };

  } catch (e: any) {
    console.error(`Error searching subjects with query "${query}":`, e);
    return { message: 'Subject search failed due to a server error.', error: true };
  }
}

export async function purgeSubjectDataAction(
  prevState: PurgeSubjectDataFormState | null,
  formData: FormData
): Promise<PurgeSubjectDataFormState> {
  if (!(await isAdmin())) {
    return { success: false, message: 'Unauthorized' };
  }

  const subjectId = formData.get('subject_id_to_purge') as string;

  if (!subjectId || subjectId.trim() === '') {
    return { success: false, message: 'Subject ID is required to purge data.', subjectId };
  }

  try {
    // Verify subject exists before attempting to fetch related data
    const subjectExists = await db.query.omics_subjectsInLaboratory.findFirst({
        where: eq(omics_subjectsInLaboratory.subject_id, subjectId)
    });
    if (!subjectExists) {
        return { success: false, message: `Subject ID ${subjectId} not found.`, subjectId };
    }

    // Proceed with deletion within a transaction
    const result = await db.transaction(async (tx) => {
      // 1. Get all sample_ids for this subject
      const samplesToDelete = await tx.query.samplesInLaboratory.findMany({
        where: eq(samplesInLaboratory.subject_id, subjectId),
        columns: {
          sample_id: true,
        },
      });

      const sampleIdsToDelete = samplesToDelete.map(s => s.sample_id);

      if (sampleIdsToDelete.length > 0) {
        // 2. Delete from all results_* tables using ASSAY_CONFIGS
        const { ASSAY_CONFIGS } = await import('@/config/assayConfigs'); // Dynamic import
        for (const assayKey in ASSAY_CONFIGS) {
          const config = ASSAY_CONFIGS[assayKey];
          if (config.dbTable && config.sampleIdForeignKey) {
            // @ts-ignore - Drizzle types struggle with dynamic table/column names here
            await tx.delete(config.dbTable).where(inArray(config.dbTable[config.sampleIdForeignKey], sampleIdsToDelete));
            console.log(`Purged ${assayKey} data for samples of subject ${subjectId}`);
          }
        }
        // 3. Delete from samplesInLaboratory table
        await tx.delete(samplesInLaboratory).where(eq(samplesInLaboratory.subject_id, subjectId));
        console.log(`Purged samples for subject ${subjectId}`);
      }

      // 4. Delete from omics_subjectsInLaboratory table
      await tx.delete(omics_subjectsInLaboratory).where(eq(omics_subjectsInLaboratory.subject_id, subjectId));
      console.log(`Purged subject ${subjectId}`);
      
      return { success: true, message: `All data for subject ${subjectId} has been successfully purged.`, subjectId };
    });

    return result;

  } catch (e: any) {
    console.error(`Error purging data for subject ${subjectId}:`, e);
    return { success: false, message: `Failed to purge data for subject ${subjectId}. Reason: ${e.message}`, subjectId };
  }
}

export async function changeUserPasswordAction(
  userId: string,
  newPassword: string
): Promise<ChangeUserPasswordFormState> {
  if (!(await isAdmin())) {
    return { success: false, message: 'Unauthorized' };
  }

  if (!userId || !newPassword) {
    return { success: false, message: 'User ID and new password are required.' };
  }

  if (newPassword.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters long.' };
  }

  try {
    const userExists = await db.query.UserInApp.findFirst({
      where: eq(UserInApp.id, userId),
    });

    if (!userExists) {
      return { success: false, message: 'User not found.' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.update(UserInApp)
      .set({ 
        password: hashedPassword,
        updated_at: new Date().toISOString() 
      })
      .where(eq(UserInApp.id, userId));

    return { success: true, message: 'Password updated successfully.' };
  } catch (e) {
    console.error("Error updating user password:", e);
    return { success: false, message: 'Failed to update password.' };
  }
} 