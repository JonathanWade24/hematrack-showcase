import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = "force-dynamic";

export async function GET() {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Use Prisma client to query the Labs table for distinct component descriptions
    const components = await prisma.labs.findMany({
      distinct: ['lab_component_description'],
      select: {
        lab_component_description: true
      },
      where: {
        lab_component_description: { not: null } // Exclude null values
      },
      orderBy: {
        lab_component_description: 'asc'
      }
    });

    // Extract the unique descriptions, filtering out potential nulls from the DB query result
    const uniqueComponents = components
        .map((c: { lab_component_description: string | null }) => c.lab_component_description)
        .filter((desc: string | null): desc is string => desc !== null);

    return NextResponse.json(uniqueComponents);

  } catch (error) {
    console.error('Error fetching lab components:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lab components' },
      { status: 500 }
    );
  }
} 