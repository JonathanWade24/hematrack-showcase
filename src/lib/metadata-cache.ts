/**
 * Simple in-memory cache for database metadata
 */

import { z } from 'zod';

// Define schema for table metadata
export const ColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  isNumeric: z.boolean(),
});

export const ForeignKeySchema = z.object({
  columnName: z.string(),
  foreignSchema: z.string(),
  foreignTable: z.string(),
  foreignColumn: z.string(),
});

export const TableMetadataSchema = z.array(
  z.object({
    name: z.string(),
    schema: z.string(),
    columns: z.array(ColumnSchema),
    foreignKeys: z.array(ForeignKeySchema),
  })
);

export type TableMetadata = z.infer<typeof TableMetadataSchema>;

// Cache configuration
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Cache state
let metadataCache: {
  data: TableMetadata | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

/**
 * Get metadata from cache or fetch it if needed
 */
export async function getMetadata(): Promise<TableMetadata> {
  const now = Date.now();
  
  // Return cached data if it's still valid
  if (metadataCache.data && now - metadataCache.timestamp < CACHE_TTL) {
    return metadataCache.data;
  }
  
  // Fetch fresh data
  try {
    const response = await fetch('/api/query/metadata/tables');
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    
    const data = await response.json();
    const validatedData = TableMetadataSchema.parse(data);
    
    // Update cache
    metadataCache = {
      data: validatedData,
      timestamp: now,
    };
    
    return validatedData;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    
    // Return cached data if available, even if expired
    if (metadataCache.data) {
      console.log('Returning expired cached metadata');
      return metadataCache.data;
    }
    
    throw error;
  }
}

/**
 * Invalidate the metadata cache
 */
export function invalidateMetadataCache(): void {
  metadataCache = {
    data: null,
    timestamp: 0,
  };
}

/**
 * Get tables by schema
 */
export function getTablesBySchema(metadata: TableMetadata): Record<string, typeof metadata> {
  return metadata.reduce((acc, table) => {
    if (!acc[table.schema]) {
      acc[table.schema] = [];
    }
    acc[table.schema].push(table);
    return acc;
  }, {} as Record<string, typeof metadata>);
}

/**
 * Find a table by schema and name
 */
export function findTable(metadata: TableMetadata, schema: string, name: string): (typeof metadata)[0] | undefined {
  return metadata.find(table => table.schema === schema && table.name === name);
}

/**
 * Get related tables based on foreign keys
 */
export function getRelatedTables(metadata: TableMetadata, schema: string, name: string): {
  table: (typeof metadata)[0];
  relationship: {
    sourceColumn: string;
    targetColumn: string;
  };
}[] {
  const table = findTable(metadata, schema, name);
  if (!table) return [];
  
  const relatedTables: {
    table: (typeof metadata)[0];
    relationship: {
      sourceColumn: string;
      targetColumn: string;
    };
  }[] = [];
  
  // Tables that this table has foreign keys to
  table.foreignKeys.forEach(fk => {
    const relatedTable = findTable(metadata, fk.foreignSchema, fk.foreignTable);
    if (relatedTable) {
      relatedTables.push({
        table: relatedTable,
        relationship: {
          sourceColumn: fk.columnName,
          targetColumn: fk.foreignColumn,
        },
      });
    }
  });
  
  // Tables that have foreign keys to this table
  metadata.forEach(otherTable => {
    otherTable.foreignKeys.forEach(fk => {
      if (fk.foreignSchema === schema && fk.foreignTable === name) {
        relatedTables.push({
          table: otherTable,
          relationship: {
            sourceColumn: fk.foreignColumn,
            targetColumn: fk.columnName,
          },
        });
      }
    });
  });
  
  return relatedTables;
} 