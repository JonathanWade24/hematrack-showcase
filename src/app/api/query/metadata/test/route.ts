import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

export async function GET() {
  try {
    // Execute a simplified version of the metadata query
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
          t.table_schema IN ('phi')  -- Just test with phi schema for brevity
          AND t.table_type = 'BASE TABLE'
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
    
    // Return the result
    return NextResponse.json({
      message: 'Metadata API test successful',
      tables: result
    }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch database metadata';
    console.error('Error testing metadata API:', errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 