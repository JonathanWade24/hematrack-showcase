import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { UserInApp } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = "force-dynamic";

// Validation schema using Zod
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string().min(8, { message: "New password must be at least 8 characters long" }),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = ChangePasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid input", 
          issues: validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Get user from database
    const user = await db.query.UserInApp.findFirst({
      where: eq(UserInApp.id, session.user.id)
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await db.update(UserInApp)
      .set({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .where(eq(UserInApp.id, session.user.id));

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error('[API /auth/change-password] Error:', error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
} 