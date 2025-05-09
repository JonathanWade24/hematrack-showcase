import { db } from '@/lib/db';
import { z } from 'zod';
import { SQL, eq, like, sql } from 'drizzle-orm';
import { patientsInClinical, visitsInClinical, samplesInLaboratory } from './schema';

// Define schema union type
export type TableNames = 'clinical' | 'laboratory';

// Schema to validate incoming query requests
export const QueryRequestSchema = z.object({
  schema: z.string(),
  table: z.string(),
  column: z.string(),
  search: z.string().optional(),
  limit: z.number().default(100)
});

type QueryRequest = z.infer<typeof QueryRequestSchema>;

// Define allowed table and column combinations with proper typing
const ALLOWED_QUERIES: Record<TableNames, Record<string, string[]>> = {
  'clinical': {
    'patients': ['patient_mrn', 'first_name', 'last_name', 'sex', 'race', 'ethnicity'],
    'visits': ['visit_id', 'visit_type', 'department_name'],
  },
  'laboratory': {
    'samples': ['sample_id', 'subject_id', 'genotype', 'transfusion_status', 'steady_state'],
  }
};

// Check if a query is allowed
export function isAllowedQuery(schema: TableNames, table: string, column: string): boolean {
  return !!ALLOWED_QUERIES[schema]?.[table]?.includes(column);
}

// Column query executor class
export class ColumnQueryExecutor {
  constructor(private readonly dbInstance: typeof db) {}

  // Factory method to create a query method based on schema, table, and column
  static createQueryMethod(schema: TableNames, table: string, column: string) {
    const key = `query_${schema}_${table}_${column}`;
    
    // Check if the method exists on the prototype
    if (typeof ColumnQueryExecutor.prototype[key as keyof ColumnQueryExecutor] === 'function') {
      return ColumnQueryExecutor.prototype[key as keyof ColumnQueryExecutor];
    }
    
    // Default generic query method
    return ColumnQueryExecutor.prototype.defaultQuery;
  }

  // Default query implementation for any table/column combo
  async defaultQuery({ search, limit }: { search?: string, limit?: number }) {
    // This is a placeholder that won't actually be called
    // Our isAllowedQuery function will prevent accessing unsupported combinations
    return [];
  }

  // Example query methods for specific tables/columns
  async query_clinical_patients_sex({ search, limit }: { search?: string, limit?: number }) {
    const query = this.dbInstance.select({ value: patientsInClinical.sex })
      .from(patientsInClinical)
      .where(
        search 
          ? like(patientsInClinical.sex, `%${search}%`)
          : sql`1=1`
      )
      .groupBy(patientsInClinical.sex)
      .limit(limit || 100);
    
    const results = await query;
    return results.map(r => ({ value: r.value }));
  }

  async query_clinical_patients_race({ search, limit }: { search?: string, limit?: number }) {
    const query = this.dbInstance.select({ value: patientsInClinical.race })
      .from(patientsInClinical)
      .where(
        search 
          ? like(patientsInClinical.race, `%${search}%`)
          : sql`1=1`
      )
      .groupBy(patientsInClinical.race)
      .limit(limit || 100);
    
    const results = await query;
    return results.map(r => ({ value: r.value }));
  }

  async query_laboratory_samples_genotype({ search, limit }: { search?: string, limit?: number }) {
    const query = this.dbInstance.select({ value: samplesInLaboratory.genotype })
      .from(samplesInLaboratory)
      .where(
        search 
          ? like(samplesInLaboratory.genotype, `%${search}%`)
          : sql`1=1`
      )
      .groupBy(samplesInLaboratory.genotype)
      .limit(limit || 100);
    
    const results = await query;
    return results.map(r => ({ value: r.value }));
  }
} 