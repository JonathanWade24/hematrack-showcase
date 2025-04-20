// src/lib/placeholder-data.ts
// import { Database } from './database.types'; // Removed import

// Define simplified types or use 'any'
// type Patient = Database['public']['Tables']['patients']['Row'];
// type OmicsResult = Database['laboratory']['Tables']['omics_results']['Row'];
type Patient = any; // Using any for now
type OmicsResult = any; // Using any for now

// --- Placeholder Data ---

const MOCK_PATIENTS: Patient[] = [
  {
    patient_id: 'MOCK-001',
    mrn: '123456',
    date_of_birth: '1990-01-01',
    sex: 'Female',
    // Add other necessary fields with mock data, possibly null
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subject_id: 'SUBJ-MOCK-001'
  },
  // Add more mock patients if needed
];

const MOCK_OMICS_RESULTS: OmicsResult[] = [
  {
    result_id: 'OMICS-MOCK-001',
    subject_id: 'SUBJ-MOCK-001',
    sample_id: 'SAMPLE-MOCK-001',
    test_type: 'WGS',
    result_value: 'Some mock result',
    result_unit: null,
    result_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    visit_id: 'VISIT-MOCK-001'
  },
  // Add more mock results if needed
];

// --- Placeholder Functions ---

export const getPlaceholderPatients = async (): Promise<Patient[]> => {
  console.warn('Returning placeholder patient data.');
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 50));
  return MOCK_PATIENTS;
};

export const getPlaceholderPatientById = async (id: string): Promise<Patient | null> => {
    console.warn(`Returning placeholder patient data for ID: ${id}`);
    await new Promise(resolve => setTimeout(resolve, 50));
    return MOCK_PATIENTS.find(p => p.patient_id === id) || MOCK_PATIENTS[0] || null; // Return first mock or null
};


export const getPlaceholderOmicsResults = async (): Promise<OmicsResult[]> => {
  console.warn('Returning placeholder omics results data.');
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 50));
  return MOCK_OMICS_RESULTS;
};

export const getPlaceholderOmicsResultById = async (id: string): Promise<OmicsResult | null> => {
    console.warn(`Returning placeholder omics result data for ID: ${id}`);
    await new Promise(resolve => setTimeout(resolve, 50));
    return MOCK_OMICS_RESULTS.find(r => r.result_id === id) || MOCK_OMICS_RESULTS[0] || null; // Return first mock or null
};


// --- Generic Placeholder for Queries ---
// Use this for simpler cases or where specific mock data isn't crucial yet
export const getPlaceholderData = async (operation: string): Promise<any[]> => {
    console.warn(`Returning generic empty placeholder data for operation: ${operation}`);
    await new Promise(resolve => setTimeout(resolve, 50));
    return [];
}

export const getPlaceholderCount = async (operation: string): Promise<number> => {
    console.warn(`Returning generic count placeholder data for operation: ${operation}`);
     await new Promise(resolve => setTimeout(resolve, 50));
    return 0;
}

// Add more specific placeholder functions as needed based on operations in operations.ts 