import { NextResponse } from 'next/server'
import { prisma } from '@/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mrn = searchParams.get('mrn')
    const dataType = searchParams.get('type') || 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!mrn) {
      return NextResponse.json({ error: 'MRN is required' }, { status: 400 })
    }

    // Get patient info
    const patient = await prisma.patients.findUnique({
      where: { patient_mrn: mrn },
      select: {
        patient_mrn: true,
        first_name: true,
        last_name: true,
        birth_date: true,
        sex: true,
        race: true,
        ethnicity: true
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const dateFilter = {}
    if (startDate || endDate) {
      dateFilter['AND'] = []
      if (startDate) {
        dateFilter['AND'].push({ result_time: { gte: new Date(startDate) } })
      }
      if (endDate) {
        dateFilter['AND'].push({ result_time: { lte: new Date(endDate) } })
      }
    }

    // Fetch clinical data based on type
    let clinicalData = []
    const baseFilter = { patient_mrn: mrn, ...dateFilter }

    if (dataType === 'all' || dataType === 'admissions') {
      const admissions = await prisma.ip_admissions.findMany({
        where: baseFilter,
        orderBy: { adm_date_time: 'desc' }
      })
      clinicalData.push(...admissions.map(admission => ({
        ...admission,
        type: 'admission'
      })))
    }

    if (dataType === 'all' || dataType === 'visits') {
      const visits = await prisma.op_visits.findMany({
        where: baseFilter,
        orderBy: { visit_date: 'desc' }
      })
      clinicalData.push(...visits.map(visit => ({
        ...visit,
        type: 'visit'
      })))
    }

    if (dataType === 'all' || dataType === 'medications') {
      const ipMeds = await prisma.ip_medications.findMany({
        where: baseFilter,
        orderBy: { taken_time: 'desc' }
      })
      const opMeds = await prisma.op_medications.findMany({
        where: baseFilter,
        orderBy: { visit_date: 'desc' }
      })
      clinicalData.push(
        ...ipMeds.map(med => ({ ...med, type: 'ip_medication' })),
        ...opMeds.map(med => ({ ...med, type: 'op_medication' }))
      )
    }

    if (dataType === 'all' || dataType === 'labs' || dataType === 'bonemarrow') {
      const labs = await prisma.bone_marrow.findMany({
        where: baseFilter,
        orderBy: { result_time: 'desc' }
      })
      clinicalData.push(...labs.map(lab => ({
        ...lab,
        type: 'lab'
      })))
    }

    // Sort all data by date
    clinicalData.sort((a, b) => {
      const dateA = a.result_time || a.visit_date || a.taken_time || a.adm_date_time
      const dateB = b.result_time || b.visit_date || b.taken_time || b.adm_date_time
      return dateB.getTime() - dateA.getTime()
    })

    return NextResponse.json({
      patient,
      clinicalData
    })
  } catch (error) {
    console.error('Error fetching clinical data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch clinical data' },
      { status: 500 }
    )
  }
} 