import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { prisma } from '@/db'
import { ClinicalDataBrowser } from '@/components/clinical/ClinicalDataBrowser'
import { createClient } from '@supabase/supabase-js'

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
  
  const supabase = createClient()
  let data: any[] = []
  let totalCount = 0
  
  // Build base search filter
  const baseSearch = search ? {
    patient_mrn: { ilike: `%${search}%` }
  } : {}
  
  switch (type) {
    case DATA_TYPES.OP_VISITS:
      // Build visit query filters
      let visitQuery = supabase
        .from('op_visits')
        .select(`
          *,
          patients (
            first_name,
            last_name,
            birth_date
          )
        `, { count: 'exact' })
        
      if (search) {
        visitQuery = visitQuery.ilike('patient_mrn', `%${search}%`)
      }
      
      if (startDate) {
        visitQuery = visitQuery.gte('visit_date', startDate)
      }
      
      if (endDate) {
        visitQuery = visitQuery.lte('visit_date', endDate)
      }
      
      // Execute query with pagination
      const { data: visits, count, error: visitError } = await visitQuery
        .order('visit_date', { ascending: false })
        .range(skip, skip + take - 1)
      
      if (visitError) throw visitError
      
      data = (visits || []).map(visit => ({
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
      
      totalCount = count || 0
      break
      
    case DATA_TYPES.MEDICATIONS:
    default:
      // Build medication queries
      let ipMedQuery = supabase
        .from('ip_medications')
        .select(`
          *,
          patients (
            first_name,
            last_name,
            birth_date
          )
        `, { count: 'exact' })
        
      let opMedQuery = supabase
        .from('op_medications')
        .select(`
          *,
          patients (
            first_name,
            last_name,
            birth_date
          )
        `, { count: 'exact' })
        
      if (search) {
        ipMedQuery = ipMedQuery.ilike('patient_mrn', `%${search}%`)
        opMedQuery = opMedQuery.ilike('patient_mrn', `%${search}%`)
      }
      
      if (startDate) {
        ipMedQuery = ipMedQuery.gte('adm_date_time', startDate)
        opMedQuery = opMedQuery.gte('visit_date', startDate)
      }
      
      if (endDate) {
        ipMedQuery = ipMedQuery.lte('adm_date_time', endDate)
        opMedQuery = opMedQuery.lte('visit_date', endDate)
      }
      
      // Execute both queries with pagination
      const [ipMedResult, opMedResult] = await Promise.all([
        ipMedQuery
          .order('adm_date_time', { ascending: false })
          .range(skip, skip + Math.floor(take/2) - 1),
        opMedQuery
          .order('visit_date', { ascending: false })
          .range(skip, skip + Math.floor(take/2) - 1)
      ])
      
      if (ipMedResult.error) throw ipMedResult.error
      if (opMedResult.error) throw opMedResult.error
      
      // Combine and format results
      const ipMeds = (ipMedResult.data || []).map(med => ({
        id: Number(med.id),
        patient_mrn: med.patient_mrn,
        date: med.adm_date_time,
        medication: med.medication,
        dosage: med.dosage,
        unit: med.unit,
        frequency: med.frequency,
        type: 'inpatient' as const
      }))
      
      const opMeds = (opMedResult.data || []).map(med => ({
        id: Number(med.id),
        patient_mrn: med.patient_mrn,
        date: med.visit_date,
        medication: med.generic_description || '',
        status: med.rx_status,
        type: 'outpatient' as const
      }))
      
      data = [...ipMeds, ...opMeds].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      
      totalCount = (ipMedResult.count || 0) + (opMedResult.count || 0)
      break
  }
  
  return {
    data,
    totalCount
  }
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