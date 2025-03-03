import { prisma } from '@/db'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { VisitsViewer } from '@/components/visits/VisitsViewer'
import type { Visit } from '@/components/visits/VisitsViewer'
import { convertToNumber } from '@/lib/utils'
import { notFound } from 'next/navigation'

interface VitalsResult {
  bp_systolic: number | null
  bp_diastolic: number | null
  weight_kg: number | null
  weight_lbs: number | null
}

interface DiagnosisResult {
  diagnoses: {
    admit_dx: string
    final_dx: string
    admit_desc: string
    final_desc: string
  }
}

interface MedicationResult {
  medication_data: {
    id: number
    medication: string
    dosage?: string
    unit?: string
    frequency?: string
    taken_time?: string
    order_time?: string
    status?: string
    source: 'ip' | 'op'
  }
}

interface LabResult {
  lab_component_description: string
  lab_result_value: string
  result_time: Date
  proc_name: string
}

async function getVisitData(patientMrn: string) {
  // Get patient information
  const patient = await prisma.patients.findUnique({
    where: { patient_mrn: patientMrn },
    select: {
      first_name: true,
      last_name: true,
      birth_date: true,
      sex: true,
      race: true,
      ethnicity: true
    }
  })

  if (!patient) {
    return null
  }

  // Get visits with raw SQL
  const visits = await prisma.$queryRaw<Array<{
    id: string
    visit_id: string
    visit_type: string
    start_date: Date
    end_date: Date | null
    department: string | null
    icu_admission_yn: string | null
  }>>`
    SELECT id, visit_id, visit_type, start_date, end_date, department, icu_admission_yn
    FROM clinical.unified_visits
    WHERE patient_mrn = ${patientMrn}
    ORDER BY start_date DESC
  `

  // Get associated data for each visit
  const visitsWithDetails = await Promise.all(
    visits.map(async (visit) => {
      // Get vitals
      const vitalsResult = await prisma.$queryRaw<VitalsResult[]>`
        SELECT * FROM clinical.visit_vitals_view WHERE visit_id = ${visit.id}
      `
      const vitals = vitalsResult[0] || {
        bp_systolic: null,
        bp_diastolic: null,
        weight_kg: null,
        weight_lbs: null
      }

      // Get diagnoses
      const diagnosesResult = await prisma.$queryRaw<DiagnosisResult[]>`
        SELECT * FROM clinical.visit_diagnoses_view WHERE visit_id = ${visit.id}
      `
      const diagnoses = diagnosesResult.map(d => [
        { code: d.diagnoses.admit_dx, description: d.diagnoses.admit_desc },
        { code: d.diagnoses.final_dx, description: d.diagnoses.final_desc }
      ]).flat().filter((d, i, arr) => 
        // Remove duplicates and null values
        d.code && d.description && arr.findIndex(x => x.code === d.code) === i
      )

      // Get medications
      const medicationsResult = await prisma.$queryRaw<MedicationResult[]>`
        SELECT * FROM clinical.visit_associated_medications WHERE visit_id = ${visit.id}
      `
      const medications = medicationsResult.map(m => ({
        name: m.medication_data.medication,
        dosage: m.medication_data.dosage,
        unit: m.medication_data.unit,
        frequency: m.medication_data.frequency,
        status: m.medication_data.source === 'op' ? m.medication_data.status : undefined,
        taken_time: m.medication_data.source === 'ip' ? m.medication_data.taken_time : undefined
      }))

      // Get labs
      const labsResult = await prisma.$queryRaw<LabResult[]>`
        SELECT * FROM clinical.visit_associated_labs WHERE visit_id = ${visit.id}
      `
      const labs = (labsResult || []).map(lab => ({
        name: lab.lab_component_description,
        value: lab.lab_result_value,
        unit: '',  // We'll extract this from the description if needed later
        reference_range: undefined,
        date: lab.result_time
      }))

      // Get OMICs samples collected during the visit
      const omicsSamplesResult = await prisma.omics_results.findMany({
        where: {
          omics_subjects: {
            patient_mrn: patientMrn
          },
          date_of_collection: {
            gte: visit.start_date,
            lte: visit.end_date || visit.start_date
          }
        },
        select: {
          sample_id: true,
          date_of_collection: true,
          genotype: true,
          steady_state: true,
          transfusion_status: true,
          hb_advia: true,
          hct_advia: true,
          wbc_advia: true,
          plt_advia: true,
          percent_f_cells: true
        }
      })

      const omics_samples = omicsSamplesResult.map(sample => ({
        sample_id: sample.sample_id,
        date_of_collection: sample.date_of_collection!,
        sample_type: 'Blood', // Default to blood for now, can be expanded later
        genotype: sample.genotype,
        steady_state: sample.steady_state,
        transfusion_status: sample.transfusion_status,
        lab_values: {
          hb: sample.hb_advia ? Number(sample.hb_advia) : null,
          hct: sample.hct_advia ? Number(sample.hct_advia) : null,
          wbc: sample.wbc_advia ? Number(sample.wbc_advia) : null,
          plt: sample.plt_advia ? Number(sample.plt_advia) : null,
          f_cells: sample.percent_f_cells ? Number(sample.percent_f_cells) : null
        }
      }))

      const visitData: Visit = {
        id: visit.id,
        visit_id: visit.visit_id,
        visit_type: visit.visit_type,
        start_date: visit.start_date,
        end_date: visit.end_date,
        department: visit.department,
        icu_admission_yn: visit.icu_admission_yn?.toUpperCase() === 'YES',
        vitals,
        diagnoses,
        medications,
        labs,
        omics_samples
      }

      return visitData
    })
  )

  return {
    patientInfo: {
      first_name: patient.first_name,
      last_name: patient.last_name,
      birth_date: patient.birth_date,
      sex: patient.sex,
      race: patient.race,
      ethnicity: patient.ethnicity
    },
    visits: convertToNumber(visitsWithDetails)
  }
}

interface PageProps {
  params: {
    id: string
  }
}

export default async function VisitsPage({ params }: PageProps) {
  const data = await getVisitData(params.id)

  if (!data) {
    notFound()
  }

  return (
    <DashboardLayout>
      <VisitsViewer
        visits={data.visits}
        patientInfo={data.patientInfo}
      />
    </DashboardLayout>
  )
} 