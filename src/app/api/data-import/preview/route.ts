import { NextResponse } from 'next/server'
import { prisma } from '@/db'
import { convertToNumber } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!type) {
      return NextResponse.json(
        { error: 'Data type is required' },
        { status: 400 }
      )
    }

    let data
    switch (type) {
      case 'demographics':
        data = await prisma.patients.findMany({
          orderBy: { created_at: 'desc' },
          take: limit
        })
        break
      case 'bonemarrow':
        data = await prisma.bone_marrow.findMany({
          orderBy: { result_time: 'desc' },
          take: limit
        })
        break
      case 'ipadmissions':
        data = await prisma.ip_admissions.findMany({
          orderBy: { adm_date_time: 'desc' },
          take: limit
        })
        break
      case 'opavsmeds':
        data = await prisma.op_medications.findMany({
          orderBy: { visit_date: 'desc' },
          take: limit
        })
        break
      case 'opvisits':
        data = await prisma.op_visits.findMany({
          orderBy: { visit_date: 'desc' },
          take: limit
        })
        break
      case 'ipmeds':
        data = await prisma.ip_medications.findMany({
          orderBy: { adm_date_time: 'desc' },
          take: limit
        })
        break
      case 'labs':
        data = await prisma.bone_marrow.findMany({
          where: {
            NOT: { bone_marrow_results_by_component: { not: null } }
          },
          orderBy: { result_time: 'desc' },
          take: limit
        })
        break
      default:
        return NextResponse.json(
          { error: 'Invalid data type' },
          { status: 400 }
        )
    }

    return NextResponse.json({ data: convertToNumber(data) })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch preview data' },
      { status: 500 }
    )
  }
} 