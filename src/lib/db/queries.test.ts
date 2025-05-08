import { getOmicsSubjectById, Patient, Sample, getAllOmicsSubjects, SubjectListItem, getTotalSubjectCount, getTotalSampleCount, getAllSamplesWithStatusFields, getRecentSamplesWithStatusFields, getSampleByIdWithResults } from './queries';
import { db, closeDbConnection } from './index'; // Import close function

// Make sure dotenv runs to load DATABASE_URL for the db connection
import 'dotenv/config';

// Close connection after all tests in this file are done
afterAll(async () => {
  await closeDbConnection();
});

// TODO: Implement proper test setup/teardown with a dedicated test database and seeding.
// For now, assumes the dev DB is running and contains necessary test data.

describe('getOmicsSubjectById', () => {

  const TEST_SUBJECT_ID = 'OMI-0275'; // Assume this subject exists in the DB
  const EXPECTED_PATIENT_MRN = '100505379'; // Assuming this is the MRN for OMI-0275

  it('should fetch subject, patient, and related samples/results when they exist', async () => {
    // Arrange: (Data should exist in DB)
    
    // Act: Call the function under test
    const subject = await getOmicsSubjectById(TEST_SUBJECT_ID);

    // Assert: Check the result
    expect(subject).not.toBeNull(); // Should find a subject
    expect(subject?.subject_id).toBe(TEST_SUBJECT_ID); // Check if the correct subject was returned
    // Add assertion for patient data
    expect(subject?.patient).not.toBeNull();
    expect(subject?.patient?.patient_mrn).toBe(EXPECTED_PATIENT_MRN);

    // Check samples array (assuming OMI-0275 has samples)
    expect(subject?.samplesInLaboratories).toBeDefined();
    expect(Array.isArray(subject?.samplesInLaboratories)).toBe(true);
    // Optionally, check if the array is not empty if you expect samples
    expect(subject?.samplesInLaboratories).toHaveLength(2); // Check for exactly two samples

    // Check the specific sample IDs, assuming order by sample_number
    const sampleIds = subject?.samplesInLaboratories?.map(s => s.sample_id).sort();
    expect(sampleIds).toEqual(['OMI-0275-1', 'OMI-0275-2']);

    // TODO: Add more specific checks for nested results inside samples 
    // if specific result data for OMI-0275 is known.
    // Example:
    // const firstSample = subject?.samplesInLaboratories?.[0];
    // expect(firstSample?.results_dnaInLaboratories?.[0]?.concentration_1_dna).toBe( ... );
  });

  it('should return null if the subject does not exist', async () => {
    // Arrange: Use an ID guaranteed not to exist
    const NON_EXISTENT_ID = '__DOES_NOT_EXIST__';

    // Act: Call the function
    const subject = await getOmicsSubjectById(NON_EXISTENT_ID);

    // Assert: Check the result
    expect(subject).toBeNull();
  });

  // Add tests for error handling if needed
});

describe('getAllOmicsSubjects', () => {
    // We reuse the same connection and close it once after all tests in the file run.
    // No need for specific beforeAll/afterAll here unless this describe block
    // needs its own setup/teardown separate from getOmicsSubjectById.
  
    const TEST_SUBJECT_ID = 'OMI-0275'; // Assume this subject exists
    const EXPECTED_PATIENT_MRN = '100505379'; // Expected patient for TEST_SUBJECT_ID
    const EXPECTED_SAMPLE_COUNT = 2; // Expected sample count for TEST_SUBJECT_ID
  
    it('should return an array of subjects matching SubjectListItem type', async () => {
      const subjects = await getAllOmicsSubjects();
      expect(Array.isArray(subjects)).toBe(true);
      // Basic check for one item having the expected structure
      if (subjects.length > 0) {
        expect(subjects[0]).toHaveProperty('subject_id');
        expect(subjects[0]).toHaveProperty('patient');
        expect(subjects[0]).toHaveProperty('sample_count');
        expect(subjects[0]).toHaveProperty('latest_sample_date');
      }
    });
  
    it('should return at least one subject (assuming test DB is not empty)', async () => {
      const subjects = await getAllOmicsSubjects();
      expect(subjects.length).toBeGreaterThan(0);
    });
  
    it('should include the patient data, sample count, and latest date for each subject', async () => {
      const subjects = await getAllOmicsSubjects();
      const testSubject = subjects.find(s => s.subject_id === TEST_SUBJECT_ID);
      expect(testSubject).toBeDefined();
      // Check patient
      expect(testSubject?.patient).not.toBeNull();
      expect(testSubject?.patient?.patient_mrn).toBe(EXPECTED_PATIENT_MRN);
      // Check sample count
      expect(testSubject?.sample_count).toBeDefined();
      expect(typeof testSubject?.sample_count).toBe('number');
      expect(testSubject?.sample_count).toBe(EXPECTED_SAMPLE_COUNT); // Check specific count
      // Check latest sample date (check it's a string or null, format YYYY-MM-DD)
      const dateValue = testSubject?.latest_sample_date;
      const isNull = dateValue === null;
      const isString = typeof dateValue === 'string';
      const regex = /^\d{4}-\d{2}-\d{2}$/; // Use single backslashes for regex literal
      const matchesFormat = isString && regex.test(dateValue);
      
      const dateCheckPassed = isNull || matchesFormat;
      
      expect(dateCheckPassed).toBe(true);
      
      // Optionally check that ALL subjects have the required fields
      subjects.forEach((subject: SubjectListItem) => {
        expect(subject).toHaveProperty('patient');
        expect(subject).toHaveProperty('sample_count');
        expect(typeof subject.sample_count).toBe('number');
        expect(subject).toHaveProperty('latest_sample_date');
        expect(subject.latest_sample_date === null || typeof subject.latest_sample_date === 'string').toBe(true);
      });
    });
  
    it('should not include nested sample/result data', async () => {
      const subjects = await getAllOmicsSubjects();
      const testSubject = subjects.find(s => s.subject_id === TEST_SUBJECT_ID);
      expect(testSubject).toBeDefined();
      // Check that the samples relation property does NOT exist
      expect(testSubject).not.toHaveProperty('samplesInLaboratories');
    });
  });

// We will add tests for other functions here as they are implemented 

describe('getTotalSubjectCount', () => {
    it('should return a number', async () => {
        const count = await getTotalSubjectCount();
        expect(typeof count).toBe('number');
    });

    it('should return a non-negative number', async () => {
        const count = await getTotalSubjectCount();
        expect(count).toBeGreaterThanOrEqual(0);
        // We could check against a known count if the test DB is static,
        // but for now, non-negative is a good basic check.
    });
});

describe('getTotalSampleCount', () => {
    it('should return a number', async () => {
        const count = await getTotalSampleCount();
        expect(typeof count).toBe('number');
    });

    it('should return a non-negative number', async () => {
        const count = await getTotalSampleCount();
        expect(count).toBeGreaterThanOrEqual(0);
    });
});

describe('getAllSamplesWithStatusFields', () => {
    it('should return an array of samples', async () => {
        const samples = await getAllSamplesWithStatusFields();
        expect(Array.isArray(samples)).toBe(true);
    });

    it('should return samples with expected fields (including joined results)', async () => {
        const samples = await getAllSamplesWithStatusFields();
        if (samples.length > 0) {
            const sample = samples[0];
            // Check core sample fields
            expect(sample).toHaveProperty('sample_id');
            expect(sample).toHaveProperty('subject_id');
            expect(sample).toHaveProperty('genotype');
            // Check some representative joined fields (presence check is enough)
            expect(sample).toHaveProperty('rbc_advia'); // Advia
            expect(sample).toHaveProperty('concentration_1_dna'); // DNA
            expect(sample).toHaveProperty('cell_number_1_pbmc'); // PBMC
            expect(sample).toHaveProperty('vol_plasma_1'); // Plasma
            expect(sample).toHaveProperty('ei_min_lorrca'); // Lorrca
            expect(sample).toHaveProperty('qc_pass_advia'); // QC Advia
        }
    });

    // Add more specific tests if needed, e.g., checking specific values for a known sample
});

describe('getRecentSamplesWithStatusFields', () => {
    const LIMIT = 5;

    it('should return an array of samples', async () => {
        const samples = await getRecentSamplesWithStatusFields(LIMIT);
        expect(Array.isArray(samples)).toBe(true);
    });

    it('should return samples with expected fields', async () => {
        const samples = await getRecentSamplesWithStatusFields(LIMIT);
        if (samples.length > 0) {
            const sample = samples[0];
            // Check core sample fields
            expect(sample).toHaveProperty('sample_id');
            expect(sample).toHaveProperty('subject_id');
            expect(sample).toHaveProperty('genotype');
            expect(sample).toHaveProperty('date_of_collection');
            // Check some representative joined fields
            expect(sample).toHaveProperty('rbc_advia');
            expect(sample).toHaveProperty('concentration_1_dna');
            expect(sample).toHaveProperty('qc_pass_dna');
        }
    });

    it(`should return at most ${LIMIT} samples`, async () => {
        const samples = await getRecentSamplesWithStatusFields(LIMIT);
        expect(samples.length).toBeLessThanOrEqual(LIMIT);
    });

    it('should return samples ordered by date_of_collection descending (ignoring nulls)', async () => {
        const samples = await getRecentSamplesWithStatusFields(LIMIT);
        // Check if the array is sorted correctly based on non-null dates
        for (let i = 0; i < samples.length - 1; i++) {
            const date1 = samples[i].date_of_collection;
            const date2 = samples[i + 1].date_of_collection;
            // Only compare if both dates are non-null
            if (date1 && date2) {
                expect(new Date(date1) >= new Date(date2)).toBe(true);
            }
        }
    });

     it('should return an empty array if limit is 0 or less', async () => {
        const samplesZero = await getRecentSamplesWithStatusFields(0);
        expect(samplesZero).toEqual([]);
        const samplesNegative = await getRecentSamplesWithStatusFields(-5);
        expect(samplesNegative).toEqual([]);
    });
});

describe('getSampleByIdWithResults', () => {
    const TEST_SAMPLE_ID = 'OMI-0275-1'; // Assume this sample exists
    const NON_EXISTENT_ID = '__DOES_NOT_EXIST_SAMPLE__';

    it('should fetch a sample with its results when the ID exists', async () => {
        const sample = await getSampleByIdWithResults(TEST_SAMPLE_ID);
        expect(sample).not.toBeNull();
        expect(sample?.sample_id).toBe(TEST_SAMPLE_ID);
        // Check for presence of nested structures (can add more specific checks later)
        expect(sample).toHaveProperty('omics_subjectsInLaboratory'); // Subject
        // expect(sample?.omics_subjectsInLaboratory).toHaveProperty('patientsInClinical'); // Patient
        expect(sample).toHaveProperty('results_dnaInLaboratories'); // Example results
        expect(sample).toHaveProperty('results_adviaInLaboratories'); // Example results
    });

    it('should return null if the sample ID does not exist', async () => {
        const sample = await getSampleByIdWithResults(NON_EXISTENT_ID);
        expect(sample).toBeNull();
    });

    // Add tests for error handling if needed
}); 