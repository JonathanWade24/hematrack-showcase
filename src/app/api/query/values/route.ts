import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Initialize Prisma client
const prisma = new PrismaClient();

// Define the request schema
const ColumnValuesRequestSchema = z.object({
  schema: z.string(),
  table: z.string(),
  column: z.string(),
  search: z.string().optional(),
  limit: z.number().optional().default(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schema, table, column, search, limit } = ColumnValuesRequestSchema.parse(body);
    
    // Validate table, schema, and column names to prevent SQL injection
    if (!/^[a-zA-Z0-9_]+$/.test(table) || !/^[a-zA-Z0-9_]+$/.test(schema) || !/^[a-zA-Z0-9_]+$/.test(column)) {
      throw new Error('Invalid table, schema, or column name');
    }
    
    // Build the SQL query to get distinct values and their counts
    let sql = `
      SELECT 
        "${column}" as value, 
        COUNT(*) as count
      FROM 
        "${schema}"."${table}"
      WHERE 
        "${column}" IS NOT NULL
    `;
    
    // Add search condition if provided
    if (search) {
      sql += ` AND "${column}"::text ILIKE $1`;
    }
    
    // Group by and order by
    sql += `
      GROUP BY 
        "${column}"
      ORDER BY 
        count DESC, 
        "${column}"
      LIMIT ${limit}
    `;
    
    // Execute the query
    const values = search 
      ? await prisma.$queryRawUnsafe(sql, `%${search}%`)
      : await prisma.$queryRawUnsafe(sql);
    
    // Return the results
    return NextResponse.json({ values }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch column values';
    console.error('Error fetching column values:', errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 