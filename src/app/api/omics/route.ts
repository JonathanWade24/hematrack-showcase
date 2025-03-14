import { NextRequest, NextResponse } from 'next/server'
import { createOmicsResult, createOmicsSubject, createPatient, getOmicsResultBySampleId, getOmicsSubjectById } from '@/lib/supabase/operations'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sampleId = searchParams.get('sampleId')
  const subjectId = searchParams.get('subjectId')
  
  try {
    if (sampleId) {
      const sample = await getOmicsResultBySampleId(sampleId)
      return NextResponse.json(sample)
    }
    
    if (subjectId) {
      const subject = await getOmicsSubjectById(subjectId)
      return NextResponse.json(subject)
    }
    
    return NextResponse.json({ error: 'Missing sampleId or subjectId parameter' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching omics data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body
    
    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 })
    }
    
    let result
    
    switch (type) {
      case 'patient':
        result = await createPatient(data)
        break
      case 'subject':
        result = await createOmicsSubject(data)
        break
      case 'sample':
        result = await createOmicsResult(data)
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating omics data:', error)
    return NextResponse.json({ error: 'Failed to create data' }, { status: 500 })
  }
} 