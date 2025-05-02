import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = "force-dynamic"; // Ensure this route is handled dynamically

// Define the roles that can be assigned
// It's good practice to define this centrally if used elsewhere
const VALID_ROLES = [
  'admin', 
  'clinician', 
  'editor', 
  'viewer', 
  'non_clinical_researcher',
  'clinical_researcher_full', 
  'clinical_researcher_masked',
  'clinical_data_entry',
  'user' // Default role
];

// GET: List all users and their roles (Admin only)
export async function GET() {
  // --- Authentication & Authorization ---
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    console.warn(`[API /user-roles GET] Unauthorized access attempt by user: ${session?.user?.email ?? 'No Session'}`);
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    console.log('[API /user-roles GET] Fetching all users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true, // Include other relevant non-sensitive fields
        image: true,
      },
      orderBy: {
        email: 'asc' // Or order by name/id
      }
    });
    console.log(`[API /user-roles GET] Found ${users.length} users.`);
    return NextResponse.json({ users });

  } catch (error) {
    console.error('[API /user-roles GET] Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Update a specific user's role (Admin only)
export async function POST(request: Request) {
  // --- Authentication & Authorization ---
  const session = await getServerSession(authOptions);
   if (!session?.user || session.user.role !== 'admin') {
    console.warn(`[API /user-roles POST] Unauthorized role update attempt by user: ${session?.user?.email ?? 'No Session'}`);
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { userId, role } = await request.json();
    console.log(`[API /user-roles POST] Request to update user ${userId} to role ${role}`);

    // --- Input Validation ---
    if (!userId || !role) {
      console.error('[API /user-roles POST] Validation Error: Missing userId or role');
      return NextResponse.json({ error: 'Missing required fields: userId and role' }, { status: 400 });
    }

    if (typeof userId !== 'string' || typeof role !== 'string') {
       console.error('[API /user-roles POST] Validation Error: Invalid data types');
       return NextResponse.json({ error: 'Invalid data types for userId or role' }, { status: 400 });
    }
    
    if (!VALID_ROLES.includes(role)) {
       console.error(`[API /user-roles POST] Validation Error: Invalid role "${role}" specified`);
      return NextResponse.json({ error: `Invalid role specified. Valid roles are: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }

    // --- Database Update ---
    console.log(`[API /user-roles POST] Attempting to update role for user ${userId}...`);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role },
      select: { // Select only necessary fields to return
        id: true,
        email: true,
        role: true,
      }
    });
    console.log(`[API /user-roles POST] Successfully updated role for user ${userId} to ${updatedUser.role}`);

    return NextResponse.json({ 
        success: true, 
        message: `User ${updatedUser.email} role updated to ${updatedUser.role}`,
        user: updatedUser
    });

  } catch (error: any) {
    console.error('[API /user-roles POST] Error updating user role:', error);
    
    // Handle specific Prisma error for record not found
    if (error.code === 'P2025') { // Prisma error code for Record to update not found.
        console.error(`[API /user-roles POST] Error: User with ID ${error.meta?.cause?.id ?? 'unknown'} not found.`);
        return NextResponse.json({ error: `User not found.` }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 