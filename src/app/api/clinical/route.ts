import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import type { ip_admissions, op_visits, ip_medications, op_medications, bone_marrow } from '@/generated/prisma' // Import model types

export const dynamic = "force-dynamic"; // Ensure this route is handled dynamically

// Define allowed roles for accessing this sensitive route
const ALLOWED_ROLES = ['admin', 'clinician', 'editor'] // Adjust roles as needed

// Helper type for combined data
type CombinedClinicalData = (ip_admissions | op_visits | ip_medications | op_medications | bone_marrow) & { type: string };

export async function GET(request: Request) {
  // --- Authentication & Authorization ---
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Check if the user has one of the allowed roles
  if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    console.warn(`[API /clinical] User ${session.user.email} (Role: ${session.user.role}) attempted unauthorized access.`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // --- Parameter Handling ---
  try {
    const { searchParams } = new URL(request.url)
    const mrn = searchParams.get('mrn')
    const dataType = searchParams.get('type') || 'all' // Default to 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!mrn) {
      return NextResponse.json({ error: 'MRN query parameter is required' }, { status: 400 })
    }

    // --- Data Fetching (PHI) ---
    // Fetch patient info from the PHI schema
    const patient = await prisma.patients.findUnique({
      where: { patient_mrn: mrn },
      select: {
        patient_mrn: true,
        first_name: true,
        last_name: true,
        birth_date: true,
        sex: true,
        race: true,
        ethnicity: true,
      },
    })

    if (!patient) {
      return NextResponse.json({ error: `Patient with MRN ${mrn} not found` }, { status: 404 })
    }

    // --- Data Fetching (Clinical) ---
    const clinicalDataPromises: Promise<CombinedClinicalData[]>[] = []
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    // Define fetches based on dataType with explicit types
    if (dataType === 'all' || dataType === 'admissions') {
      clinicalDataPromises.push(
        prisma.ip_admissions.findMany({
          where: {
            patient_mrn: mrn,
            adm_date_time: dateFilter,
          },
          orderBy: { adm_date_time: 'desc' },
        }).then((data: ip_admissions[]) => data.map(d => ({ ...d, type: 'admission' })))
      )
    }

    if (dataType === 'all' || dataType === 'visits') {
      clinicalDataPromises.push(
        prisma.op_visits.findMany({
          where: {
            patient_mrn: mrn,
            visit_date: dateFilter,
          },
          orderBy: { visit_date: 'desc' },
        }).then((data: op_visits[]) => data.map(d => ({ ...d, type: 'visit' })))
      )
    }

    if (dataType === 'all' || dataType === 'medications') {
      // IP Medications
      clinicalDataPromises.push(
        prisma.ip_medications.findMany({
          where: {
            patient_mrn: mrn,
            taken_time: dateFilter.gte || dateFilter.lte ? { gte: dateFilter.gte, lte: dateFilter.lte } : undefined,
          },
          orderBy: { taken_time: 'desc' },
        }).then((data: ip_medications[]) => data.map(d => ({ ...d, type: 'ip_medication' })))
      );
      // OP Medications
      clinicalDataPromises.push(
        prisma.op_medications.findMany({
          where: {
            patient_mrn: mrn,
            visit_date: dateFilter,
          },
          orderBy: { visit_date: 'desc' },
        }).then((data: op_medications[]) => data.map(d => ({ ...d, type: 'op_medication' })))
      );
    }

    // Note: Original code fetched `bone_marrow` for labs/bonemarrow. Assuming this is correct.
    if (dataType === 'all' || dataType === 'labs' || dataType === 'bonemarrow') {
      clinicalDataPromises.push(
        prisma.bone_marrow.findMany({
          where: {
            patient_mrn: mrn,
            result_time: dateFilter,
          },
          orderBy: { result_time: 'desc' },
        }).then((data: bone_marrow[]) => data.map(d => ({ ...d, type: 'lab' }))) // Type remains 'lab' based on original code
      )
    }

    // --- Combine and Sort Results ---
    const results = await Promise.all(clinicalDataPromises)
    const combinedClinicalData: CombinedClinicalData[] = results.flat() // Flatten the array of arrays

    // Sort all combined data by the most relevant date field
    combinedClinicalData.sort((a, b) => {
      const getDate = (item: CombinedClinicalData): Date | null => {
        // Type assertion to access potential date fields safely
        const dateVal = (item as any).result_time || (item as any).visit_date || (item as any).taken_time || (item as any).adm_date_time;
        return dateVal ? new Date(dateVal) : null;
      }
      const dateA = getDate(a);
      const dateB = getDate(b);
      if (!dateA && !dateB) return 0; // Both null
      if (!dateA) return 1; // Place nulls after valid dates
      if (!dateB) return -1; // Place nulls after valid dates
      return dateB.getTime() - dateA.getTime(); // Sort descending
    });

    // --- Return Response ---
    return NextResponse.json({
      patient,
      clinicalData: combinedClinicalData,
    });

  } catch (error) {
    console.error('[API /clinical] Error fetching clinical data:', error);
    // Provide a more generic error message in production
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch clinical data'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 