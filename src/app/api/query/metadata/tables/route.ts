import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { TableMetadataSchema } from '@/lib/metadata-cache';

// Initialize Prisma client
const prisma = new PrismaClient();

export async function GET() {
  try {
    // Query PostgreSQL system tables to get table, column, and foreign key information
    const result = await prisma.$queryRaw`
      WITH foreign_keys AS (
        -- Get foreign keys from information_schema
        SELECT 
          kcu.table_schema AS table_schema,
          kcu.table_name AS table_name,
          kcu.column_name AS column_name,
          ccu.table_schema AS foreign_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM 
          information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        
        UNION ALL
        
        -- Add explicit relationships based on Prisma schema
        -- Clinical tables to patients
        SELECT 
          'clinical' AS table_schema,
          'Labs' AS table_name,
          'patient_mrn' AS column_name,
          'phi' AS foreign_schema,
          'patients' AS foreign_table_name,
          'patient_mrn' AS foreign_column_name
        
        UNION ALL
        SELECT 
          'clinical' AS table_schema,
          'bone_marrow' AS table_name,
          'patient_mrn' AS column_name,
          'phi' AS foreign_schema,
          'patients' AS foreign_table_name,
          'patient_mrn' AS foreign_column_name
        
        UNION ALL
        SELECT 
          'clinical' AS table_schema,
          'demographics' AS table_name,
          'patient_mrn' AS column_name,
          'phi' AS foreign_schema,
          'patients' AS foreign_table_name,
          'patient_mrn' AS foreign_column_name
        
        UNION ALL
        SELECT 
          'clinical' AS table_schema,
          'ip_admissions' AS table_name,
          'patient_mrn' AS column_name,
          'phi' AS foreign_schema,
          'patients' AS foreign_table_name,
          'patient_mrn' AS foreign_column_name
        
        UNION ALL
        SELECT 
          'clinical' AS table_schema,
          'ip_medications' AS table_name,
          'patient_mrn' AS column_name,
          'phi' AS foreign_schema,
          'patients' AS foreign_table_name,
          'patient_mrn' AS foreign_column_name
        
        UNION ALL
        SELECT 
          'clinical' AS table_schema,
          'op_medications' AS table_name,
          'patient_mrn' AS column_name,
          'phi' AS foreign_schema,
          'patients' AS foreign_table_name,
          'patient_mrn' AS foreign_column_name
        
        UNION ALL
        SELECT 
          'clinical' AS table_schema,
          'op_visits' AS table_name,
          'patient_mrn' AS column_name,
          'phi' AS foreign_schema,
          'patients' AS foreign_table_name,
          'patient_mrn' AS foreign_column_name
        
        UNION ALL
        SELECT 
          'clinical' AS table_schema,
          'unified_visits' AS table_name,
          'patient_mrn' AS column_name,
          'phi' AS foreign_schema,
          'patients' AS foreign_table_name,
          'patient_mrn' AS foreign_column_name
        
        UNION ALL
        -- Laboratory tables
        SELECT 
          'laboratory' AS table_schema,
          'omics_subjects' AS table_name,
          'patient_mrn' AS column_name,
          'phi' AS foreign_schema,
          'patients' AS foreign_table_name,
          'patient_mrn' AS foreign_column_name
        
        UNION ALL
        SELECT 
          'laboratory' AS table_schema,
          'omics_results' AS table_name,
          'subject_id' AS column_name,
          'laboratory' AS foreign_schema,
          'omics_subjects' AS foreign_table_name,
          'subject_id' AS foreign_column_name
        
        UNION ALL
        -- Registration
        SELECT 
          'phi' AS table_schema,
          'subject_registration' AS table_name,
          'patient_mrn' AS column_name,
          'phi' AS foreign_schema,
          'patients' AS foreign_table_name,
          'patient_mrn' AS foreign_column_name
        
        UNION ALL
        SELECT 
          'phi' AS table_schema,
          'subject_registration' AS table_name,
          'subject_id' AS column_name,
          'laboratory' AS foreign_schema,
          'omics_subjects' AS foreign_table_name,
          'subject_id' AS foreign_column_name
        
        -- Add bidirectional relationship for omics_subjects and omics_results
        UNION ALL
        SELECT 
          'laboratory' AS table_schema,
          'omics_subjects' AS table_name,
          'subject_id' AS column_name,
          'laboratory' AS foreign_schema,
          'omics_results' AS foreign_table_name,
          'subject_id' AS foreign_column_name
      ),
      unique_columns AS (
        -- Get unique columns to avoid duplicates
        SELECT DISTINCT ON (t.table_schema, t.table_name, c.column_name)
          t.table_schema,
          t.table_name,
          c.column_name,
          c.data_type,
          c.ordinal_position,
          c.data_type IN ('integer', 'bigint', 'decimal', 'numeric', 'real', 'double precision') AS is_numeric
        FROM 
          information_schema.tables t
        JOIN 
          information_schema.columns c 
          ON t.table_schema = c.table_schema 
          AND t.table_name = c.table_name
        WHERE 
          t.table_schema IN ('app', 'audit', 'clinical', 'laboratory', 'phi')
          AND t.table_type = 'BASE TABLE'
          AND t.table_name != 'audit_log'  -- Exclude audit_log table
        ORDER BY 
          t.table_schema, t.table_name, c.column_name, c.ordinal_position
      )
      SELECT 
        uc.table_schema as schema,
        uc.table_name as name,
        json_agg(
          json_build_object(
            'name', uc.column_name,
            'type', uc.data_type,
            'isNumeric', uc.is_numeric
          ) ORDER BY uc.ordinal_position
        ) as columns,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'columnName', fk.column_name,
              'foreignSchema', fk.foreign_schema,
              'foreignTable', fk.foreign_table_name,
              'foreignColumn', fk.foreign_column_name
            )
          ) FILTER (WHERE fk.column_name IS NOT NULL),
          '[]'
        ) as "foreignKeys"
      FROM 
        unique_columns uc
      LEFT JOIN
        foreign_keys fk
        ON uc.table_schema = fk.table_schema
        AND uc.table_name = fk.table_name
      GROUP BY 
        uc.table_schema, uc.table_name
      ORDER BY 
        uc.table_schema, uc.table_name;
    `;

    // Validate and transform the result
    const tables = TableMetadataSchema.parse(result);
    
    // Additional check for duplicate columns
    tables.forEach(table => {
      const columnNames = table.columns.map(col => col.name);
      const uniqueColumnNames = [...new Set(columnNames)];
      if (columnNames.length !== uniqueColumnNames.length) {
        console.log(`Table ${table.schema}.${table.name} has duplicate columns: ${columnNames.length} total, ${uniqueColumnNames.length} unique`);
        
        // Deduplicate columns
        const uniqueColumns = new Map();
        table.columns.forEach(col => {
          if (!uniqueColumns.has(col.name)) {
            uniqueColumns.set(col.name, col);
          }
        });
        table.columns = Array.from(uniqueColumns.values());
      }
    });

    return NextResponse.json(tables, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch database metadata';
    console.error('Error fetching table metadata:', errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}