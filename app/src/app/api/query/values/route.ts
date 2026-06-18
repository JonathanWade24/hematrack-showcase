import { NextResponse } from 'next/server';
// import { prisma } from '@/lib/prisma'; // Commented out
import { auth } from '@/app/api/auth/[...nextauth]/route';
// import { Prisma } from '@/generated/prisma'; // Commented out
// import { z } from 'zod'; // Commented out if not used after Prisma removal

export const dynamic = "force-dynamic"; // Ensure this route is handled dynamically

/* // Commented out ALLOWED_COLUMNS as it's tied to Prisma models
const ALLOWED_COLUMNS: Record<string, { model: keyof typeof Prisma.ModelName, column: string, allowedRoles?: string[] }> = {
  'laboratory.omics_results.genotype': { 
      model: 'omics_results', 
      column: 'genotype' 
  },
  'laboratory.omics_subjects.project': { 
      model: 'omics_subjects', 
      column: 'project' 
  },
  'phi.patients.sex': { 
      model: 'patients', 
      column: 'sex', 
      allowedRoles: ['admin', 'clinician', 'editor'] 
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
};
*/

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // const { searchParams } = new URL(request.url); // Keep for logging if needed
    // const schema = searchParams.get('schema')?.toLowerCase();
    // const table = searchParams.get('table')?.toLowerCase();
    // const column = searchParams.get('column')?.toLowerCase();
    // const search = searchParams.get('search');

    console.log("[API /query/values] Request received. Functionality temporarily disabled pending Drizzle/alternative migration.");

    // --- Prisma logic temporarily commented out ---
    /*
    if (!schema || !table || !column) {
      return NextResponse.json({ error: 'Missing required parameters: schema, table, column' }, { status: 400 });
    }

    const queryKey = `${schema}.${table}.${column}`;
    const allowedColumnConfig = ALLOWED_COLUMNS[queryKey];

    if (!allowedColumnConfig) {
      return NextResponse.json({ error: `Querying values for ${schema}.${table}.${column} is not allowed.` }, { status: 403 });
    }
    
    if (allowedColumnConfig.allowedRoles && 
        (!session.user.role || !allowedColumnConfig.allowedRoles.includes(session.user.role))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { model: modelName, column: columnName } = allowedColumnConfig;
    
    let whereClause: any = {
        [columnName]: { not: null } 
    };
    if (search) {
        whereClause[columnName] = {
            ...whereClause[columnName], 
            contains: search,
            mode: 'insensitive' 
        };
    }
    
    const values = await (prisma[modelName] as any).findMany({
        distinct: [columnName],
        where: whereClause,
        select: {
            [columnName]: true
        },
        orderBy: {
            [columnName]: 'asc'
        },
        take: 100 
    });
    
    const uniqueValues = values
        .map((v: any) => v[columnName])
        .filter((v: string | number | null): v is string | number => v !== null && (typeof v === 'string' || typeof v === 'number')); 

    return NextResponse.json(uniqueValues);
    */
    // --- End of commented out Prisma logic ---

    return NextResponse.json(
      { 
        success: false, 
        message: "Query Values GET functionality is temporarily disabled pending migration to Drizzle/alternative ORM.",
        data: [] 
      }, 
      { status: 503 } // Service Unavailable
    );

  } catch (error) {
    console.error('[API /query/values] Error (handler disabled):', error);
    // if (error instanceof Prisma.PrismaClientKnownRequestError) { // Commented out Prisma-specific error
    //      return NextResponse.json({ error: `Database query error: ${error.message}` }, { status: 500 });
    // }
    return NextResponse.json({ error: 'Failed to fetch values (handler disabled)' }, { status: 500 });
  }
} 