import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { VisitsViewer } from '@/components/visits/VisitsViewer'
import { notFound } from 'next/navigation'
import { getVisitDetailsByMrn } from '@/lib/prisma/operations'
import { patients, unified_visits } from '@prisma/client'
// Import the correct Decimal type from Prisma Runtime
import { Decimal } from '@prisma/client/runtime/library';

// Note: Role checking is now handled in middleware

// Page Props remain the same
type PageParams = {
  id: string; // Represents Patient MRN
};

type VisitPageProps = {
  params: Promise<PageParams> | undefined;
};

// Define structure received from the enhanced Prisma function
interface FetchedCombinedMedication {
  name: string;
  dosage?: string | null;
  unit?: string | null;
  frequency?: string | null;
  source: 'IP' | 'OP';
  taken_time?: Date | null; 
  order_dttm?: Date | null;
  rx_status?: string | null;
}

// Define structure expected by VisitsViewer component
interface MedicationForViewer {
  name: string;
  dosage?: string | null;
  unit?: string | null;
  frequency?: string | null;
  status?: string | null; // Corresponds to rx_status for OP meds?
  taken_time?: string | null; // Serialized date, prioritizing IP taken_time
}

// Define structure for detailed diagnosis data (matching operations.ts)
interface DetailedDiagnosis {
  code: string;
  description: string | null;
  type: 'admission' | 'final';
  sequence: number;
}

// Update structure expected by VisitsViewer
interface LabResultForViewer {
  name: string | null;
  value: string | null;
  time?: string | null; // Expect serialized date string
  test?: string | null;
}

// Update VisitViewerData type definition
interface VisitViewerData {
  patient: (Omit<patients, 'created_at' | 'updated_at'> & { 
      created_at: Date | null,
      updated_at: Date | null 
  }) | null; 
  visits: (Omit<unified_visits, 'icu_admission_yn' | 'weight_kg' | 'temperature_f'> & { 
      icu_admission_yn: boolean | null;
      weight_kg: number | null;
      temperature_f: number | null;
      vitals: { /* ... */ };
      diagnoses: { code: string; description: string }[];
      medications: MedicationForViewer[];
      labs: LabResultForViewer[]; // Use updated LabResultForViewer type
      samples?: { /* ... */ }[];
      detailed_diagnoses?: DetailedDiagnosis[];
  })[];
}

// Helper to convert Prisma Decimal to number or null
const toNumber = (val: Decimal | number | null | undefined): number | null => {
  // Use the imported Decimal type for the check
  if (val instanceof Decimal) {
    return val.toNumber();
  }
  // Handle cases where it might already be a number or null/undefined
  if (typeof val === 'number') {
      return val;
  }
  return null; // Default to null for other types or undefined/null
};

export default async function VisitsPage({ params }: VisitPageProps) {
  if (!params) {
    throw new Error('Missing page parameters');
  }
  const parameters = await params;
  const patientMrn = parameters.id; // The ID in the route is the MRN
  
  console.log(`Fetching visit details for MRN ${patientMrn} using Prisma...`);
  const patientData = await getVisitDetailsByMrn(patientMrn);
  
  if (!patientData) {
    console.log(`No data found for MRN ${patientMrn}. Rendering 404.`);
    notFound();
  }

  const viewerData: VisitViewerData = {
    patient: patientData ? {
      ...patientData,
    } : null,
    visits: (patientData.unified_visits || []).map(visit => { 
      const isICU = visit.icu_admission_yn === 'Y' ? true : visit.icu_admission_yn === 'N' ? false : null;
      
      // Map fetched medications to the structure expected by VisitsViewer
      const processedMedications: MedicationForViewer[] = 
        (visit.medications || []).map((med: FetchedCombinedMedication) => ({
          name: med.name,
          dosage: med.dosage,
          unit: med.unit,
          frequency: med.frequency,
          // Map rx_status to status for OP meds
          status: med.source === 'OP' ? med.rx_status : undefined, 
          // Prioritize IP taken_time, serialize
          taken_time: (med.source === 'IP' ? med.taken_time : med.order_dttm)?.toISOString() ?? null, 
      }));

      // Determine which diagnoses to use
      let finalDiagnoses: { code: string; description: string }[];
      if (visit.detailed_diagnoses && visit.detailed_diagnoses.length > 0) {
          // Use detailed diagnoses if available
          finalDiagnoses = visit.detailed_diagnoses.map(d => ({
              code: d.code,
              description: `${d.description || 'N/A'} (${d.type} #${d.sequence})` // Add type/sequence info
          }));
      } else {
          // Fallback to unified diagnoses
          finalDiagnoses = [
              ...(visit.admit_dx_cd ? [{ code: visit.admit_dx_cd, description: visit.admit_dx_description || 'N/A' }] : []),
              ...(visit.final_dx_cd ? [{ code: visit.final_dx_cd, description: visit.final_dx_description || 'N/A' }] : []),
          ].filter((diag, index, self) => index === self.findIndex((d) => (d.code === diag.code)));
      }
      
      // Map and serialize labs
      const processedLabs: LabResultForViewer[] = 
        (visit.labs || []).map(lab => ({
          ...lab,
          time: lab.time?.toISOString() ?? null, // Serialize the date
        }));
      
      return {
        ...visit,
        icu_admission_yn: isICU,
        weight_kg: toNumber(visit.weight_kg),
        temperature_f: toNumber(visit.temperature_f),
        vitals: { 
            bp_systolic: toNumber(visit.bp_systolic),
            bp_diastolic: toNumber(visit.bp_diastolic),
            weight_kg: toNumber(visit.weight_kg),
            weight_lbs: null // Placeholder - needs conversion/fetch later
        },
        diagnoses: finalDiagnoses, // Assign the determined diagnoses list
        medications: processedMedications,
        labs: processedLabs, // Assign processed labs
        samples: []
      };
    })
  };

  return (
    <DashboardLayout>
      <VisitsViewer 
        patientMrn={patientMrn} 
        data={viewerData}
      />
    </DashboardLayout>
  );
} 