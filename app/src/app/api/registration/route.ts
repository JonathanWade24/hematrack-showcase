import { NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma' // Commented out
import { auth } from '@/app/api/auth/[...nextauth]/route'
// import { Prisma } from '@/generated/prisma' // Commented out
// import type { subject_registration } from '@/generated/prisma' // Commented out

interface RegistrationData {
  first_name: string
  last_name: string
  middle_name?: string
  birth_date: string 
  date_of_birth: string 
  sex: string
  race: string
  ethnicity: string
  patient_mrn: string
  subject_id: string
  project: string
  registration_date: string 
  consent_date: string      
  corporate_id?: string
}

const ALLOWED_ROLES = ['admin', 'registrar', 'editor'] 

export async function POST(request: Request) {
  const session = await auth()
  if (!session || !session.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    const reason = !session ? 'No session' : !session.user ? 'No user' : 'Insufficient role';
    console.warn(`[API /registration] Unauthorized registration attempt: ${reason}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // const data: RegistrationData = await request.json() // Keep if needed for basic validation or logging
    console.log("[API /registration] Received registration attempt. Functionality temporarily disabled pending Drizzle migration.");

    // --- Prisma logic temporarily commented out ---
    /*
    const requiredFields: (keyof RegistrationData)[] = [
        'first_name', 'last_name', 'birth_date', 'date_of_birth', 'sex',
        'race', 'ethnicity', 'patient_mrn', 'subject_id', 'project',
        'registration_date', 'consent_date'
    ];
    for (const field of requiredFields) {
        if (!data[field]) {
            return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
        }
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      console.log("[API /registration] Starting transaction...");
      const patient = await tx.patients.create({
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          middle_name: data.middle_name,
          birth_date: new Date(data.birth_date),
          sex: data.sex,
          race: data.race,
          ethnicity: data.ethnicity,
          patient_mrn: data.patient_mrn
        }
      });
      const omicsSubject = await tx.omics_subjects.create({
        data: {
          subject_id: data.subject_id,
          patient_mrn: data.patient_mrn,
          project: data.project
        }
      });
      const registration = await tx.subject_registration.create({
        data: {
          subject_id: data.subject_id,
          patient_mrn: data.patient_mrn,
          registration_date: new Date(data.registration_date),
          consent_date: new Date(data.consent_date),
          corporate_id: data.corporate_id || null,
          first_name: data.first_name,
          middle_name: data.middle_name || null,
          last_name: data.last_name,
          date_of_birth: new Date(data.date_of_birth)
        }
      });
      return { patient, omicsSubject, registration };
    });
    return NextResponse.json(result);
    */
    // --- End of commented out Prisma logic ---

    return NextResponse.json(
      { 
          success: false, 
          message: "Registration POST functionality is temporarily disabled pending migration to Drizzle ORM.",
          data: null 
      }, 
      { status: 503 } // Service Unavailable
    );

  } catch (error) {
    console.error('[API /registration] Error during POST (handler disabled):', error);
    // if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') { // Commented out
    //     let conflictingField = 'Unknown field';
    //     if (Array.isArray(error.meta?.target)) {
    //         conflictingField = (error.meta.target as string[]).join(', ');
    //     }
    //     return NextResponse.json(
    //         { error: `Unique constraint violation: A record with conflicting data already exists (field: ${conflictingField}).` },
    //         { status: 409 } 
    //     );
    // }
    const errorMessage = error instanceof Error ? error.message : 'Failed to process registration request (handler disabled)'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

const ALLOWED_ROLES_GET = ['admin', 'clinician', 'editor']

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.role || !ALLOWED_ROLES_GET.includes(session.user.role)) {
    console.warn(`[API /registration] Unauthorized GET attempt: Insufficient role`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  console.log("[API /registration] Received GET request. Functionality temporarily disabled pending Drizzle migration.");
  
  // --- Prisma logic temporarily commented out ---
  /*
  try {
    const registrations = await prisma.subject_registration.findMany({
      orderBy: { registration_date: 'desc' },
    });
    return NextResponse.json(registrations);
  } catch (error) {
    console.error('[API /registration] Error fetching registrations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch registrations'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
  */
  // --- End of commented out Prisma logic ---

  return NextResponse.json(
    { 
        success: false, 
        message: "Registration GET functionality is temporarily disabled pending migration to Drizzle ORM.",
        data: [] 
    }, 
    { status: 503 } // Service Unavailable
  );
} 