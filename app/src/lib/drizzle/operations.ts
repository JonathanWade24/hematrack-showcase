import { db } from './src/lib/db'; // Try full relative path from root
// Import specific schema table objects from the schema file using full relative path
import { 
  omics_subjectsInLaboratory as omics_subjects_table, // Correct exported name + Alias
  // We need to decide how to handle multiple results tables here
  // For now, let's import a few representative ones
  results_dnaInLaboratory as results_dna_table, 
  results_plasmaInLaboratory as results_plasma_table,
  patientsInClinical as patients_table, // Correct exported name + Alias
  // Import others as needed
} from './src/lib/db/schema'; // Try full relative path from root
// Import Drizzle utility functions and types
import { eq, desc, inArray, sql, SQL } from 'drizzle-orm'; 
import type { AssayType } from '@/lib/types'; 

// Define expected return types - THIS NEEDS REVISION for multiple result types
type OmicsSubjectWithRelations = typeof omics_subjects_table.$inferSelect & { 
  results_dna?: (typeof results_dna_table.$inferSelect)[]; // Example
  results_plasma?: (typeof results_plasma_table.$inferSelect)[]; // Example
  // Add other result types as needed
  patients: typeof patients_table.$inferSelect | null;
};

type OmicsSubjectWithCountAndDate = typeof omics_subjects_table.$inferSelect & { 
  omics_results_count: number; // This calculation will be more complex
  latest_sample_date: Date | null; // This calculation will be more complex
};


/**
 * Fetches an OmicsSubject by ID, including related Patient data.
 * Fetching specific results needs refinement based on the new multi-table structure.
 */
export async function getOmicsSubjectById(subject_id: string): Promise<OmicsSubjectWithRelations | null> {
  try {
    // Fetch subject with patient relation first
    const subject = await db.query.omics_subjects_table.findFirst({
      where: eq(omics_subjects_table.subject_id, subject_id),
      with: {
        patients: true, // Relation name from relations.ts
        // We will need to add specific relations for each result type here
        // e.g., results_dna: true, results_plasma: true, ...
        // Or fetch them in separate queries after getting the subject
      }
    });

    if (!subject) {
      console.warn(`[Drizzle] Subject with ID ${subject_id} not found.`);
      return null;
    }
    
    // TODO: Fetch specific results data (e.g., DNA, Plasma) separately or update the initial query
    // For now, returning subject with patient, but relations type is incomplete
    return subject as OmicsSubjectWithRelations; // Cast needed as result relations aren't fetched yet

  } catch (error) {
    console.error(`[Drizzle] Error fetching subject by ID ${subject_id}:`, error);
    throw error; 
  }
}

// --- The following functions need significant rework due to the schema change --- 

// /**
//  * Fetches all OmicsSubjects including sample count and latest sample date.
//  * Rework needed for multi-table aggregation.
//  */
// export async function getAllOmicsSubjects(): Promise<OmicsSubjectWithCountAndDate[]> {
//   // ... implementation needs to query multiple results_* tables ...
// }

// /**
//  * Creates a new result record - Needs specific function per result type
//  * or a generic function accepting table object.
//  */
// // export async function createDnaResult(...) { ... }
// // export async function createPlasmaResult(...) { ... }

// /**
//  * Updates an existing result record - Needs specific function per result type
//  * or a generic function accepting table object.
//  */
// // export async function updateDnaResult(...) { ... }

// --- Remaining Operations need refactoring ---
// ... (rest of the functions still using Prisma) ... 