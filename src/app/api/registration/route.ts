import { NextResponse } from 'next/server'
import { prisma } from '@/db'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Validate required fields
    const requiredFields = [
      'subject_id',
      'registration_date',
      'consent_date',
      'patient_mrn',
      'first_name',
      'last_name',
      'date_of_birth'
    ]

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Create patient record first
    const patient = await prisma.patients.create({
      data: {
        patient_mrn: data.patient_mrn,
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
        birth_date: new Date(data.date_of_birth)
      }
    })

    // Create omics_subjects record
    const omicsSubject = await prisma.omics_subjects.create({
      data: {
        subject_id: data.subject_id,
        patient_mrn: data.patient_mrn,
        project: 'OMI' // Default project value
      }
    })

    // Create subject_registration record
    const registration = await prisma.subject_registration.create({
      data: {
        subject_id: data.subject_id,
        registration_date: new Date(data.registration_date),
        consent_date: new Date(data.consent_date),
        corporate_id: data.corporate_id,
        patient_mrn: data.patient_mrn,
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
        date_of_birth: new Date(data.date_of_birth)
      }
    })

    return NextResponse.json(
      { 
        message: 'Patient registered successfully',
        data: {
          patient,
          omicsSubject,
          registration
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)
    
    // Handle unique constraint violations
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { message: 'A record with this Subject ID or MRN already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to register patient' },
      { status: 500 }
    )
  }
} 