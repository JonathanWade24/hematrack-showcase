/**
 * This is a simple test script to verify the metadata API.
 * You can run it with:
 * npx ts-node src/app/api/query/metadata/test.ts
 */

import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

async function testMetadataQuery() {
  try {
    console.log('Testing metadata query...');
    
    // Execute the query from the route.ts file
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
      WHERE uc.table_schema = 'phi' AND uc.table_name = 'patients'  -- Just test with one table for brevity
      GROUP BY 
        uc.table_schema, uc.table_name
      ORDER BY 
        uc.table_schema, uc.table_name;
    `;
    
    // Print the result
    console.log('Query result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Check if the result has the expected structure
    if (Array.isArray(result) && result.length > 0) {
      const table = result[0];
      console.log('\nVerification:');
      console.log(`Table: ${table.schema}.${table.name}`);
      console.log(`Columns: ${table.columns.length}`);
      console.log(`Foreign Keys: ${table.foreignKeys.length}`);
      
      // Check for duplicate columns
      const columnNames = table.columns.map((col: any) => col.name);
      const uniqueColumnNames = [...new Set(columnNames)];
      if (columnNames.length !== uniqueColumnNames.length) {
        console.log(`Warning: Table has duplicate columns: ${columnNames.length} total, ${uniqueColumnNames.length} unique`);
      } else {
        console.log('No duplicate columns found.');
      }
      
      console.log('\nTest completed successfully!');
    } else {
      console.log('Error: Unexpected result structure');
    }
  } catch (error) {
    console.error('Error testing metadata query:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMetadataQuery(); 