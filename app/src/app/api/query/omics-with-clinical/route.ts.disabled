import { NextResponse } from 'next/server';
import { prisma } from '@/db';
import type { FilterCriteria } from '@/components/data/DataDownload';

export async function POST(request: Request) {
  try {
    const filters = await request.json() as FilterCriteria;
    console.log('Received filters:', JSON.stringify(filters, null, 2));
    
    // Extract parameters from filters
    const genotypes = filters.groups
      .flatMap(g => g.conditions
        .filter(c => c.field === 'omics_results.genotype')
        .map(c => c.value))
      .flat();
    
    const ageCondition = filters.groups
      .flatMap(g => g.conditions
        .filter(c => c.field === 'patients.age'))
      .at(0);
    
    const ageMin = ageCondition?.operator === 'greater_than' ? ageCondition.value : 
                  (ageCondition?.operator === 'between' ? (ageCondition.value as number[])[0] : null);
    
    const ageMax = ageCondition?.operator === 'less_than' ? ageCondition.value : 
                  (ageCondition?.operator === 'between' ? (ageCondition.value as number[])[1] : null);
    
    // Extract time window
    const startDate = filters.timeWindow.type === 'absolute' ? 
                     filters.timeWindow.start : 
                     new Date(Date.now() - (filters.timeWindow.relativeDays || 30) * 24 * 60 * 60 * 1000);
    
    const endDate = filters.timeWindow.type === 'absolute' ? 
                   filters.timeWindow.end : 
                   new Date();
    
    // Extract lab components and medications
    const labComponents = filters.variables.clinical.labs.map(l => l.component_id);
    const medications = filters.variables.clinical.medications.flatMap(m => m.generic_description);
    
    // Extract columns to exclude NA values
    const excludeNaColumns = Object.keys(filters.inclusionCriteria || {})
      .filter(key => filters.inclusionCriteria?.[key]?.excludeNA);
    
    console.log('Executing query with parameters:', {
      genotypes,
      ageMin,
      ageMax,
      startDate,
      endDate,
      labComponents,
      medications,
      excludeNaColumns
    });
    
    // Call the stored procedure
    const results = await prisma.$queryRaw`
      CALL get_omics_with_clinical(
        ${genotypes}::TEXT[],
        ${ageMin}::INT,
        ${ageMax}::INT,
        ${startDate}::DATE,
        ${endDate}::DATE,
        ${labComponents}::TEXT[],
        ${medications}::TEXT[],
        ${excludeNaColumns}::TEXT[]
      )
    `;
    
    console.log(`Query returned ${Array.isArray(results) ? results.length : 0} results`);
    
    // Convert to CSV
    const headers = Object.keys(results[0] || {});
    const rows = results.map(row => headers.map(h => row[h]));
    
    return NextResponse.json({
      headers,
      rows
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return NextResponse.json({ 
      error: 'Failed to execute query',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 