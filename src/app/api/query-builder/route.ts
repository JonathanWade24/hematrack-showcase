import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/db';
import { Pool } from 'pg';
import sql, { SQLStatement } from 'sql-template-strings';

interface QueryBuilderRequest {
  primarySource: {
    schema: string;
    table: string;
    conditions: Record<string, { operator: string; value: any }>;
  };
  contextSource?: {
    schema: string;
    table: string;
    conditions?: Record<string, { operator: string; value: any }>;
  };
  contextSettings?: {
    direction: 'before' | 'after' | 'both' | 'exact';
    windowDays: number;
    referenceDateColumn: string;
    contextDateColumn: string;
  };
  exportFormat: 'json' | 'csv' | 'excel';
}

interface FilterCondition {
  column: string;
  operator: string;
  value: any;
}

interface JoinConditionBase {
  type: 'column';
  // How this related table links to the *previous* table in the chain
  // If this is the first related table, leftSourceAlias will be 'primary'
  leftSourceAlias: string; // e.g., 'primary' or 'rel1'
  leftColumn: string;
  rightColumn: string; // Column on the *current* related table
}

interface TimeJoinCondition {
  type: 'time';
  primarySourceAlias?: string;
  primaryDateColumn: string;
  relatedDateColumn: string;
  windowDays: number;
  direction: 'before' | 'after' | 'both';
  matchPatientId?: boolean;
  primaryPatientIdColumn?: string;
  relatedPatientIdColumn?: string;
}

type JoinCondition = JoinConditionBase | TimeJoinCondition; // Keep TimeJoinCondition for later

interface RelatedDataSource {
  relationId: string; // Alias for this table in the query (e.g., "rel1")
  schema: string;
  table: string;
  joinType: 'left' | 'inner';
  joinConditions: JoinCondition[]; // How it joins to the *previous* table ('primary' or 'relN-1')
  filters?: FilterCondition[];
  selectedColumns: string[];
}

interface OutputColumnSource {
  type?: 'source';
  source: 'primary' | string; // 'primary' or a relationId
  column: string;
  rename?: string;
}

interface OutputColumnDerived {
  type: 'derived';
  name: string;
  logic: { checkExists?: { sourceRelationId: string }; };
  rename?: string;
}

type OutputColumn = OutputColumnSource | OutputColumnDerived;

interface QueryBuilderApiRequest {
  primarySource: {
    schema: string;
    table: string;
    filters?: FilterCondition[];
  };
  relatedData?: RelatedDataSource[];
  outputColumns: OutputColumn[];
  exportFormat: 'json' | 'csv';
  limit?: number;
}

interface SqlQueryParts {
  selectClause: string;
  fromClause: string;
  joinClauses: string[];
  whereClause?: string;
  parameters: any[];
  finalColumns: { key: string, label: string }[];
  limitClause?: string;
}

const isValidIdentifier = (name: string): boolean => {
    if (!name) return false; // Ensure name is not empty or null/undefined
    // Basic check: Starts with letter/underscore, followed by letters/numbers/underscores
    // Allows for longer names, doesn't check for reserved words specifically.
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
};

function generateSqlQuery(requestData: QueryBuilderApiRequest): SqlQueryParts {
  const { primarySource, relatedData = [], outputColumns, limit } = requestData;
  const parameters: any[] = [];
  let paramIndex = 1; // Positional parameter index ($1, $2, ...)
  const tableAliases = new Set<string>(['primary']); // Keep track of aliases used

  // --- Deep Validation (Basic) ---
  if (!isValidIdentifier(primarySource.schema) || !isValidIdentifier(primarySource.table)) {
    throw new Error(`Invalid primary source schema or table name: ${primarySource.schema}.${primarySource.table}`);
  }
   primarySource.filters?.forEach(f => {
      if (!isValidIdentifier(f.column)) throw new Error(`Invalid primary filter column: ${f.column}`);
      // TODO: Validate operator and value type based on column type
   });
   outputColumns.forEach(col => {
       if (col.type !== 'derived' && col.source !== 'primary' && !isValidIdentifier(col.column)) throw new Error(`Invalid output column: ${col.column}`);
       if (col.rename && !isValidIdentifier(col.rename)) throw new Error(`Invalid output rename alias: ${col.rename}`);
   });


  // Map relationId to previous alias for join construction
  const sourceAliases: Record<string, string> = { primary: 'primary' };


  // --- Build SELECT Clause ---
  const selectParts: string[] = [];
  const finalColumns: { key: string, label: string }[] = [];

  outputColumns.forEach(col => {
    // Handle columns from primary source
    if (col.type !== 'derived' && col.source === 'primary') {
      const alias = col.rename || col.column;
      if (!isValidIdentifier(alias)) throw new Error(`Invalid computed alias: ${alias}`);
      selectParts.push(`"primary"."${col.column}" AS "${alias}"`);
      finalColumns.push({ key: alias, label: alias });
    }
    // Handle columns from related sources (placeholder for now)
    else if (col.source !== 'primary' && 'column' in col) {
        // We'll add these properly when processing relatedData
    }
    // TODO: Handle derived columns later
  });


  // --- Build FROM Clause ---
  const fromClause = `"${primarySource.schema}"."${primarySource.table}" AS "primary"`;


  // --- Build JOIN Clauses ---
  const joinClauses: string[] = [];
  let previousAlias = 'primary';

  relatedData.forEach(rel => {
    // Validation for related data source
    if (!isValidIdentifier(rel.schema) || !isValidIdentifier(rel.table)) {
        throw new Error(`Invalid related source schema or table name: ${rel.schema}.${rel.table}`);
    }
    if (!isValidIdentifier(rel.relationId) || tableAliases.has(rel.relationId)) {
        throw new Error(`Invalid or duplicate relationId (alias): ${rel.relationId}`);
    }
     tableAliases.add(rel.relationId);
     sourceAliases[rel.relationId] = rel.relationId; // Store alias mapping

     rel.joinConditions.forEach(jc => {
         if (jc.type === 'column') {
            if (!isValidIdentifier(jc.leftColumn) || !isValidIdentifier(jc.rightColumn)) {
                throw new Error(`Invalid join column names: ${jc.leftColumn}, ${jc.rightColumn}`);
            }
            // Ensure the leftSourceAlias matches 'primary' or a previous relationId
             if (!sourceAliases[jc.leftSourceAlias]) {
                 throw new Error(`Invalid leftSourceAlias in join condition: ${jc.leftSourceAlias}`);
             }
         }
        // TODO: Validate TimeJoinCondition later
     });
     rel.filters?.forEach(f => {
        if (!isValidIdentifier(f.column)) throw new Error(`Invalid related filter column: ${f.column}`);
     });
     rel.selectedColumns.forEach(c => {
        if (!isValidIdentifier(c)) throw new Error(`Invalid related selected column: ${c}`);
     });


    const joinType = rel.joinType === 'inner' ? 'INNER JOIN' : 'LEFT JOIN';
    const joinTable = `"${rel.schema}"."${rel.table}" AS "${rel.relationId}"`;
    const onConditions: string[] = [];

    // Process join conditions
    rel.joinConditions.forEach(jc => {
      if (jc.type === 'column') {
         const leftAlias = sourceAliases[jc.leftSourceAlias]; // Get the actual alias ('primary' or 'relN')
         onConditions.push(`"${leftAlias}"."${jc.leftColumn}" = "${rel.relationId}"."${jc.rightColumn}"`);
      }
      // TODO: Handle TimeJoinCondition later
      // else if (jc.type === 'time') { ... }
      else if (jc.type === 'time') {
          const referenceAlias = jc.primarySourceAlias ? sourceAliases[jc.primarySourceAlias] : sourceAliases['primary'];
          const relatedAlias = rel.relationId;

          const interval = `${Number(jc.windowDays)} day`;

          const referenceDateCol = `"${referenceAlias}"."${jc.primaryDateColumn}"`;
          const relatedDateCol = `"${relatedAlias}"."${jc.relatedDateColumn}"`;

          switch(jc.direction) {
              case 'both':
                  onConditions.push(`${relatedDateCol} BETWEEN (${referenceDateCol} - INTERVAL '${interval}') AND (${referenceDateCol} + INTERVAL '${interval}')`);
                  break;
              case 'before':
                  onConditions.push(`${relatedDateCol} BETWEEN (${referenceDateCol} - INTERVAL '${interval}') AND ${referenceDateCol}`);
                  break;
              case 'after':
                  onConditions.push(`${relatedDateCol} BETWEEN ${referenceDateCol} AND (${referenceDateCol} + INTERVAL '${interval}')`);
                  break;
              default:
                  throw new Error(`Invalid time join direction: ${jc.direction}`);
          }

          if (jc.matchPatientId) {
              const primaryIdCol = jc.primaryPatientIdColumn || 'patient_mrn';
              const relatedIdCol = jc.relatedPatientIdColumn || 'patient_mrn';
              if (!isValidIdentifier(primaryIdCol) || !isValidIdentifier(relatedIdCol)) {
                  throw new Error(`Invalid patient ID columns for time join matching: ${primaryIdCol}, ${relatedIdCol}`);
              }
              onConditions.push(`"${referenceAlias}"."${primaryIdCol}" = "${relatedAlias}"."${relatedIdCol}"`);
          }
      }
      else {
          throw new Error(`Unsupported join condition type: ${(jc as any).type}`);
      }
    });

    // Process filters for the related table (add to ON clause for LEFT JOIN safety)
     if (rel.filters && rel.filters.length > 0) {
         rel.filters.forEach(filter => {
             const colIdentifier = `"${rel.relationId}"."${filter.column}"`;
             // Similar logic as primary WHERE clause, but using the related table alias
             switch (filter.operator) {
                 case '=':
                 case '!=':
                 case '>':
                 case '<':
                 case '>=':
                 case '<=':
                     parameters.push(filter.value);
                     const cast = typeof filter.value === 'number' ? '::numeric' : '';
                     onConditions.push(`${colIdentifier}${cast} ${filter.operator} $${paramIndex++}`);
                     break;
                 default:
                     throw new Error(`Unsupported filter operator in join: ${filter.operator}`);
             }
         });
     }

    if (onConditions.length === 0) {
        throw new Error(`No valid ON conditions specified for join with ${rel.schema}.${rel.table}`);
    }

    joinClauses.push(`${joinType} ${joinTable} ON ${onConditions.join(' AND ')}`);

    // Add selected columns from this related source to the main SELECT list
    outputColumns.forEach(col => {
        if (col.source === rel.relationId && 'column' in col) {
            // Check if this column was actually requested in the relatedData spec
            if (rel.selectedColumns.includes(col.column)) {
                 const outputAlias = col.rename || `${rel.relationId}_${col.column}`; // Default naming convention
                 if (!isValidIdentifier(outputAlias)) throw new Error(`Invalid computed rename alias: ${outputAlias}`);
                 selectParts.push(`"${rel.relationId}"."${col.column}" AS "${outputAlias}"`);
                 finalColumns.push({ key: outputAlias, label: outputAlias });
            } else {
                 console.warn(`Column ${col.column} requested in outputColumns for source ${rel.relationId}, but not listed in relatedData.selectedColumns. Skipping.`);
            }
        }
    });

    previousAlias = rel.relationId; // Update for the next potential join
  });


  // --- Rebuild SELECT Clause (now includes joined columns) ---
  const selectClause = selectParts.join(', ');
  if (selectParts.length === 0) {
      // Should not happen if primary source had columns, but safety check
      throw new Error("No columns selected for output after processing joins.");
  }


  // --- Build WHERE Clause for Primary Source ---
  let whereClause: string | undefined = undefined;
  if (primarySource.filters && primarySource.filters.length > 0) {
    // Regenerate parameter indices if joins added parameters
    paramIndex = parameters.length + 1; // Start after join parameters
    const primaryParams: any[] = []; // Temporarily hold primary filter params

    const whereConditions = primarySource.filters.map(filter => {
      const colIdentifier = `"primary"."${filter.column}"`;
      let condition = "";
      switch (filter.operator) {
        case '=':
        case '!=':
        case '>':
        case '<':
        case '>=':
        case '<=':
          primaryParams.push(filter.value);
          const cast = typeof filter.value === 'number' ? '::numeric' : '';
          condition = `${colIdentifier}${cast} ${filter.operator} $${paramIndex++}`;
          break;
        default:
          throw new Error(`Unsupported primary filter operator: ${filter.operator}`);
      }
      return condition;
    });
    whereClause = whereConditions.join(' AND ');
    // Add primary filter parameters *after* join parameters
    parameters.push(...primaryParams);
  }

  // --- Build LIMIT Clause ---
  let limitClause: string | undefined = undefined;
  if (typeof limit === 'number' && limit > 0) {
    parameters.push(limit);
    limitClause = `LIMIT $${paramIndex++}`; // Use the latest paramIndex
  }

  return {
    selectClause,
    fromClause,
    joinClauses,
    whereClause,
    parameters,
    finalColumns,
    limitClause
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid content type, expected application/json' },
        { status: 400 }
      );
    }

    const requestData: QueryBuilderApiRequest = await request.json();

    if (!requestData.primarySource?.schema || !requestData.primarySource?.table) {
      return NextResponse.json({ error: 'Missing required field: primarySource.{schema, table}' }, { status: 400 });
    }
    if (!requestData.outputColumns || requestData.outputColumns.length === 0) {
      return NextResponse.json({ error: 'Missing required field: outputColumns' }, { status: 400 });
    }

    let queryParts: SqlQueryParts;
    try {
      queryParts = generateSqlQuery(requestData);
    } catch (validationOrGenError) {
      console.error("Error during SQL generation:", validationOrGenError);
      return NextResponse.json(
        { error: validationOrGenError instanceof Error ? validationOrGenError.message : 'Failed to build SQL query' },
        { status: 400 }
      );
    }

    const finalQuery = sql`SELECT `.append(queryParts.selectClause)
                         .append(` FROM `).append(queryParts.fromClause);

    queryParts.joinClauses.forEach(joinClause => {
        finalQuery.append(` `).append(joinClause);
    });

    if (queryParts.whereClause) {
      finalQuery.append(` WHERE `).append(queryParts.whereClause);
    }

    if (queryParts.limitClause) {
      finalQuery.append(` `).append(queryParts.limitClause);
    }

    finalQuery.values = queryParts.parameters;

    console.log("Executing SQL:", finalQuery.text);
    console.log("Parameters:", finalQuery.values);

    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase.sql(finalQuery.text, ...finalQuery.values);

    if (error) {
      console.error('Error executing generated SQL:', error);
      return NextResponse.json({ error: 'Failed to execute query', details: error.message }, { status: 500 });
    }

    if (requestData.exportFormat === 'csv') {
      if (!data || data.length === 0) {
        return new NextResponse("", {
          headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="export-${new Date().toISOString()}.csv"` }, status: 200,
        });
      }
      const csvHeader = queryParts.finalColumns.map(col => `"${col.label.replace(/"/g, '""')}"`).join(',');
      const csvBody = data.map((row: any) =>
        queryParts.finalColumns.map(col => {
          const value = row[col.key];
          if (value === null || value === undefined) return '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      ).join('\\n');
      const csvContent = `${csvHeader}\\n${csvBody}`;
      return new NextResponse(csvContent, {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="export-${new Date().toISOString()}.csv"` }, status: 200,
      });
    } else {
      return NextResponse.json({
        data: data || [],
        columns: queryParts.finalColumns
      });
    }
  } catch (error) {
    console.error('Unexpected error in query builder API:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    
    const { searchParams } = new URL(request.url);
    const infoType = searchParams.get('type');
    
    if (!infoType) {
      return NextResponse.json(
        { error: 'Missing required query parameter: type' },
        { status: 400 }
      );
    }
    
    let data, error;
    
    switch (infoType) {
      case 'tables':
        ({ data, error } = await supabase.rpc('get_contextualizable_tables'));
        break;
        
      case 'columns':
        const schema = searchParams.get('schema');
        const table = searchParams.get('table');
        
        if (!schema || !table) {
          return NextResponse.json(
            { error: 'Missing required query parameters: schema and table' },
            { status: 400 }
          );
        }
        
        ({ data, error } = await supabase.rpc('get_table_columns', {
          p_schema: schema,
          p_table: table
        }));
        break;
        
      case 'relationships':
        ({ data, error } = await supabase.rpc('get_table_relationships'));
        break;
        
      default:
        return NextResponse.json(
          { error: `Invalid info type: ${infoType}` },
          { status: 400 }
        );
    }
    
    if (error) {
      console.error(`Error fetching ${infoType}:`, error);
      return NextResponse.json({ error: `Failed to fetch ${infoType}`, details: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: data || [] });
    
  } catch (error) {
    console.error('Unexpected error in query builder info API:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred' },
      { status: 500 }
    );
  }
} 