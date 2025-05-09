import { DashboardLayout } from '@/components/layout/DashboardLayout'
// Import VisitsViewer and its internal Visit type (which is what it expects for its `data.visits` prop)
import { VisitsViewer, type Visit as VisitForViewerInternal } from '@/components/visits/VisitsViewer'
import { notFound } from 'next/navigation'
import { getPatientTimelineData, getLabResultsForOrders } from '@/lib/db/queries'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import type { UserRole } from '@/lib/definitions'
import type {
    visitsInClinical as DrizzleVisitTable, // For typing drizzleVisit below
    patientsInClinical as DrizzlePatientTable, 
    lab_ordersInClinical as DrizzleLabOrderTable, // For typing labOrder
    medication_ordersInClinical as DrizzleMedicationOrderTable, // For typing med
    visit_diagnosesInClinical as DrizzleDiagnosisTable, // For typing diag
    samplesInLaboratory as DrizzleSampleTable, 
    lab_resultsInClinical as DrizzleLabResultTable 
} from '@/lib/db/schema'
import { formatDate } from '@/lib/db/queries'

// Note: Role checking is now handled in middleware

// Page Props remain the same
type PageParams = {
  id: string; // Represents Patient MRN
};

type VisitPageProps = {
  params: {
    id: string; // Represents Patient MRN
  };
};

// Define the Patient type expected by VisitsViewer locally
interface PatientForViewer {
  first_name: string | null;
  last_name: string | null;
  birth_date: Date | null;
  sex: string | null;
  race: string | null;
  ethnicity: string | null;
}

// --- Local Type Definitions to match VisitsViewer.tsx internal types ---

// Matches structure for diagnoses array within VisitForViewerInternal
interface DiagnosisForInternalVisit {
  code: string;
  description: string;
};

// Matches structure for medications array within VisitForViewerInternal
interface MedicationForInternalVisit {
  name: string;
  dosage?: string;
  unit?: string | null | undefined;
  frequency?: string | null | undefined;
  status?: string | null | undefined;
  taken_time?: string | null | undefined;
};

// Matches structure for labs array within VisitForViewerInternal
interface LabResultForInternalVisit {
    name: string;         // Component name (e.g., Hemoglobin)
    value: string;        // Result value
    groupName?: string;   // Group/Panel name (e.g., CBC WITH DIFFERENTIAL)
    time?: string | null | undefined;        // Allow null from formatDate
    test?: string;        // Original order type/test name
};

// Matches structure for samples array within VisitForViewerInternal (used to generate OMICS sample timeline events)
interface SampleForInternalVisit {
    sample_id: string;
    subject_id: string; // Or other relevant fields like sample_type
    collection_date: string; // VisitsViewer expects string here, then parses to Date
    rbc?: number | null; 
    hb?: number | null;
    hct?: number | null;
    mcv?: number | null;
    rdw?: number | null;
    plt?: number | null;
    wbc?: number | null;
    genotype?: string | null;
    steady_state?: string | null;
    transfusion_status?: string | null;
}

// Overall data structure passed to VisitsViewer's `data` prop
interface VisitViewerPageData {
  patient: PatientForViewer | null;
  visits: VisitForViewerInternal[]; 
}

// Helper to convert Drizzle numeric string/null to number/null
const toNumber = (val: string | number | null | undefined): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

export const dynamic = 'force-dynamic';

// --- Index constants for parsing array data from json_build_array ---
// Based on the query structure: json_agg(json_build_array(...))

// Lab Orders: order_id, visit_id, patient_mrn, order_type, accession_num, lab_code, lab_name, order_time, result_time (lab_order.result_time), collection_time, ...
const LO_ORDER_ID_IDX = 0;
// const LO_VISIT_ID_IDX = 1;
// const LO_PATIENT_MRN_IDX = 2;
const LO_ORDER_TYPE_IDX = 3; // e.g. "CBC, PLAT, WBC DIFF"
// const LO_ACCESSION_NUM_IDX = 4;
// const LO_LAB_CODE_IDX = 5;
const LO_LAB_NAME_IDX = 6; // e.g. "CHEM 14, METABOLIC PANEL" (Panel Name)
const LO_ORDER_TIME_IDX = 7;
// const LO_RESULT_TIME_ON_ORDER_IDX = 8; // result_time on the lab_order table itself
// const LO_COLLECTION_TIME_IDX = 9;

// Medication Orders: medication_order_id, epic_order_med_id, visit_id, patient_mrn, medication_name, order_time, status, dose, units, route, frequency, ...
// const MO_MED_ORDER_ID_IDX = 0;
// const MO_EPIC_ORDER_MED_ID_IDX = 1;
// const MO_VISIT_ID_IDX = 2;
// const MO_PATIENT_MRN_IDX = 3;
const MO_MED_NAME_IDX = 4;
const MO_ORDER_TIME_IDX = 5;
const MO_STATUS_IDX = 6;
const MO_DOSE_IDX = 7;
const MO_UNITS_IDX = 8;
// const MO_ROUTE_IDX = 9;
const MO_FREQUENCY_IDX = 10;

// Visit Diagnoses: id, visit_id, diagnosis_type, icd10_code, diagnosis_name, sequence_num, ...
// const DX_ID_IDX = 0;
// const DX_VISIT_ID_IDX = 1;
// const DX_DIAGNOSIS_TYPE_IDX = 2;
const DX_ICD10_CODE_IDX = 3;
const DX_DIAGNOSIS_NAME_IDX = 4;
// const DX_SEQUENCE_NUM_IDX = 5;


export default async function VisitsPage({ params }: VisitPageProps) {
  const session = await auth();
  const userRole = session?.user?.role as UserRole | undefined;

  if (userRole !== 'admin' && userRole !== 'viewer') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Access Denied</h1>
          <p className="text-gray-500 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  console.log('[VisitsPage] Received params at start:', JSON.stringify(params)); 
  if (!params || !params.id) { // Check params.id as well
    console.error('[VisitsPage] Critical Error: Missing params or params.id. Params:', JSON.stringify(params));
    notFound(); // Use notFound for critical missing params
  }
  const patientMrn = params.id; 
  
  console.log(`Fetching Drizzle timeline data (with details) for MRN ${patientMrn}...`);
  // timelineData structure from getPatientTimelineData:
  // patient: Patient object or null
  // visits: Array of visit objects, where each visit has:
  //   ...visit_fields
  //   lab_ordersInClinicals: any[] (expected to be array of arrays)
  //   medication_ordersInClinicals: any[] (expected to be array of arrays)
  //   visit_diagnosesInClinicals: any[] (expected to be array of arrays)
  // samples: Array of DrizzleSampleTable.$inferSelect (omics samples for the patient)
  const timelineData = await getPatientTimelineData(patientMrn);
  
  if (!timelineData || !timelineData.patient) {
    console.log(`No patient data found for MRN ${patientMrn}. Rendering 404.`);
    notFound();
  }

  // --- Fetch Lab Results Separately ---
  const labOrderIds: string[] = [];
  (timelineData.visits || []).forEach(visit => {
    // Assuming visit.lab_ordersInClinicals is an array of objects now
    if (visit.lab_ordersInClinicals && Array.isArray(visit.lab_ordersInClinicals)) {
        visit.lab_ordersInClinicals.forEach((labOrder: any) => { // Changed labOrderArray to labOrder
            if (labOrder && typeof labOrder === 'object' && labOrder.order_id) { // Check for object and order_id property
                const orderId = labOrder.order_id as string;
                labOrderIds.push(orderId);
            } else {
                console.warn("[VisitsPage] Lab order item is not a valid object or missing order_id:", labOrder);
            }
        });
    }
  });
  const uniqueLabOrderIds = [...new Set(labOrderIds)];
  const labResultsData = await getLabResultsForOrders(uniqueLabOrderIds);
  const labResultsMap = new Map<string, (typeof DrizzleLabResultTable.$inferSelect)[]>();
  labResultsData.forEach(result => {
    const currentResults = labResultsMap.get(result.order_id);
    if (currentResults) {
      currentResults.push(result);
    } else {
      labResultsMap.set(result.order_id, [result]);
    }
  });
  // --- End Fetching Lab Results ---

  const patientForViewer: PatientForViewer | null = timelineData.patient ? {
      first_name: timelineData.patient.first_name,
      last_name: timelineData.patient.last_name,
      birth_date: timelineData.patient.birth_date ? new Date(timelineData.patient.birth_date) : null,
      sex: timelineData.patient.sex,
      race: timelineData.patient.race,
      ethnicity: timelineData.patient.ethnicity,
  } : null;

  // Map clinical visits
  const clinicalVisitsForPage: VisitForViewerInternal[] = (timelineData.visits || []).map((drizzleVisitWithRelations: any) => {
    const drizzleVisit = drizzleVisitWithRelations as (typeof DrizzleVisitTable.$inferSelect & {
        lab_ordersInClinicals: (typeof DrizzleLabOrderTable.$inferSelect)[],
        medication_ordersInClinicals: (typeof DrizzleMedicationOrderTable.$inferSelect)[],
        visit_diagnosesInClinicals: (typeof DrizzleDiagnosisTable.$inferSelect)[]
    });
    console.log(`[VisitsPage Clinical Map] Processing Visit ID: ${drizzleVisit.visit_id}`);

    const startDate = drizzleVisit.visit_start_datetime ? new Date(drizzleVisit.visit_start_datetime) : new Date();
    const endDate = drizzleVisit.visit_end_datetime ? new Date(drizzleVisit.visit_end_datetime) : null;

    const diagnoses: DiagnosisForInternalVisit[] =
        (drizzleVisit.visit_diagnosesInClinicals || []).map((diag: typeof DrizzleDiagnosisTable.$inferSelect) => {
            return {
                code: diag.icd10_code || 'Unknown Code',
                description: diag.diagnosis_name || 'No Description'
            };
    });

    const medications: MedicationForInternalVisit[] =
        (drizzleVisit.medication_ordersInClinicals || []).map((med: typeof DrizzleMedicationOrderTable.$inferSelect) => {
            const orderTimeStr = med.order_time as string | null; // Assuming med.order_time is the correct field
            const orderTimeDate = orderTimeStr ? new Date(orderTimeStr) : null;
            const formattedTakenTime = orderTimeDate ? formatDate(orderTimeDate) : null;
            return {
                name: med.medication_name || 'Unknown Drug',
                dosage: med.dose?.toString(),
                unit: med.units,
                frequency: med.frequency,
                status: med.status,
                taken_time: formattedTakenTime,
            };
    });

    const labs: LabResultForInternalVisit[] =
        (drizzleVisit.lab_ordersInClinicals || []).flatMap((labOrder: typeof DrizzleLabOrderTable.$inferSelect) => {
            const order_id = labOrder.order_id as string; // Direct property access
            const order_type = labOrder.order_type as string; // Direct property access
            const panel_name = labOrder.lab_name as string; // Direct property access
            const order_time_str = labOrder.order_time as string | null; // Direct property access

            // console.log(`  [Visit ${drizzleVisit.visit_id}] Processing Lab Order (Object): ID ${order_id}, Panel: ${panel_name}, Type: ${order_type}`);
            
            const resultsForOrder = labResultsMap.get(order_id);
            const groupName = panel_name || order_type; // Prefer panel_name for grouping

            if (!resultsForOrder || resultsForOrder.length === 0) {
                // console.log(`    [Visit ${drizzleVisit.visit_id}] No results for Order ID: ${order_id}. Creating placeholder.`);
                return [{
                    name: order_type || 'Unknown Test Order',
                    value: 'N/A',
                    groupName: groupName || 'Unknown Group',
                    time: order_time_str ? formatDate(new Date(order_time_str)) : undefined,
                    test: order_type
                }];
            }
            return resultsForOrder.map((result: typeof DrizzleLabResultTable.$inferSelect) => {
                // console.log(`      [Visit ${drizzleVisit.visit_id} / Order ${order_id}] Mapping Result: ${result.component_name}=${result.result_value} @ ${result.result_time}`);
                const resultTimeDate = result.result_time ? new Date(result.result_time) : null;
                const formattedResultTime = resultTimeDate ? formatDate(resultTimeDate) : null;

                const labOrderTimeDate = order_time_str ? new Date(order_time_str) : null;
                const formattedLabOrderTime = labOrderTimeDate ? formatDate(labOrderTimeDate) : null;

                const tempFinalTime = formattedResultTime !== null ? formattedResultTime : formattedLabOrderTime;
                const finalTime = tempFinalTime === null ? undefined : tempFinalTime;

                return {
                    name: result.component_name || 'Unknown Component',
                    value: result.result_value || 'N/A',
                    groupName: groupName || 'Unknown Group',
                    time: finalTime,
                    test: order_type
                };
            });
        });

    labs.sort((a, b) => {
        const groupCompare = (a.groupName || '').localeCompare(b.groupName || '');
        if (groupCompare !== 0) return groupCompare;
        return (a.name || '').localeCompare(b.name || '');
    });

    return {
      id: drizzleVisit.visit_id,
      visit_id: drizzleVisit.visit_id,
      visit_type: drizzleVisit.visit_type || 'Unknown',
      start_date: startDate,
      end_date: endDate,
      department: drizzleVisit.department_name,
      icu_admission_yn: drizzleVisit.icu_admission ?? null,
      vitals: {
        bp_systolic: toNumber(drizzleVisit.bp_systolic),
        bp_diastolic: toNumber(drizzleVisit.bp_diastolic),
        weight_kg: toNumber(drizzleVisit.weight_kg),
        weight_lbs: null,
      },
      diagnoses: diagnoses,
      medications: medications,
      labs: labs,
      samples: [], // OMICS samples will be added as separate "visit" events
    } as VisitForViewerInternal;
  });

  // Map OMICS samples to VisitForViewerInternal "pseudo-visit" events
  const omicsSampleEvents: VisitForViewerInternal[] = (timelineData.samples || []).map((drizzleSample: typeof DrizzleSampleTable.$inferSelect) => {
    const collectionDateStr = drizzleSample.date_of_collection;
    if (!collectionDateStr) {
        console.warn(`[OMICS Map] Sample ID ${drizzleSample.sample_id} has no collection date. Skipping.`);
        return null; 
    }
    const collectionDate = new Date(collectionDateStr);
    if (isNaN(collectionDate.getTime())) {
        console.warn(`[OMICS Map] Sample ID ${drizzleSample.sample_id} has invalid collection date: ${collectionDateStr}. Skipping.`);
        return null;
    }

    const sampleForViewer: SampleForInternalVisit = {
        sample_id: drizzleSample.sample_id,
        subject_id: drizzleSample.subject_id || 'N/A',
        collection_date: collectionDate.toISOString(), // VisitsViewer expects ISO string
        genotype: drizzleSample.genotype,
        steady_state: drizzleSample.steady_state,
        transfusion_status: drizzleSample.transfusion_status,
        // Advia results (rbc, hb, etc.) are not fetched here, default to null
        rbc: null, hb: null, hct: null, mcv: null, rdw: null, plt: null, wbc: null,
    };
    
    console.log(`[OMICS Map] Creating OMICS event for Sample ID: ${sampleForViewer.sample_id}, Date: ${sampleForViewer.collection_date}`);

    return {
        id: `omics_${drizzleSample.sample_id}`, // Unique ID for this event type
        visit_id: `omics_${drizzleSample.sample_id}`, // Can be same as id
        visit_type: 'OMICS Sample', // Special type for the timeline viewer to recognize
        start_date: collectionDate,
        end_date: collectionDate, // Point in time event
        department: 'Research Laboratory', // Or some other relevant descriptor
        samples: [sampleForViewer], // Array containing the single sample
        // Fill with empty/null for other VisitForViewerInternal fields
        icu_admission_yn: null,
        vitals: { // Provide nulls for all VitalSigns fields
            bp_systolic: null,
            bp_diastolic: null,
            weight_kg: null,
            weight_lbs: null,
        },
        diagnoses: [],
        medications: [],
        labs: [],
    } as VisitForViewerInternal;
  }).filter(event => event !== null) as VisitForViewerInternal[]; // Filter out any nulls from skipped samples

  // Combine clinical visits and OMICS sample events
  const allEventsForViewer = [...clinicalVisitsForPage, ...omicsSampleEvents];

  // Sort all events by start_date in descending order (most recent first)
  allEventsForViewer.sort((a, b) => {
    const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
    const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
    return dateB - dateA;
  });

  const viewerPageData: VisitViewerPageData = {
    patient: patientForViewer,
    visits: allEventsForViewer, // Use the combined and sorted array
  };
  
  console.log(`[VisitsPage] Prepared ${viewerPageData.visits.length} total timeline events for MRN ${patientMrn}.`);

  return (
    <DashboardLayout>
      <VisitsViewer
        patientMrn={patientMrn}
        data={viewerPageData}
      />
    </DashboardLayout>
  );
} 