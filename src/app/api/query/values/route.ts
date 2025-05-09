import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { Prisma } from '@/generated/prisma'; // Import Prisma namespace
import { z } from 'zod';

export const dynamic = "force-dynamic"; // Ensure this route is handled dynamically

// Define allowed columns for querying distinct values
// Key: "schema.table.column", Value: { model: prismaModel, column: columnName }
// NOTE: Prisma doesn't use schema names directly in the client object keys.
// The model name implies the schema based on schema.prisma.
// Use Prisma.ModelName based on the generated client types
const ALLOWED_COLUMNS: Record<string, { model: keyof typeof Prisma.ModelName, column: string, allowedRoles?: string[] }> = {
  'laboratory.omics_results.genotype': { 
      model: 'omics_results', 
      column: 'genotype' 
      // No specific role needed for this example column
  },
  'laboratory.omics_subjects.project': { 
      model: 'omics_subjects', 
      column: 'project' 
      // No specific role needed for this example column
  },
  'phi.patients.sex': { 
      model: 'patients', 
      column: 'sex', 
      allowedRoles: ['admin', 'clinician', 'editor'] // Example: Restrict access to PHI 
  },
   'phi.patients.race': { 
      model: 'patients', 
      column: 'race', 
      allowedRoles: ['admin', 'clinician', 'editor'] 
  },
   'phi.patients.ethnicity': { 
      model: 'patients', 
      column: 'ethnicity', 
      allowedRoles: ['admin', 'clinician', 'editor'] 
  },
  // Add other allowed schema.table.column combinations here
};

export async function GET(request: Request) {
  // --- Authentication ---
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const schema = searchParams.get('schema')?.toLowerCase();
    const table = searchParams.get('table')?.toLowerCase();
    const column = searchParams.get('column')?.toLowerCase();
    const search = searchParams.get('search'); // Keep original case for search term

    if (!schema || !table || !column) {
      return NextResponse.json({ error: 'Missing required parameters: schema, table, column' }, { status: 400 });
    }

    const queryKey = `${schema}.${table}.${column}`;
    const allowedColumnConfig = ALLOWED_COLUMNS[queryKey];

    if (!allowedColumnConfig) {
        console.warn(`[API /query/values] Attempt to query disallowed column: ${queryKey}`);
      return NextResponse.json({ error: `Querying values for ${schema}.${table}.${column} is not allowed.` }, { status: 403 });
    }
    
    // --- Authorization (Role Check if applicable) ---
    if (allowedColumnConfig.allowedRoles && 
        (!session.user.role || !allowedColumnConfig.allowedRoles.includes(session.user.role))) {
        console.warn(`[API /query/values] User ${session.user.email} (Role: ${session.user.role}) tried accessing restricted column ${queryKey}`);
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- Data Fetching (Type-Safe) ---
    const { model: modelName, column: columnName } = allowedColumnConfig;
    
    // Construct the where clause for filtering
    let whereClause: any = {
        [columnName]: { not: null } // Always exclude nulls
    };
    if (search) {
        // Assuming case-insensitive search for string columns
        // Adjust if specific columns need different search logic (e.g., exact match for numbers)
        whereClause[columnName] = {
            ...whereClause[columnName], // Keep not: null
            contains: search,
            mode: 'insensitive' 
        };
    }
    
    // Use the Prisma client dynamically but safely via the validated modelName
    const values = await (prisma[modelName] as any).findMany({
        distinct: [columnName],
        where: whereClause,
        select: {
            [columnName]: true
        },
        orderBy: {
            [columnName]: 'asc'
        },
        take: 100 // Add a reasonable limit for dropdowns/autocomplete
    });
    
    // Extract and filter unique values
    const uniqueValues = values
        .map((v: any) => v[columnName])
        .filter((v: string | number | null): v is string | number => v !== null && (typeof v === 'string' || typeof v === 'number')); 
        // .sort() is implicitly handled by orderBy

    return NextResponse.json(uniqueValues);

  } catch (error) {
    console.error('[API /query/values] Error fetching distinct values:', error);
    // Handle potential Prisma errors if a column doesn't support filtering/ordering
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
         return NextResponse.json({ error: `Database query error: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to fetch values' }, { status: 500 });
  }
} 