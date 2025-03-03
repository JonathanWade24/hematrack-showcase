import { NextResponse } from 'next/server'
import { prisma } from '@/db'

export async function GET() {
  try {
    const components = await prisma.labs.findMany({
      select: {
        lab_component_description: true
      },
      where: {
        lab_component_description: {
          not: null
        }
      },
      distinct: ['lab_component_description'],
      orderBy: {
        lab_component_description: 'asc'
      }
    })

    const descriptions = components
      .map((c: { lab_component_description: string | null }) => c.lab_component_description)
      .filter((desc: string | null): desc is string => desc !== null)

    return NextResponse.json(descriptions)
  } catch (error) {
    console.error('Error fetching lab components:', error)
    return NextResponse.json({ error: 'Failed to fetch lab components' }, { status: 500 })
  }
} 