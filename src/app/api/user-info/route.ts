import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get the session using NextAuth
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // The session user object already contains id, email, and role from callbacks
    const { id, email, role, name, image } = session.user;

    // Optional: If you need fields not added to the session (like emailVerified)
    // you could fetch the full user record from Prisma.
    // const fullUser = await prisma.user.findUnique({
    //   where: { id: id },
    //   select: { emailVerified: true /* add other fields as needed */ }
    // });

    // Return the available user information
    // Note: Supabase specific metadata (app_metadata, user_metadata) is not directly available.
    // Timestamps like created_at, updated_at, last_sign_in_at are not standard NextAuth session fields.
    return NextResponse.json({
      id: id,
      email: email,
      role: role, 
      name: name, // Included if available in session
      image: image, // Included if available in session
      // emailVerified: fullUser?.emailVerified, // Example if fetching full user
    });

  } catch (error) {
    console.error('[API /user-info] Error fetching user info:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error fetching user info' },
      { status: 500 }
    );
  }
} 