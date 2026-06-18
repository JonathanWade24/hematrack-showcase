/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerClient, getSupabaseAdminClient, handleSupabaseError } from './db';
import { createPhiClient } from '@/lib/supabase/server';
import { AssayType } from '../types';
import { 
    getPlaceholderData, 
    getPlaceholderCount 
} from '../placeholder-data';
import { omics_subjects, omics_results, patients } from '@prisma/client'; // Import actual Prisma types

// Type definitions for our database tables - Use Prisma types
// export type OmicsResult = any; // Replaced by import
// export type OmicsSubject = any; // Replaced by import
// export type Patient = any; // Replaced by import

// Omics Results Operations

// Removed Supabase createOmicsResult (now handled by Prisma)

// Removed Supabase updateOmicsResult (now handled by Prisma)

// Removed Supabase getOmicsResultBySampleId (now handled by Prisma)

// Removed Supabase getOmicsResultsBySubjectId (now handled by Prisma)

export async function getOmicsResultsBySubjectId(subject_id: string) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Handle missing client
    if (!supabase) {
        // Attempt to return specific placeholder if possible, otherwise generic
        // Note: This specific placeholder might need adjustment if it doesn't match the combined structure
        console.warn(`[getOmicsResultsBySubjectId] Supabase client not available for subject_id: ${subject_id}. Returning placeholder data.`);
        // Returning generic placeholder for now as the structure is combined
        return getPlaceholderData('getOmicsResultsBySubjectId'); 
    }
    
    // Get the subject data
    const { data: subject, error: subjectError } = await supabase
      .schema('laboratory')
      .from('omics_subjects')
      .select('*')
      .eq('subject_id', subject_id)
      .single();
    
    if (subjectError) {
      console.error('Error fetching subject:', subjectError);
    }
    
    // Get the samples data
    const { data: samples, error } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .select('*')
      .eq('subject_id', subject_id)
      .order('date_of_collection', { ascending: false });
    
    if (error) handleSupabaseError(error as any);
    
    // Combine the data
    const samplesWithSubject = samples?.map((sample: any) => ({
      ...sample,
      omics_subjects: subject || null
    })) || [];
    
    return samplesWithSubject;
  } catch (error) {
    handleSupabaseError(error as any);
    return [];
  }
}

// Removed Supabase getOmicsResultsByAssayType (now handled by Prisma)

// Subject Operations

// Removed Supabase createOmicsSubject (now handled by Prisma)

// Removed Supabase getAllOmicsSubjects (now handled by Prisma)

// Removed Supabase updateOmicsSubject (now handled by Prisma)

// Patient Operations

// Removed Supabase createPatient (now handled by Prisma)

// Removed Supabase getAllPatients (now handled by Prisma)

// Removed Supabase getPatientByMRN (now handled by Prisma)

// Removed Supabase updatePatient (now handled by Prisma)

// Search Operations

// Removed Supabase searchSubjects (now handled by Prisma)

// Audit Operations

// Removed Supabase logAuditEvent (now handled by Prisma)

// Example for a function returning count
// Removed Supabase getOmicsResultsCount (now handled by Prisma)