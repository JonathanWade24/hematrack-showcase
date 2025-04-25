import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Define allowed roles for accessing this data import preview
const ALLOWED_ROLES = ['admin', 'editor'] // Adjust roles as needed

export async function GET(request: Request) {
  // --- Authentication & Authorization ---
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    const reason = !session ? 'No session' : !session.user ? 'No user' : 'Insufficient role';
    console.warn(`[API /data-import/preview] Unauthorized access attempt: ${reason}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '10', 10) // Specify radix

    console.log(`[API /data-import/preview] Request - Type: ${type}, Limit: ${limit}`);

    if (!type) {
      console.error('[API /data-import/preview] Error: Data type is required')
      return NextResponse.json({ error: 'Query parameter "type" is required' }, { status: 400 })
    }

    if (isNaN(limit) || limit <= 0) {
        console.error('[API /data-import/preview] Error: Invalid limit parameter')
        return NextResponse.json({ error: 'Query parameter "limit" must be a positive number' }, { status: 400 })
    }

    let data: any[] = []; // Initialize data as an empty array
    let error: Error | null = null;

    // --- Data Fetching based on Type ---
    // No need for admin client or table checks with Prisma - rely on schema and role auth.
    try {
        switch (type.toLowerCase()) { // Use lowercase for case-insensitive matching
          case 'demographics':
            console.log('[API /data-import/preview] Fetching patients data...')
            data = await prisma.patients.findMany({
              orderBy: { created_at: 'desc' }, // Assuming created_at exists and is relevant
              take: limit,
            });
            break

          case 'bonemarrow':
            console.log('[API /data-import/preview] Fetching bone marrow data...')
            data = await prisma.bone_marrow.findMany({
              orderBy: { result_time: 'desc' },
              take: limit,
            });
            break

          case 'ipadmissions':
            console.log('[API /data-import/preview] Fetching IP admissions data...')
            data = await prisma.ip_admissions.findMany({
              orderBy: { adm_date_time: 'desc' },
              take: limit,
            });
            break

          case 'opavsmeds': // Name from original code, likely op_medications
            console.log('[API /data-import/preview] Fetching OP medications data...')
            data = await prisma.op_medications.findMany({
              orderBy: { visit_date: 'desc' },
              take: limit,
            });
            break

          case 'opvisits':
            console.log('[API /data-import/preview] Fetching OP visits data...')
            data = await prisma.op_visits.findMany({
              orderBy: { visit_date: 'desc' },
              take: limit,
            });
             // Format current_icd10_list (assuming it's stored differently now or needs parsing)
             // Prisma typically returns arrays directly if defined as such in schema. Adapting original logic:
             data.forEach((visit: any) => {
               if (visit.current_icd10_list && Array.isArray(visit.current_icd10_list)) {
                 // If it's already an array (as Prisma might return), join it.
                 // If it's a string needing parsing, adjust logic here.
                 visit.current_icd10_list = visit.current_icd10_list.join(', ');
               }
             });
            break

          case 'ipmeds': // Name from original code, likely ip_medications
            console.log('[API /data-import/preview] Fetching IP medications data...')
            data = await prisma.ip_medications.findMany({
              orderBy: { adm_date_time: 'desc' }, // Original used adm_date_time
              take: limit,
            });
            break
            
          // Removed 'ipvisits' case as it seemed duplicative/incorrect in original code
          // Add cases for other tables like 'labs' if needed
          
          default:
            console.error(`[API /data-import/preview] Error: Invalid data type "${type}" requested.`);
            return NextResponse.json({ error: `Invalid data type specified: ${type}` }, { status: 400 });
        }
        console.log(`[API /data-import/preview] Retrieved ${data.length} records for type "${type}"`);

    } catch (fetchError) {
         console.error(`[API /data-import/preview] Error fetching data for type "${type}":`, fetchError);
         error = fetchError instanceof Error ? fetchError : new Error('Failed to fetch data');
         // Set data to empty array on fetch error to allow graceful response
         data = []; 
    }

    // --- Return Response ---
    if (error) {
        // Return error if fetching failed, but structure it like success for consistent preview
         return NextResponse.json({
            headers: ['Error'],
            rows: [[`Failed to fetch preview data: ${error.message}`]]
         });
    }
    
    if (data.length === 0) {
        return NextResponse.json({ headers: ['No Data'], rows: [['No preview data available for this type.']] });
    }

    // Prepare headers and rows for the response
    const headers = Object.keys(data[0] || {});
    const rows = data.map(row => headers.map(header => row[header] ?? null)); // Use null for undefined/null

    return NextResponse.json({ headers, rows });

  } catch (outerError) {
    // Catch errors from request parsing, URL handling, etc.
    console.error('[API /data-import/preview] Outer error:', outerError);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 