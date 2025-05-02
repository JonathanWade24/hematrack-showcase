import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';

// Type for the result of any column value query
export interface ColumnValueResult {
  value: string | number | Date | null;
  count: number;
}

// Base query parameters
export interface BaseQueryParams {
  search?: string;
  limit?: number;
}

// Type-safe table and column combinations
export const AllowedQueries = {
  laboratory: {
    sample: ['sampleType', 'status', 'collectionMethod'] as const,
    result: ['testName', 'resultStatus'] as const,
  },
  clinical: {
    visit: ['visitType', 'location'] as const,
    diagnosis: ['condition', 'severity'] as const,
  },
} as const;

// Type inference helpers
export type TableNames = keyof typeof AllowedQueries;
export type TableNamesForSchema<T extends TableNames> = keyof typeof AllowedQueries[T];
export type ColumnNames<T extends TableNames, U extends TableNamesForSchema<T>> = (typeof AllowedQueries[T][U])[number];

// Query executor class
export class ColumnQueryExecutor {
  constructor(private prisma: PrismaClient) {}

  private async executeQuery<T extends TableNames, U extends TableNamesForSchema<T>>(
    schema: T,
    table: U,
    column: ColumnNames<T, U>,
    params: BaseQueryParams
  ): Promise<ColumnValueResult[]> {
    const { search, limit = 100 } = params;
    const schemaStr = String(schema);
    const tableStr = String(table);
    const columnStr = String(column);

    // Use Prisma's type-safe query builder
    const results = await this.prisma.$queryRaw<ColumnValueResult[]>`
      SELECT 
        ${Prisma.raw(`"${columnStr}"`)}::text as value,
        COUNT(*) as count
      FROM ${Prisma.raw(`"${schemaStr}"."${tableStr}"`)}
      WHERE ${Prisma.raw(`"${columnStr}"`)} IS NOT NULL
      ${search ? Prisma.sql`AND ${Prisma.raw(`"${columnStr}"`)}::text ILIKE ${`%${search}%`}` : Prisma.sql``}
      GROUP BY ${Prisma.raw(`"${columnStr}"`)}
      ORDER BY count DESC, ${Prisma.raw(`"${columnStr}"`)}
      LIMIT ${limit}
    `;

    return results;
  }

  // Type-safe query methods for specific tables/columns
  async getSampleTypes(params: BaseQueryParams) {
    return this.executeQuery('laboratory', 'sample', 'sampleType', params);
  }

  async getSampleStatuses(params: BaseQueryParams) {
    return this.executeQuery('laboratory', 'sample', 'status', params);
  }

  async getVisitTypes(params: BaseQueryParams) {
    return this.executeQuery('clinical', 'visit', 'visitType', params);
  }

  async getDiagnosisConditions(params: BaseQueryParams) {
    return this.executeQuery('clinical', 'diagnosis', 'condition', params);
  }

  // Factory method to create new query methods
  static createQueryMethod<T extends TableNames>(
    schema: T,
    table: TableNamesForSchema<T>,
    column: string
  ) {
    return async function(this: ColumnQueryExecutor, params: BaseQueryParams) {
      return this.executeQuery(schema, table, column as any, params);
    };
  }
}

// Request validation schema
export const QueryRequestSchema = z.object({
  schema: z.enum(['laboratory', 'clinical'] as const),
  table: z.string(),
  column: z.string(),
  search: z.string().optional(),
  limit: z.number().optional().default(100)
});

export type QueryRequest = z.infer<typeof QueryRequestSchema>;

// Helper to check if a query is allowed
export function isAllowedQuery(
  schema: TableNames,
  table: string,
  column: string
): boolean {
  const allowedTables = AllowedQueries[schema];
  if (!allowedTables || !(table in allowedTables)) {
    return false;
  }
  
  const allowedColumns = AllowedQueries[schema][table as keyof typeof allowedTables];
  return (allowedColumns as readonly string[]).includes(column);
} 