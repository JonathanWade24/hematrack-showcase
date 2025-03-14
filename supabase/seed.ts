import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

// You'll need to install faker: npm install @faker-js/faker
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedPatients(count = 50) {
  console.log(`Seeding ${count} patients...`);
  
  const patients = Array.from({ length: count }, () => ({
    patient_mrn: faker.string.alphanumeric(10).toUpperCase(),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    // Add other required fields based on your schema
  }));

  const { error } = await supabase.from('patients').insert(patients);
  if (error) console.error('Error seeding patients:', error);
  else console.log(`Successfully seeded ${count} patients`);
}

// Add more seed functions for other tables
async function seedDemographics() {
  // Get all patients
  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('patient_mrn');
  
  if (patientsError) {
    console.error('Error fetching patients:', patientsError);
    return;
  }
  
  const demographics = patients.map(patient => ({
    patient_mrn: patient.patient_mrn,
    birth_date: faker.date.past({ years: 50 }).toISOString(),
    age: faker.number.int({ min: 18, max: 80 }),
    gender: faker.helpers.arrayElement(['Male', 'Female', 'Other']),
    race: faker.helpers.arrayElement(['White', 'Black', 'Asian', 'Hispanic', 'Other']),
    ethnicity: faker.helpers.arrayElement(['Hispanic', 'Non-Hispanic', 'Unknown']),
    // Add other fields as needed
  }));
  
  const { error } = await supabase.from('demographics').insert(demographics);
  if (error) console.error('Error seeding demographics:', error);
  else console.log(`Successfully seeded ${demographics.length} demographics records`);
}

// Run all seed functions
async function main() {
  await seedPatients();
  await seedDemographics();
  // Add more seed functions as needed
  console.log('Seeding completed!');
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});