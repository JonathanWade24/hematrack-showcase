import { NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma' // Commented out
import { auth } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = "force-dynamic"; // Ensure this route is handled dynamically

// Define allowed roles for accessing this data import preview
const ALLOWED_ROLES = ['admin', 'editor'] // Adjust roles as needed

export async function GET(request: Request) {
  // --- Authentication & Authorization ---
  const session = await auth()
  if (!session || !session.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    const reason = !session ? 'No session' : !session.user ? 'No user' : 'Insufficient role';
    console.warn(`[API /data-import/preview] Unauthorized access attempt: ${reason}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // const { searchParams } = new URL(request.url) // Keep if basic validation or logging is needed
    // const type = searchParams.get('type')
    // const limit = parseInt(searchParams.get('limit') || '10', 10)

    console.log("[API /data-import/preview] Request received. Functionality temporarily disabled pending Drizzle migration.");

    // --- Prisma logic temporarily commented out ---
    /*
    if (!type) {
      return NextResponse.json({ error: 'Query parameter "type" is required' }, { status: 400 })
    }
    if (isNaN(limit) || limit <= 0) {
        return NextResponse.json({ error: 'Query parameter "limit" must be a positive number' }, { status: 400 })
    }

    let data: any[] = [];
    let error: Error | null = null;

    try {
        switch (type.toLowerCase()) { 
          case 'demographics':
            data = await prisma.patients.findMany({
              orderBy: { created_at: 'desc' }, 
              take: limit,
            });
            break
          case 'bonemarrow':
            data = await prisma.bone_marrow.findMany({
              orderBy: { result_time: 'desc' },
              take: limit,
            });
            break
          case 'ipadmissions':
            data = await prisma.ip_admissions.findMany({
              orderBy: { adm_date_time: 'desc' },
              take: limit,
            });
            break
          case 'opavsmeds': 
            data = await prisma.op_medications.findMany({
              orderBy: { visit_date: 'desc' },
              take: limit,
            });
            break
          case 'opvisits':
            data = await prisma.op_visits.findMany({
              orderBy: { visit_date: 'desc' },
              take: limit,
            });
             data.forEach((visit: any) => {
               if (visit.current_icd10_list && Array.isArray(visit.current_icd10_list)) {
                 visit.current_icd10_list = visit.current_icd10_list.join(', ');
               }
             });
            break
          case 'ipmeds': 
            data = await prisma.ip_medications.findMany({
              orderBy: { adm_date_time: 'desc' }, 
              take: limit,
            });
            break
          default:
            return NextResponse.json({ error: `Invalid data type specified: ${type}` }, { status: 400 });
        }
    } catch (fetchError) {
         error = fetchError instanceof Error ? fetchError : new Error('Failed to fetch data');
         data = []; 
    }

    if (error) {
         return NextResponse.json({
            headers: ['Error'],
            rows: [[`Failed to fetch preview data: ${error.message}`]]
         });
    }
    if (data.length === 0) {
        return NextResponse.json({ headers: ['No Data'], rows: [['No preview data available for this type.']] });
    }

    const headers = Object.keys(data[0] || {});
    const rows = data.map(row => headers.map(header => row[header] ?? null));
    return NextResponse.json({ headers, rows });
    */
    // --- End of commented out Prisma logic ---

    return NextResponse.json(
      { 
          success: false, 
          message: "Data import preview GET functionality is temporarily disabled pending migration to Drizzle ORM.",
          headers: ['Status'], 
          rows: [['Temporarily Disabled']] 
      }, 
      { status: 503 } // Service Unavailable
    );

  } catch (outerError) {
    console.error('[API /data-import/preview] Outer error (handler disabled):', outerError);
    return NextResponse.json(
      { error: 'Internal Server Error (handler disabled)' },
      { status: 500 }
    );
  }
} 