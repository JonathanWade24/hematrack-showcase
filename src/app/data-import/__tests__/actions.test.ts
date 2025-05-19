import { importDataAction } from '../actions';
import { db } from '@/lib/db';
import { auth } from '@/app/api/auth/[...nextauth]/route';

// Mock the database and auth
jest.mock('@/lib/db', () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  auth: jest.fn()
}));

// Helper to create a mock File object
function createMockFile(content: string, name: string = 'test.csv'): File {
  const blob = new Blob([content], { type: 'text/csv' });
  const file = blob as any; 
  file.name = name; 
  file.text = () => Promise.resolve(content); 
  return file as File; 
}

describe('Data Import Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('importDataAction', () => {
    it('should return unauthorized if user is not admin', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { role: 'user' } });
      const mockFormData = {
        getAll: jest.fn().mockReturnValue([])
      } as unknown as FormData;
      const result = await importDataAction(mockFormData);
      expect(result.results).toEqual([{ type: 'auth', error: 'Unauthorized' }]);
    });

    it('should process demographics file correctly', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { role: 'admin' } });
      const demographicsContent = 'PATIENT_MRN,FIRST_NAME,LAST_NAME,BIRTH_DATE,SEX\n123,John,Doe,1990-01-01,M';
      const demographicsFile = createMockFile(demographicsContent, 'demographics.csv');
      const mockFormData = {
        getAll: jest.fn().mockImplementation((key: string) => {
          if (key === 'files') return [demographicsFile];
          if (key === 'dataTypes') return ['demographics'];
          return [];
        })
      } as unknown as FormData;
      const result = await importDataAction(mockFormData);
      expect(result.results[0]).toMatchObject({
        type: 'demographics',
        recordsProcessed: 1
      });
      expect(db.insert).toHaveBeenCalled();
    });

    it('should process visits file correctly', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { role: 'admin' } });
      const visitsContent = 'VISIT_ID,PATIENT_MRN,VISIT_TYPE,VISIT_START_DATETIME\nV1,123,IP,2024-01-01 10:00:00';
      const visitsFile = createMockFile(visitsContent, 'visits.csv');
      const mockFormData = {
        getAll: jest.fn().mockImplementation((key: string) => {
          if (key === 'files') return [visitsFile];
          if (key === 'dataTypes') return ['visits'];
          return [];
        })
      } as unknown as FormData;
      const result = await importDataAction(mockFormData);
      expect(result.results[0]).toMatchObject({
        type: 'visits',
        recordsProcessed: 1
      });
      expect(db.insert).toHaveBeenCalled();
    });

    it('should process lab results file correctly', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { role: 'admin' } });
      const labsContent = 'ORDER_ID,PATIENT_MRN,LAB_CODE,RESULT_VALUE\nL1,123,CBC,10.5';
      const labsFile = createMockFile(labsContent, 'labs.csv');
      const mockFormData = {
        getAll: jest.fn().mockImplementation((key: string) => {
          if (key === 'files') return [labsFile];
          if (key === 'dataTypes') return ['labs'];
          return [];
        })
      } as unknown as FormData;
      const result = await importDataAction(mockFormData);
      expect(result.results[0]).toMatchObject({
        type: 'labs',
        recordsProcessed: 1
      });
      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle multiple files in one request', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { role: 'admin' } });
      const demographicsContent = 'PATIENT_MRN,FIRST_NAME,LAST_NAME\n123,John,Doe';
      const demographicsFile = createMockFile(demographicsContent, 'demographics.csv');
      const visitsContent = 'VISIT_ID,PATIENT_MRN,VISIT_TYPE\nV1,123,IP';
      const visitsFile = createMockFile(visitsContent, 'visits.csv');
      const mockFormData = {
        getAll: jest.fn().mockImplementation((key: string) => {
          if (key === 'files') return [demographicsFile, visitsFile];
          if (key === 'dataTypes') return ['demographics', 'visits'];
          return [];
        })
      } as unknown as FormData;
      const result = await importDataAction(mockFormData);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].type).toBe('demographics');
      expect(result.results[1].type).toBe('visits');
    });

    it('should handle invalid file type', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { role: 'admin' } });
      const invalidContent = 'data';
      const invalidFile = createMockFile(invalidContent, 'invalid.csv');
      const mockFormData = {
        getAll: jest.fn().mockImplementation((key: string) => {
          if (key === 'files') return [invalidFile];
          if (key === 'dataTypes') return ['invalid_type'];
          return [];
        })
      } as unknown as FormData;
      const result = await importDataAction(mockFormData);
      expect(result.results[0]).toMatchObject({
        type: 'invalid_type',
        error: 'Unknown file type: invalid_type'
      });
    });

    it('should handle malformed CSV data', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { role: 'admin' } });
      // This CSV content has an unclosed quote, which should cause a parsing error
      const malformedContent = 'PATIENT_MRN,FIRST_NAME\n123,"John Doe'; 
      const malformedFile = createMockFile(malformedContent, 'demographics.csv');
      const mockFormData = {
        getAll: jest.fn().mockImplementation((key: string) => {
          if (key === 'files') return [malformedFile];
          if (key === 'dataTypes') return ['demographics'];
          return [];
        })
      } as unknown as FormData;
      const result = await importDataAction(mockFormData);
      // Now we expect the error property of the first result to be defined
      expect(result.results[0].error).toBeDefined();
      // Optionally, you could check for a more specific error message if known
      // expect(result.results[0].error).toContain('Quote'); 
    });
  });
}); 