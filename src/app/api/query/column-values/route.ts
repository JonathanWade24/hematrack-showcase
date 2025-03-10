import { NextResponse } from 'next/server';
import { prisma } from '@/db';
import { z } from 'zod';

// Define request schema
const RequestSchema = z.object({
  schema: z.string(),
  table: z.string(),
  column: z.string(),
  search: z.string().optional(),
  limit: z.number().optional().default(100)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schema, table, column, search, limit } = RequestSchema.parse(body);

    // Build and execute the query to get distinct values and their counts
    const query = `
      SELECT 
        "${column}" as value,
        COUNT(*) as count
      FROM "${schema}"."${table}"
      WHERE "${column}" IS NOT NULL
      ${search ? `AND "${column}"::text ILIKE $1` : ''}
      GROUP BY "${column}"
      ORDER BY count DESC, "${column}"
      LIMIT $${search ? '2' : '1'}
    `;

    const params = search 
      ? [`%${search}%`, limit]
      : [limit];

    const results = await prisma.$queryRawUnsafe(query, ...params);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching column values:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch column values' },
      { status: 500 }
    );
  }
} 