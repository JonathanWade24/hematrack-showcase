import { NextResponse } from 'next/server'
import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/db'
import { convertToNumber } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log(`Preview API called for type: ${type}, limit: ${limit}`)

    if (!type) {
      console.error('Preview API error: Data type is required')
      return NextResponse.json(
        { error: 'Data type is required' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS policies
    const supabase = getSupabaseAdminClient()
    console.log('Using admin client to bypass RLS policies')
    
    // Check if the table exists first to provide better debugging
    const checkTable = async (schema: string, table: string): Promise<boolean> => {
      try {
        const { count, error } = await supabase.from('pg_tables')
          .select('*', { count: 'exact', head: true })
          .eq('schemaname', schema)
          .eq('tablename', table)
        
        if (error) {
          console.error(`Error checking if table ${schema}.${table} exists:`, error)
          return false
        }
        
        const exists = count ? count > 0 : false
        console.log(`Table ${schema}.${table} exists: ${exists}`)
        
        // If the table exists, check its columns
        if (exists) {
          try {
            console.log(`Listing columns for table ${schema}.${table}...`)
            const { data: columns, error: columnsError } = await supabase
              .from('information_schema.columns')
              .select('column_name')
              .eq('table_schema', schema)
              .eq('table_name', table)
              .order('ordinal_position', { ascending: true })
            
            if (columnsError) {
              console.error(`Error fetching columns for ${schema}.${table}:`, columnsError)
            } else if (columns) {
              console.log(`Columns in ${schema}.${table}:`, columns.map(c => c.column_name))
            }
          } catch (columnError) {
            console.error(`Error fetching columns info:`, columnError)
          }
        }
        
        // If 'labs' table doesn't exist, check for case variations
        if (!exists && table.toLowerCase() === 'labs') {
          console.log('Checking for case variations of the labs table...')
          const { data: tables, error: tablesError } = await supabase
            .from('pg_tables')
            .select('tablename')
            .eq('schemaname', schema)
            .ilike('tablename', '%lab%')
          
          if (tablesError) {
            console.error('Error checking for lab table variations:', tablesError)
          } else if (tables && tables.length > 0) {
            console.log('Found potential lab tables:', tables.map(t => t.tablename))
          } else {
            console.log('No lab-related tables found in schema')
          }
        }
        
        return exists
      } catch (e) {
        console.error(`Exception checking table ${schema}.${table}:`, e)
        return false
      }
    }
    
    let data
    let tableChecked = false

    console.log(`Processing preview request for data type: ${type}`)
    
    switch (type) {
      case 'demographics':
        tableChecked = await checkTable('phi', 'patients')
        
        console.log('Fetching patients data...')
        const { data: patients, error: patientsError } = await supabase
          .schema('phi')
          .from('patients')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)
        
        if (patientsError) {
          console.error('Error fetching patients data:', patientsError)
          throw patientsError
        }
        
        console.log(`Retrieved ${patients?.length || 0} patient records`)
        data = patients
        break

      case 'bonemarrow':
        tableChecked = await checkTable('clinical', 'bone_marrow')
        
        console.log('Fetching bone marrow data...')
        const { data: boneMarrow, error: boneMarrowError } = await supabase
          .schema('clinical')
          .from('bone_marrow')
          .select('*')
          .order('result_time', { ascending: false })
          .limit(limit)
        
        if (boneMarrowError) {
          console.error('Error fetching bone marrow data:', boneMarrowError)
          throw boneMarrowError
        }
        
        console.log(`Retrieved ${boneMarrow?.length || 0} bone marrow records`)
        data = boneMarrow
        break

      case 'ipadmissions':
        tableChecked = await checkTable('clinical', 'ip_admissions')
        
        console.log('Fetching IP admissions data...')
        const { data: ipAdmissions, error: ipAdmissionsError } = await supabase
          .schema('clinical')
          .from('ip_admissions')
          .select('*')
          .order('adm_date_time', { ascending: false })
          .limit(limit)
        
        if (ipAdmissionsError) {
          console.error('Error fetching IP admissions data:', ipAdmissionsError)
          throw ipAdmissionsError
        }
        
        console.log(`Retrieved ${ipAdmissions?.length || 0} IP admission records`)
        data = ipAdmissions
        break

      case 'opavsmeds':
        tableChecked = await checkTable('clinical', 'op_medications')
        
        console.log('Fetching OP medications data...')
        const { data: opMeds, error: opMedsError } = await supabase
          .schema('clinical')
          .from('op_medications')
          .select('*')
          .order('visit_date', { ascending: false })
          .limit(limit)
        
        if (opMedsError) {
          console.error('Error fetching OP medications data:', opMedsError)
          throw opMedsError
        }
        
        console.log(`Retrieved ${opMeds?.length || 0} OP medication records`)
        data = opMeds
        break

      case 'opvisits':
        tableChecked = await checkTable('clinical', 'op_visits')
        
        console.log('Fetching OP visits data...')
        try {
          // First try to get count to verify the table has data
          const { count, error: countError } = await supabase
            .schema('clinical')
            .from('op_visits')
            .select('*', { count: 'exact', head: true })
          
          if (countError) {
            console.error('Error checking OP visits count:', countError)
          } else {
            console.log(`OP visits table contains ${count || 0} records`)
          }
          
          const { data: opVisits, error: opVisitsError } = await supabase
            .schema('clinical')
            .from('op_visits')
            .select('*')
            .order('visit_date', { ascending: false })
            .limit(limit)
          
          if (opVisitsError) {
            console.error('Error fetching OP visits data:', opVisitsError)
            throw opVisitsError
          }
          
          // Format current_icd10_list to be more readable in preview
          if (opVisits && opVisits.length > 0) {
            opVisits.forEach(visit => {
              if (visit.current_icd10_list && Array.isArray(visit.current_icd10_list)) {
                visit.current_icd10_list = visit.current_icd10_list.join(', ');
              }
            });
          }
          
          console.log(`Retrieved ${opVisits?.length || 0} OP visit records`)
          data = opVisits
        } catch (error) {
          console.error('Error processing OP visits preview:', error)
          // Return empty array instead of throwing to avoid breaking the preview
          data = []
        }
        break

      case 'ipmeds':
        tableChecked = await checkTable('clinical', 'ip_medications')
        
        console.log('Fetching IP medications data...')
        const { data: ipMeds, error: ipMedsError } = await supabase
          .schema('clinical')
          .from('ip_medications')
          .select('*')
          .order('adm_date_time', { ascending: false })
          .limit(limit)
        
        if (ipMedsError) {
          console.error('Error fetching IP medications data:', ipMedsError)
          throw ipMedsError
        }
        
        console.log(`Retrieved ${ipMeds?.length || 0} IP medication records`)
        data = ipMeds
        break

      case 'ipvisits':
        tableChecked = await checkTable('clinical', 'ip_visits')
        
        console.log('Fetching IP visits data...')
        const { data: ipVisits, error: ipVisitsError } = await supabase
          .schema('clinical')
          .from('ip_visits')
          .select('*')
          .order('admit_date', { ascending: false })
          .limit(limit)
        
        if (ipVisitsError) {
          console.error('Error fetching IP visits data:', ipVisitsError)
          throw ipVisitsError
        }
        
        console.log(`Retrieved ${ipVisits?.length || 0} IP visit records`)
        data = ipVisits
        break

      case 'labs':
        tableChecked = await checkTable('clinical', 'Labs')
        
        console.log('Fetching labs data...')
        
        try {
          // First try to get count to verify the table has data
          const { count, error: countError } = await supabase
            .schema('clinical')
            .from('Labs')
            .select('*', { count: 'exact', head: true })
          
          if (countError) {
            console.error('Error checking Labs count:', countError)
          } else {
            console.log(`Labs table contains ${count || 0} records`)
          }
          
          // Only try 'Labs' with capital L since that's the correct table name
          const { data: labs, error: labsError } = await supabase
            .schema('clinical')
            .from('Labs')
            .select('*')
            .order('result_time', { ascending: false })
            .limit(limit)
          
          if (labsError) {
            console.error('Error fetching Labs data:', labsError)
            throw labsError
          }
          
          console.log(`Retrieved ${labs?.length || 0} lab records`)
          data = labs
        } catch (error) {
          console.error('Error processing labs preview:', error)
          // Return empty array instead of throwing to avoid breaking the preview
          data = []
        }
        break

      default:
        console.error(`Invalid data type provided: ${type}`)
        return NextResponse.json(
          { error: 'Invalid data type' },
          { status: 400 }
        )
    }

    // If we got here without data, it's an issue
    if (!data || data.length === 0) {
      console.warn(`No data found for type: ${type}. Table checked: ${tableChecked}`)
      
      // Try to get row count from the table to see if it's empty or we have access issues
      try {
        let table = ''
        let schema = 'clinical'
        
        switch (type) {
          case 'demographics':
            table = 'patients'
            schema = 'phi'
            break
          case 'bonemarrow':
            table = 'bone_marrow'
            break
          case 'ipadmissions':
            table = 'ip_admissions'
            break
          case 'opavsmeds':
            table = 'op_medications'
            break
          case 'opvisits':
            table = 'op_visits'
            break
          case 'ipmeds':
            table = 'ip_medications'
            break
          case 'ipvisits':
            table = 'ip_visits'
            break
          case 'labs':
            table = 'Labs'  // Use capital 'L' for Labs table
            break
        }
        
        if (table) {
          const { count, error } = await supabase.schema(schema)
            .from(table)
            .select('*', { count: 'exact', head: true })
          
          console.log(`Count query for ${schema}.${table}: count=${count}, error=${error ? JSON.stringify(error) : 'none'}`)
        }
      } catch (countError) {
        console.error('Error getting row count:', countError)
      }
    }

    console.log(`Successfully returning ${data?.length || 0} records for preview`)
    return NextResponse.json({ 
      data: convertToNumber(data),
      debug: {
        type,
        recordCount: data?.length || 0,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Preview API error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch preview data',
        errorDetails: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 