import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Use Prisma client to query the op_medications table
    const medications = await prisma.op_medications.findMany({
      select: {
        generic_description: true
      },
      orderBy: {
        generic_description: 'asc'
      }
    })
    
    // Get unique medication descriptions
    const uniqueMedications = [...new Set(medications
      .map((m: { generic_description: string | null }) => m.generic_description)
      .filter((desc): desc is string => desc !== null))]
    
    return NextResponse.json(uniqueMedications)
  } catch (error) {
    console.error('Error fetching medications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    )
  }
} 