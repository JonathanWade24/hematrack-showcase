import { NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma' // Commented out
import { auth } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = "force-dynamic";

// Define allowed roles if this route needs protection, e.g.
// const ALLOWED_ROLES = ['admin', 'viewer', 'editor'];

export async function GET() {
  const session = await auth()
  if (!session) { // Or !session.user if you want to ensure user object exists
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Add role check if needed:
  // if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // }

  try {
    console.log("[API /lab-components] Request received. Functionality temporarily disabled pending Drizzle migration.");

    // --- Prisma logic temporarily commented out ---
    /*
    const components = await prisma.labs.findMany({
      distinct: ['lab_component_description'],
      select: {
        lab_component_description: true
      },
      where: {
        lab_component_description: { not: null } 
      },
      orderBy: {
        lab_component_description: 'asc'
      }
    });

    const uniqueComponents = components
        .map((c: { lab_component_description: string | null }) => c.lab_component_description)
        .filter((desc: string | null): desc is string => desc !== null);

    return NextResponse.json(uniqueComponents);
    */
    // --- End of commented out Prisma logic ---

    return NextResponse.json(
      { 
        success: false, 
        message: "Lab Components GET functionality is temporarily disabled pending migration to Drizzle ORM.",
        data: [] 
      }, 
      { status: 503 } // Service Unavailable
    );

  } catch (error) {
    console.error('Error fetching lab components (handler disabled):', error);
    return NextResponse.json(
      { error: 'Failed to fetch lab components (handler disabled)' },
      { status: 500 }
    );
  }
} 