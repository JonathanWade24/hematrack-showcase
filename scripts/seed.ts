import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Starting database seeding...');
  
  try {
    // Seed patients
    console.log('Seeding patients...');
    const patients = Array.from({ length: 10 }, (_, i) => ({
      patient_mrn: `TEST${i+1}`,
      first_name: `First${i+1}`,
      last_name: `Last${i+1}`
    }));
    
    const { error: patientsError } = await supabase.from('phi.patients').insert(patients);
    if (patientsError) {
      console.error('Error seeding patients:', patientsError);
    } else {
      console.log('Successfully seeded patients');
    }
    
    // Seed omics_subjects
    console.log('Seeding subjects...');
    const subjects = Array.from({ length: 10 }, (_, i) => ({
      subject_id: `SUBJ${i+1}`,
      patient_mrn: `TEST${i+1}`,
      enrollment_date: new Date().toISOString()
    }));
    
    const { error: subjectsError } = await supabase.from('omics_subjects').insert(subjects);
    if (subjectsError) {
      console.error('Error seeding subjects:', subjectsError);
    } else {
      console.log('Successfully seeded subjects');
    }
    
    // Seed omics_results
    console.log('Seeding samples...');
    const samples = Array.from({ length: 20 }, (_, i) => ({
      sample_id: `SAMPLE${i+1}`,
      subject_id: `SUBJ${Math.floor(i/2)+1}`,
      collection_date: new Date().toISOString(),
      result_type: i % 2 === 0 ? 'DNA' : 'RNA',
      qc_status: 'Pass'
    }));
    
    const { error: samplesError } = await supabase.from('omics_results').insert(samples);
    if (samplesError) {
      console.error('Error seeding samples:', samplesError);
    } else {
      console.log('Successfully seeded samples');
    }
    
    console.log('Seeding completed!');
  } catch (error) {
    console.error('Unexpected error during seeding:', error);
  }
}

seed().catch(console.error); 