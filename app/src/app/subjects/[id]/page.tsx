// For now, let's make it a server component first and adapt if client-side hooks are essential for basic display.
// UPDATE: Making it a server component as primary data fetching occurs here.

import { notFound } from 'next/navigation'
import { getSubjectDetailsWithSamples, getPatientTimelineData, getLabResultsForOrders, SubjectDetailsPageData, PatientTimelineData, Patient as DrizzlePatient, VisitForListView as DrizzleVisitForTimeline, SubjectSampleListItem } from '@/lib/db/queries'
import { auth } from '@/app/api/auth/[...nextauth]/route' // Import the configured auth
import { VisitsViewer, Visit as VisitForViewer, Patient as PatientForViewer } from '@/components/visits/VisitsViewer'
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { format as formatDateFn } from 'date-fns'
import type { UserRole } from '@/lib/definitions' // Import UserRole if not already there

// Re-import or redefine Drizzle-based types for clarity if needed, or use from queries
import type { samplesInLaboratory as DrizzleSample } from '@/lib/db/schema'
import type { lab_ordersInClinical as lab_orders_table } from '@/lib/db/schema'
import type { medication_ordersInClinical as medication_orders_table } from '@/lib/db/schema'
import type { visit_diagnosesInClinical as visit_diagnoses_table } from '@/lib/db/schema'
import type { lab_resultsInClinical as lab_results_table } from '@/lib/db/schema'

// Updated page props for Next.js
type SubjectPageProps = {
  params: { id: string }; // Standard params object
};

// Helper function to serialize Decimal fields in an object
// const serializeDecimals = (obj: any) => {
//   if (!obj) return null;
//   const newObj = { ...obj };
//   for (const key in newObj) {
//     if (newObj[key] instanceof Decimal) {
//       newObj[key] = newObj[key].toString();
//     }
//   }
//   return newObj;
// };

// Helper function to serialize Date fields in an object
const serializeDates = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj; // Return non-objects as is
  
  // Handle arrays recursively
  if (Array.isArray(obj)) {
    return obj.map(item => serializeDates(item));
  }

  const newObj = { ...obj };
  for (const key in newObj) {
    if (newObj[key] instanceof Date) {
      newObj[key] = newObj[key].toISOString();
    } else if (typeof newObj[key] === 'object') {
        // Recursively serialize nested objects/arrays
        newObj[key] = serializeDates(newObj[key]); 
    }
  }
  return newObj;
};

// Helper to format dates consistently
const formatDateDisplay = (dateInput: Date | string | null | undefined): string => {
    if (!dateInput) return 'N/A';
    try {
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(date.getTime())) return 'Invalid Date';
        return formatDateFn(date, 'MMM d, yyyy HH:mm');
    } catch (e) {
        console.error("Error formatting date:", dateInput, e);
        return 'Invalid Date';
    }
};

// Helper function for same-day check
const areDatesOnSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

// Helper to convert Drizzle patient type to VisitsViewer patient type
const transformPatientForViewer = (drizzlePatient: DrizzlePatient | null): PatientForViewer | null => {
    if (!drizzlePatient) return null;
    return {
        first_name: drizzlePatient.first_name,
        last_name: drizzlePatient.last_name,
        birth_date: drizzlePatient.birth_date ? new Date(drizzlePatient.birth_date) : null,
        sex: drizzlePatient.sex,
        race: drizzlePatient.race,
        ethnicity: drizzlePatient.ethnicity,
    };
};

// Helper to transform Drizzle timeline data to VisitsViewer data structure
const transformTimelineDataForViewer = async (timelineData: PatientTimelineData | null): Promise<{ patient: PatientForViewer | null; visits: VisitForViewer[]; } | null> => {
    if (!timelineData || !timelineData.visits) return null;
    
    const transformedPatient = transformPatientForViewer(timelineData.patient);

    // --- Fetch Lab Results Separately (similar to visits/[id]/page.tsx) ---
    const labOrderIds: string[] = [];
    timelineData.visits.forEach(visit => {
        (visit.lab_ordersInClinicals || []).forEach(labOrder => {
            if (labOrder?.order_id) { 
                labOrderIds.push(labOrder.order_id);
            }
        });
    });
    const uniqueLabOrderIds = [...new Set(labOrderIds)];
    let labResultsMap = new Map<string, (typeof lab_results_table.$inferSelect)[]>();
    if (uniqueLabOrderIds.length > 0) {
        const labResultsData = await getLabResultsForOrders(uniqueLabOrderIds);
        labResultsData.forEach(result => {
            const currentResults = labResultsMap.get(result.order_id);
            if (currentResults) {
                currentResults.push(result);
            } else {
                labResultsMap.set(result.order_id, [result]);
            }
        });
    }
    // --- End Fetching Lab Results ---

    const transformedVisits = (timelineData.visits || []).map(visit => {
        // Map labs using the fetched results map
        const labs: VisitForViewer['labs'] = 
            (visit.lab_ordersInClinicals || []).flatMap((labOrder: typeof lab_orders_table.$inferSelect) => {
                const order_id = labOrder.order_id;
                const order_type = labOrder.order_type;
                const panel_name = labOrder.lab_name;
                const order_time_str = labOrder.order_time;
                
                const resultsForOrder = labResultsMap.get(order_id);
                const groupName = panel_name || order_type || 'Miscellaneous';

                if (!resultsForOrder || resultsForOrder.length === 0) {
                    return [{
                        name: order_type || 'Unknown Test Order',
                        value: 'N/A',
                        groupName: groupName,
                        time: order_time_str ? formatDateDisplay(new Date(order_time_str)) : undefined,
                        test: order_type
                    }];
                }
                return resultsForOrder.map((result: typeof lab_results_table.$inferSelect) => {
                    const resultTimeDate = result.result_time ? new Date(result.result_time) : null;
                    const formattedResultTime = resultTimeDate ? formatDateDisplay(resultTimeDate) : null;
                    const labOrderTimeDate = order_time_str ? new Date(order_time_str) : null;
                    const formattedLabOrderTime = labOrderTimeDate ? formatDateDisplay(labOrderTimeDate) : null;
                    const finalTime = formattedResultTime ?? formattedLabOrderTime; // string | null
                    const finalTimeForViewer = finalTime === null ? undefined : finalTime; // Convert null to undefined

                    return {
                        name: result.component_name || 'Unknown Component',
                        value: result.result_value || 'N/A',
                        groupName: groupName,
                        time: finalTimeForViewer, // Use the undefined version
                        test: order_type
                    };
                });
            });
        
        // Sort labs within the visit
        labs.sort((a, b) => {
            const groupCompare = (a.groupName || '').localeCompare(b.groupName || '');
            if (groupCompare !== 0) return groupCompare;
            return (a.name || '').localeCompare(b.name || '');
        });

        return {
            // Map fields required by VisitForViewer
            id: visit.visit_id,
            visit_id: visit.visit_id,
            visit_type: visit.visit_type || 'Unknown',
            start_date: visit.visit_start_datetime ? new Date(visit.visit_start_datetime) : new Date(),
            end_date: visit.visit_end_datetime ? new Date(visit.visit_end_datetime) : null,
            department: visit.department_name, // Map from department_name
            icu_admission_yn: visit.icu_admission, // Map from icu_admission
            vitals: {
                bp_systolic: visit.bp_systolic ? Number(visit.bp_systolic) : null,
                bp_diastolic: visit.bp_diastolic ? Number(visit.bp_diastolic) : null,
                weight_kg: visit.weight_kg ? Number(visit.weight_kg) : null,
                weight_lbs: null, // VisitsViewer defines this, but data source might not have it
            },
            diagnoses: (visit.visit_diagnosesInClinicals || []).map((diag: typeof visit_diagnoses_table.$inferSelect) => ({
                code: diag.icd10_code || 'N/A',
                description: diag.diagnosis_name || 'N/A'
            })),
            medications: (visit.medication_ordersInClinicals || []).map((med: typeof medication_orders_table.$inferSelect) => {
                const orderTimeDate = med.order_time ? new Date(med.order_time) : null;
                const formattedTakenTime = orderTimeDate ? formatDateDisplay(orderTimeDate) : null;
                return {
                    name: med.medication_name || 'Unknown Drug',
                    dosage: med.dose?.toString(),
                    unit: med.units,
                    frequency: med.frequency,
                    status: med.status,
                    taken_time: formattedTakenTime,
                };
            }),
            labs: labs,
            samples: [] // OMICS Samples are handled separately on the subject page, not attached to clinical visits here
        } as VisitForViewer; // Cast to ensure compatibility 
    });

    // Exclude OMICS sample pseudo-events if they were included in PatientTimelineData
    // (Assuming PatientTimelineData structure aligns with visits/[id]/page.tsx output)
    const clinicalVisitsOnly = transformedVisits.filter(v => v.visit_type !== 'OMICS Sample');

    return {
        patient: transformedPatient,
        visits: clinicalVisitsOnly,
    };
};

export default async function SubjectPage({ params }: SubjectPageProps) {
  const subjectId = params.id; // Direct access to id

  if (!subjectId) {
    console.error("Subject ID is missing from params");
    notFound();
  }
  
  // Use the Drizzle function
  const subjectPageDataResult = await getSubjectDetailsWithSamples(subjectId);
  
  if (!subjectPageDataResult) {
    notFound();
  }

  // The serializeDates function is removed as it's not used and data is transformed for viewer.
  // const subjectForViewer = serializeDates(subjectPageDataResult); 

  const { patient: associatedPatient, samples, ...subjectInfo } = subjectPageDataResult;

  const session = await auth(); // Use the imported, configured auth()
  console.log("SESSION DATA (using exported auth):", JSON.stringify(session, null, 2)); // Log session structure
  
  // Access role (should now be correct if callbacks are working)
  const userRole = session?.user?.role as UserRole | undefined;
  const canViewClinicalTimeline = userRole === 'admin' || userRole === 'viewer';

  let transformedTimelineDataForViewer: { patient: PatientForViewer | null; visits: VisitForViewer[]; } | null = null;
  let patientTimelineData: PatientTimelineData | null = null;
  let labResultsMap: Map<string, (typeof lab_results_table.$inferSelect)[]> = new Map();

  if (canViewClinicalTimeline && associatedPatient?.patient_mrn) {
    console.log(`User is admin and patient_mrn exists, fetching timeline for MRN: ${associatedPatient.patient_mrn}`);
    patientTimelineData = await getPatientTimelineData(associatedPatient.patient_mrn);

    if (patientTimelineData && patientTimelineData.visits.length > 0) {
      const labOrderIds = patientTimelineData.visits.flatMap(v => v.lab_ordersInClinical?.map(lo => lo.order_id) || []).filter(id => !!id) as string[];
      if (labOrderIds.length > 0) {
        const allLabResults = await getLabResultsForOrders(labOrderIds);
        allLabResults.forEach(result => {
          const existing = labResultsMap.get(result.order_id) || [];
          existing.push(result);
          labResultsMap.set(result.order_id, existing);
        });
      }
    }

    if (patientTimelineData && associatedPatient) {
        transformedTimelineDataForViewer = {
            patient: {
                first_name: associatedPatient.first_name,
                last_name: associatedPatient.last_name,
                birth_date: associatedPatient.birth_date ? formatDateDisplay(associatedPatient.birth_date) : null,
                patient_mrn: associatedPatient.patient_mrn,
            },
            visits: patientTimelineData.visits.map(drizzleVisit => {
                const visitDiagnoses: DiagnosisForInternalVisit[] = (drizzleVisit.visit_diagnosesInClinical || []).map(diag => ({
                    name: diag.diagnosis_name || 'Unknown Diagnosis',
                    icd10_code: diag.icd10_code,
                    type: diag.diagnosis_type,
                }));

                const visitMedications: MedicationForInternalVisit[] = (drizzleVisit.medication_ordersInClinical || []).map(med => {
                    const orderTimeDate = med.order_time ? new Date(med.order_time) : null;
                    return {
                        name: med.medication_name || 'Unknown Drug',
                        dosage: med.dose?.toString(),
                        unit: med.units,
                        frequency: med.frequency,
                        status: med.status,
                        taken_time: orderTimeDate ? formatDateDisplay(orderTimeDate) : null,
                    };
                });

                const visitLabs: LabResultForInternalVisit[] = (drizzleVisit.lab_ordersInClinical || []).flatMap(labOrder => {
                    const resultsForOrder = labResultsMap.get(labOrder.order_id) || [];
                    return resultsForOrder.map(result => {
                        const resultTimeDate = result.result_time ? new Date(result.result_time) : null;
                        return {
                            name: result.component_name || 'Unknown Component',
                            value: result.result_value || 'N/A',
                            groupName: labOrder.lab_name, 
                            time: resultTimeDate ? formatDateDisplay(resultTimeDate) : null,
                            test: labOrder.order_type,
                        };
                    });
                }).sort((a, b) => (a.groupName || '').localeCompare(b.groupName || ''));
                
                const visitSamples: SampleForInternalVisit[] = (subjectPageDataResult.samples || [])
                    .filter(sample => sample.date_of_collection && drizzleVisit.visit_start_datetime && areDatesOnSameDay(new Date(sample.date_of_collection), new Date(drizzleVisit.visit_start_datetime)))
                    .map(sample => ({
                        sample_id: sample.sample_id,
                        sample_type: 'OMICS Sample', // Placeholder, adjust if type is available
                        collection_date: formatDateDisplay(sample.date_of_collection),
                        details: `Genotype: ${sample.genotype || 'N/A'}, Age: ${sample.age_at_collection || 'N/A'}`
                    }));

                return {
                    id: drizzleVisit.visit_id,
                    visit_type: drizzleVisit.visit_type || 'N/A',
                    visit_start_datetime: formatDateDisplay(drizzleVisit.visit_start_datetime),
                    department_name: drizzleVisit.department_name || 'N/A',
                    diagnoses: visitDiagnoses,
                    medications: visitMedications,
                    labs: visitLabs,
                    samples: visitSamples,
                };
            })
        };
    }
  } else {
    if (!canViewClinicalTimeline) console.log(`User role ${userRole} cannot view clinical timeline.`);
    if (!associatedPatient?.patient_mrn) console.log(`No patient_mrn for subject ${subjectId}.`);
  }
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">OMICS Subject: {subjectInfo.subject_id}</CardTitle>
            {associatedPatient && (
              <CardDescription>
                Linked Patient MRN: {associatedPatient.patient_mrn} 
                {associatedPatient.first_name && associatedPatient.last_name && ` (${associatedPatient.first_name} ${associatedPatient.last_name})`}
              </CardDescription>
            )}
            {!associatedPatient && (
              <CardDescription>
                No clinical patient record linked to this OMICS subject.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Access properties safely from the non-null subjectPageDataResult */}
            {/* Removed study_id and external_subject_id as they might not be in the base type */}
            {/* <div><span className="font-semibold">Study ID:</span> {subjectPageDataResult.study_id || 'N/A'}</div> */}
            {/* <div><span className="font-semibold">External ID:</span> {subjectPageDataResult.external_subject_id || 'N/A'}</div> */}
            {associatedPatient && 
                <div><span className="font-semibold">Patient Name:</span> {associatedPatient.first_name} {associatedPatient.last_name}</div>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OMICS Samples ({samples.length})</CardTitle>
            <CardDescription>List of samples collected from this subject.</CardDescription>
          </CardHeader>
          <CardContent>
            {samples.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample ID</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead>Age at Collection</TableHead>
                    <TableHead>Genotype</TableHead>
                    <TableHead>Steady State</TableHead>
                    <TableHead>Transfusion Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {samples.map((sample: SubjectSampleListItem) => (
                    <TableRow key={sample.sample_id}>
                      <TableCell>
                        <Link href={`/samples/${sample.sample_id}`} className="text-blue-600 hover:underline">
                          {sample.sample_id}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDateDisplay(sample.date_of_collection)}</TableCell>
                      <TableCell>{sample.age_at_collection ?? 'N/A'}</TableCell>
                      <TableCell>
                        {sample.genotype ? <Badge variant="outline">{sample.genotype}</Badge> : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {sample.steady_state ? <Badge variant={sample.steady_state === 'Yes' ? 'default' : 'secondary'}>{sample.steady_state}</Badge> : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {sample.transfusion_status ? <Badge variant={sample.transfusion_status === 'Yes' ? 'destructive' : 'outline'}>{sample.transfusion_status}</Badge> : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p>No samples found for this subject.</p>
            )}
          </CardContent>
        </Card>

        {canViewClinicalTimeline && associatedPatient?.patient_mrn ? (
            // User can view and MRN exists
            transformedTimelineDataForViewer ? (
                <>
                    <Separator className="my-8" />
                    <Card>
                        <CardHeader>
                            <CardTitle>Clinical Timeline for Patient MRN: {associatedPatient.patient_mrn}</CardTitle>
                            <CardDescription>
                                Displaying clinical encounters, medications, and lab results.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <VisitsViewer 
                                patientMrn={associatedPatient.patient_mrn} 
                                data={transformedTimelineDataForViewer} 
                            />
                        </CardContent>
                    </Card>
                </>
            ) : (
                <>
                    <Separator className="my-8" />
                    <Card>
                        <CardHeader>
                            <CardTitle>Clinical Timeline for Patient MRN: {associatedPatient.patient_mrn}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Timeline data could not be loaded for this patient.</p>
                        </CardContent>
                    </Card>
                </>
            )
        ) : canViewClinicalTimeline && !associatedPatient?.patient_mrn ? (
            // User can view but no MRN linked
            <>
                <Separator className="my-8" />
                <Card>
                    <CardHeader>
                        <CardTitle>Clinical Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>No patient MRN linked to this OMICS subject, cannot display clinical timeline.</p>
                    </CardContent>
                </Card>
            </>
        ) : !canViewClinicalTimeline && associatedPatient?.patient_mrn ? (
            // User cannot view, even though MRN exists
            <>
                <Separator className="my-8" />
                <Card>
                    <CardHeader>
                        <CardTitle>Clinical Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>You do not have permission to view the clinical timeline for this patient.</p>
                    </CardContent>
                </Card>
            </>
        ) : null /* Fallback: case where user can't view AND no MRN - show nothing extra */}
      </div>
    </DashboardLayout>
  );
} 