import { NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma' // Commented out
// import { getServerSession } from 'next-auth/next' // Commented out
// import { authOptions } from '@/app/api/auth/[...nextauth]/route' // Commented out, use auth directly
import { auth } from '@/app/api/auth/[...nextauth]/route' // Added for NextAuth.js v5

export const dynamic = "force-dynamic";

// Define allowed roles if this route needs protection, e.g.
// const ALLOWED_ROLES = ['admin', 'viewer', 'editor'];

export async function GET() {
  // Add authentication/authorization if needed for this route
  /*
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // }
  */

  try {
    console.log("[API /medications] Request received. Functionality temporarily disabled pending Drizzle migration.");
    
    // --- Prisma logic temporarily commented out ---
    /*
    const medications = await prisma.op_medications.findMany({
      select: {
        generic_description: true
      },
      orderBy: {
        generic_description: 'asc'
      }
    })
    
    const uniqueMedications = [...new Set(medications
      .map((m: { generic_description: string | null }) => m.generic_description)
      .filter((desc): desc is string => desc !== null))]
    
    return NextResponse.json(uniqueMedications)
    */
    // --- End of commented out Prisma logic ---

    return NextResponse.json(
      { 
        success: false, 
        message: "Medications GET functionality is temporarily disabled pending migration to Drizzle ORM.",
        data: [] 
      }, 
      { status: 503 } // Service Unavailable
    );

  } catch (error) {
    console.error('Error fetching medications (handler disabled):', error)
    return NextResponse.json(
      { error: 'Failed to fetch medications (handler disabled)' },
      { status: 500 }
    )
  }
} 