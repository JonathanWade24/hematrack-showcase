import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { UserInApp } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = "force-dynamic";

// Validation schema using Zod
const SettingsSchema = z.object({
  show_phi: z.boolean(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.UserInApp.findFirst({
      where: eq(UserInApp.id, session.user.id)
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return default settings if none are set
    const settings = user.settings || {
      show_phi: true
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[API /settings] Error:', error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = SettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid input", 
          issues: validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }

    const settings = validationResult.data;

    // Update settings in database
    await db.update(UserInApp)
      .set({ 
        settings,
        updated_at: new Date().toISOString()
      })
      .where(eq(UserInApp.id, session.user.id));

    return NextResponse.json({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    console.error('[API /settings] Error:', error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
} 