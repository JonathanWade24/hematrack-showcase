import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Prisma } from '@/generated/prisma'
import type { subject_registration } from '@/generated/prisma'

interface RegistrationData {
  first_name: string
  last_name: string
  middle_name?: string
  birth_date: string // Keep as string if received as such, Prisma expects Date
  date_of_birth: string // Duplicate? Keep for now
  sex: string
  race: string
  ethnicity: string
  patient_mrn: string
  subject_id: string
  project: string
  registration_date: string // Keep as string if received as such
  consent_date: string      // Keep as string if received as such
  corporate_id?: string
}

// Define allowed roles for creating registrations
const ALLOWED_ROLES = ['admin', 'registrar', 'editor'] // Adjust roles as needed

export async function POST(request: Request) {
  // --- Authentication & Authorization ---
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    const reason = !session ? 'No session' : !session.user ? 'No user' : 'Insufficient role';
    console.warn(`[API /registration] Unauthorized registration attempt: ${reason}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data: RegistrationData = await request.json()
    console.log("[API /registration] Received data:", data);

    // Validate required fields (basic check)
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

    // --- Database Transaction ---
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      console.log("[API /registration] Starting transaction...");

      // 1. Create Patient in PHI schema
      console.log("[API /registration] Creating patient...");
      const patient = await tx.patients.create({
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          middle_name: data.middle_name,
          // Convert string dates to Date objects for Prisma
          birth_date: new Date(data.birth_date),
          sex: data.sex,
          race: data.race,
          ethnicity: data.ethnicity,
          patient_mrn: data.patient_mrn
        }
      });
      console.log("[API /registration] Patient created:", patient.patient_mrn);

      // 2. Create Omics Subject in Laboratory schema
      console.log("[API /registration] Creating omics subject...");
      const omicsSubject = await tx.omics_subjects.create({
        data: {
          subject_id: data.subject_id,
          patient_mrn: data.patient_mrn,
          project: data.project
        }
      });
      console.log("[API /registration] Omics subject created:", omicsSubject.subject_id);

      // 3. Create Subject Registration in PHI schema
      console.log("[API /registration] Creating subject registration...");
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
      console.log("[API /registration] Subject registration created:", registration.subject_id);

      console.log("[API /registration] Transaction successful.");
      return { patient, omicsSubject, registration };
    });

    // --- Return Success Response ---
    return NextResponse.json(result);

  } catch (error) {
    console.error('[API /registration] Error during registration transaction:', error);

    // Check for Prisma unique constraint violation (P2002)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        let conflictingField = 'Unknown field';
        if (Array.isArray(error.meta?.target)) {
            conflictingField = (error.meta.target as string[]).join(', ');
        }
        console.warn(`[API /registration] Unique constraint violation on field(s): ${conflictingField}`);
        return NextResponse.json(
            { error: `Unique constraint violation: A record with conflicting data already exists (field: ${conflictingField}).` },
            { status: 409 } // Conflict
        );
    }

    // Generic server error
    const errorMessage = error instanceof Error ? error.message : 'Failed to register subject'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Define allowed roles for accessing this sensitive route
const ALLOWED_ROLES_GET = ['admin', 'clinician', 'editor']

export async function GET(request: Request) {
  // Use the imported prisma instance directly
  // const prisma = getPrismaClient(); // Remove this incorrect instantiation
  
  // --- Authentication & Authorization ---
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Add role check for GET request
  if (!session.user.role || !ALLOWED_ROLES_GET.includes(session.user.role)) {
    console.warn(`[API /registration] Unauthorized GET attempt: Insufficient role`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // TODO: Implement actual GET logic here using the imported `prisma` instance
  // Example: Fetch all registrations (adjust as needed)
  try {
    const registrations = await prisma.subject_registration.findMany({
      orderBy: { registration_date: 'desc' },
      // Add includes or selects as needed
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
} 