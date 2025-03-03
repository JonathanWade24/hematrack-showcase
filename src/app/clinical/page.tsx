import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { prisma } from '@/db'
import { ClinicalDataBrowser } from '@/components/clinical/ClinicalDataBrowser'

const DEFAULT_PAGE_SIZE = 25

// Add type constants at the top after imports
const DATA_TYPES = {
  LABS: 'labs',
  BONE_MARROW: 'bonemarrow',
  IP_ADMISSIONS: 'ip_admissions',
  OP_VISITS: 'op_visits',
  MEDICATIONS: 'medications'
} as const

type DataType = typeof DATA_TYPES[keyof typeof DATA_TYPES]

interface PageProps {
  searchParams: { 
    page?: string
    pageSize?: string
    search?: string
    type?: string
    startDate?: string
    endDate?: string
  }
}

// Import types from ClinicalDataBrowser
type LabData = {
  id: number
  patient_mrn: string
  result_time: Date
  lab_component_description: string
  bone_marrow_results_by_component: string | null
  lab_code: string | null
  lab_name: string | null
  type: 'lab'
}

type AdmissionData = {
  id: number
  patient_mrn: string
  adm_date_time: Date
  disch_date_time: Date | null
  discharge_department: string | null
  discharge_disposition: string | null
  icu_admission_yn: string | null
  admit_dx_description_1: string | null
  final_dx_description_1: string | null
  type: 'admission'
}

type VisitData = {
  id: number
  patient_mrn: string
  visit_date: Date
  visit_type: string | null
  department_name: string | null
  dx_name: string | null
  bp_systolic: number | null
  bp_diastolic: number | null
  weight_kg: number | null
  weight_lbs: number | null
  type: 'visit'
}

type IPMedicationData = {
  id: number
  patient_mrn: string
  adm_date_time: Date
  medication: string
  dosage: string | null
  unit: string | null
  frequency: string | null
  rx_class_name: string | null
  type: 'ip_medication'
}

type OPMedicationData = {
  id: number
  patient_mrn: string
  visit_date: Date
  generic_description: string | null
  rx_status: string | null
  type: 'op_medication'
}

type ClinicalData = 
  | LabData
  | AdmissionData
  | VisitData
  | IPMedicationData
  | OPMedicationData

async function getClinicalData(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  search?: string,
  type?: string,
  startDate?: string,
  endDate?: string
) {
  const skip = (page - 1) * pageSize
  const take = pageSize

  // Base search condition for patient_mrn
  const baseSearch = search ? {
    patient_mrn: { contains: search, mode: 'insensitive' as const }
  } : {}

  let data: ClinicalData[] = []
  let totalCount = 0

  // Normalize the type parameter
  const normalizedType = type?.toLowerCase() as DataType

  switch (normalizedType) {
    case DATA_TYPES.LABS:
      // Query both labs and bone marrow tables
      const dateFilter = startDate || endDate ? {
        AND: [
          ...(startDate ? [{ result_time: { gte: new Date(startDate) } }] : []),
          ...(endDate ? [{ result_time: { lte: new Date(endDate) } }] : [])
        ]
      } : {}

      // Get regular lab results
      const labResults = await prisma.labs.findMany({
        where: {
          ...baseSearch,
          ...dateFilter,
        },
        orderBy: { result_time: 'desc' },
        skip,
        take: take / 2
      })

      // Get bone marrow results
      const boneMarrowResults = await prisma.bone_marrow.findMany({
        where: {
          ...baseSearch,
          ...dateFilter,
        },
        orderBy: { result_time: 'desc' },
        skip,
        take: take / 2
      })

      // Combine and format results
      data = [
        ...labResults.map(lab => ({
          id: Number(lab.id),
          patient_mrn: lab.patient_mrn,
          result_time: lab.result_time || new Date(),
          lab_component_description: lab.lab_component_description || '',
          bone_marrow_results_by_component: null,
          lab_code: lab.component_id,
          lab_name: lab.lab_component_description,
          type: 'lab' as const
        })),
        ...boneMarrowResults.map(bm => ({
          id: Number(bm.id),
          patient_mrn: bm.patient_mrn,
          result_time: bm.result_time || new Date(),
          lab_component_description: bm.lab_component_description || '',
          bone_marrow_results_by_component: bm.bone_marrow_results_by_component,
          lab_code: bm.lab_code,
          lab_name: bm.lab_name,
          type: 'lab' as const
        }))
      ].sort((a, b) => b.result_time.getTime() - a.result_time.getTime())

      // Get total count from both tables
      const [labCount, boneMarrowCount] = await Promise.all([
        prisma.labs.count({ where: { ...baseSearch, ...dateFilter } }),
        prisma.bone_marrow.count({ where: { ...baseSearch, ...dateFilter } })
      ])
      
      totalCount = labCount + boneMarrowCount
      break

    case DATA_TYPES.IP_ADMISSIONS:
      const admissionWhere = {
        ...baseSearch,
        ...(startDate || endDate ? {
          AND: [
            ...(startDate ? [{ adm_date_time: { gte: new Date(startDate) } }] : []),
            ...(endDate ? [{ adm_date_time: { lte: new Date(endDate) } }] : [])
          ]
        } : {})
      }

      const admissions = await prisma.ip_admissions.findMany({
        where: admissionWhere,
        include: {
          patients: {
            select: {
              first_name: true,
              last_name: true,
              birth_date: true
            }
          }
        },
        orderBy: { adm_date_time: 'desc' },
        skip,
        take
      })
      data = admissions.map(admission => ({
        id: Number(admission.id),
        patient_mrn: admission.patient_mrn,
        adm_date_time: admission.adm_date_time,
        disch_date_time: admission.disch_date_time,
        discharge_department: admission.discharge_department,
        discharge_disposition: admission.discharge_disposition,
        icu_admission_yn: admission.icu_admission_yn,
        admit_dx_description_1: admission.admit_dx_description_1,
        final_dx_description_1: admission.final_dx_description_1,
        type: 'admission' as const
      }))
      totalCount = await prisma.ip_admissions.count({ where: admissionWhere })
      break

    case DATA_TYPES.OP_VISITS:
      const visitWhere = {
        ...baseSearch,
        ...(startDate || endDate ? {
          AND: [
            ...(startDate ? [{ visit_date: { gte: new Date(startDate) } }] : []),
            ...(endDate ? [{ visit_date: { lte: new Date(endDate) } }] : [])
          ]
        } : {})
      }

      const visits = await prisma.op_visits.findMany({
        where: visitWhere,
        include: {
          patients: {
            select: {
              first_name: true,
              last_name: true,
              birth_date: true
            }
          }
        },
        orderBy: { visit_date: 'desc' },
        skip,
        take
      })
      data = visits.map(visit => ({
        id: Number(visit.id),
        patient_mrn: visit.patient_mrn,
        visit_date: visit.visit_date,
        visit_type: visit.visit_type,
        department_name: visit.department_name,
        dx_name: visit.dx_name,
        bp_systolic: visit.bp_systolic,
        bp_diastolic: visit.bp_diastolic,
        weight_kg: visit.weight_kg ? Number(visit.weight_kg) : null,
        weight_lbs: visit.weight_lbs ? Number(visit.weight_lbs) : null,
        type: 'visit' as const
      }))
      totalCount = await prisma.op_visits.count({ where: visitWhere })
      break

    case DATA_TYPES.MEDICATIONS:
    default:
      const ipMedWhere = {
        ...baseSearch,
        ...(startDate || endDate ? {
          AND: [
            ...(startDate ? [{ adm_date_time: { gte: new Date(startDate) } }] : []),
            ...(endDate ? [{ adm_date_time: { lte: new Date(endDate) } }] : [])
          ]
        } : {})
      }

      const opMedWhere = {
        ...baseSearch,
        ...(startDate || endDate ? {
          AND: [
            ...(startDate ? [{ visit_date: { gte: new Date(startDate) } }] : []),
            ...(endDate ? [{ visit_date: { lte: new Date(endDate) } }] : [])
          ]
        } : {})
      }

      const ipMeds = await prisma.ip_medications.findMany({
        where: ipMedWhere,
        include: {
          patients: {
            select: {
              first_name: true,
              last_name: true,
              birth_date: true
            }
          }
        },
        orderBy: { adm_date_time: 'desc' },
        skip,
        take: take / 2
      })

      const opMeds = await prisma.op_medications.findMany({
        where: opMedWhere,
        include: {
          patients: {
            select: {
              first_name: true,
              last_name: true,
              birth_date: true
            }
          }
        },
        orderBy: { visit_date: 'desc' },
        skip,
        take: take / 2
      })

      data = [
        ...ipMeds.map(med => ({
          id: Number(med.id),
          patient_mrn: med.patient_mrn,
          adm_date_time: med.adm_date_time,
          medication: med.medication || '',
          dosage: med.dosage,
          unit: med.unit,
          frequency: med.frequency,
          rx_class_name: med.rx_class_name,
          type: 'ip_medication' as const
        })),
        ...opMeds.map(med => ({
          id: Number(med.id),
          patient_mrn: med.patient_mrn,
          visit_date: med.visit_date,
          generic_description: med.generic_description,
          rx_status: med.rx_status,
          type: 'op_medication' as const
        }))
      ].sort((a, b) => {
        const dateA = a.type === 'ip_medication' ? a.adm_date_time : a.visit_date
        const dateB = b.type === 'ip_medication' ? b.adm_date_time : b.visit_date
        return dateB.getTime() - dateA.getTime()
      })

      totalCount = await prisma.$transaction([
        prisma.ip_medications.count({ where: ipMedWhere }),
        prisma.op_medications.count({ where: opMedWhere })
      ]).then(counts => counts.reduce((a, b) => a + b, 0))
      break
  }

  return { data, totalCount }
}

export default async function ClinicalPage({ searchParams }: PageProps) {
  // Safely get search params with proper typing - don't create URLSearchParams
  const page = Number(searchParams?.page) || 1
  const pageSize = Number(searchParams?.pageSize) || DEFAULT_PAGE_SIZE
  const type = (searchParams?.type as DataType) || DATA_TYPES.MEDICATIONS
  const search = searchParams?.search || undefined
  const startDate = searchParams?.startDate || undefined
  const endDate = searchParams?.endDate || undefined

  const { data, totalCount } = await getClinicalData(
    page,
    pageSize,
    search,
    type,
    startDate,
    endDate
  )

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clinical Data Browser</h1>
            <p className="mt-2 text-sm text-gray-600">
              View and filter clinical data from EPIC
            </p>
          </div>

          <ClinicalDataBrowser
            initialData={data}
            totalCount={totalCount}
            currentPage={page}
            pageSize={pageSize}
            initialType={type}
          />
        </div>
      </div>
    </DashboardLayout>
  )
} 