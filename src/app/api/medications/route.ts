import { NextResponse } from 'next/server'
import { prisma } from '@/db'

export async function GET() {
  try {
    const medications = await prisma.op_medications.findMany({
      select: {
        generic_description: true
      },
      where: {
        generic_description: {
          not: null
        }
      },
      distinct: ['generic_description'],
      orderBy: {
        generic_description: 'asc'
      }
    })

    const descriptions = medications
      .map((m: { generic_description: string | null }) => m.generic_description)
      .filter((desc: string | null): desc is string => desc !== null)

    return NextResponse.json(descriptions)
  } catch (error) {
    console.error('Error fetching medications:', error)
    return NextResponse.json({ error: 'Failed to fetch medications' }, { status: 500 })
  }
} 