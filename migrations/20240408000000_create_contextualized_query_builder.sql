-- Create new migration file for contextualized query builder
-- Step 1: Create a function to perform contextualized data exports

-- Create a type to handle temporal contextualization
CREATE TYPE public.temporal_context_type AS ENUM ('before', 'after', 'both', 'exact');

-- Create a function to execute contextualized queries
CREATE OR REPLACE FUNCTION public.execute_contextualized_query(
  filters JSONB,                    -- Standard filters for the primary data
  context_filters JSONB DEFAULT NULL, -- Filters for the contextualized data
  context_direction temporal_context_type DEFAULT 'both',  -- Direction of time context
  context_window_days INTEGER DEFAULT 90,  -- Time window in days
  reference_date_column TEXT DEFAULT NULL, -- Column to use as reference date
  context_date_column TEXT DEFAULT NULL    -- Column to use for context date
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  query_text TEXT;
  result JSONB;
  primary_schema TEXT;
  primary_table TEXT;
  context_schema TEXT;
  context_table TEXT;
  primary_filters TEXT;
  context_filters_text TEXT;
  join_condition TEXT;
  reference_timestamp_expr TEXT;
  context_timestamp_expr TEXT;
  temporal_condition TEXT;
  base_query_result JSONB;
BEGIN
  -- Extract primary data source information
  primary_schema := filters->>'schema';
  primary_table := filters->>'table';
  
  -- Extract context data source information if provided
  IF context_filters IS NOT NULL THEN
    context_schema := context_filters->>'schema';
    context_table := context_filters->>'table';
  END IF;
  
  -- Basic validation
  IF primary_schema IS NULL OR primary_table IS NULL THEN
    RAISE EXCEPTION 'Primary schema and table are required';
  END IF;
  
  -- Generate filter conditions for primary table
  primary_filters := public.generate_filter_conditions(filters);
  
  -- If no contextualization is needed, just return the primary data
  IF context_filters IS NULL THEN
    query_text := format(
      'SELECT row_to_json(t)::jsonb FROM %I.%I t WHERE %s',
      primary_schema, primary_table, COALESCE(primary_filters, 'TRUE')
    );
    
    EXECUTE query_text INTO base_query_result;
    RETURN jsonb_build_object(
      'primary_data', base_query_result,
      'context_data', NULL
    );
  END IF;
  
  -- Generate filter conditions for context table
  context_filters_text := public.generate_filter_conditions(context_filters);
  
  -- Ensure we have the necessary date/timestamp columns for contextualization
  IF reference_date_column IS NULL OR context_date_column IS NULL THEN
    RAISE EXCEPTION 'Reference and context date columns are required for contextualization';
  END IF;
  
  -- Create reference timestamp expression
  reference_timestamp_expr := format('%I.%I.%I', primary_schema, primary_table, reference_date_column);
  
  -- Create context timestamp expression
  context_timestamp_expr := format('%I.%I.%I', context_schema, context_table, context_date_column);
  
  -- Build the temporal condition based on the context direction
  CASE context_direction
    WHEN 'before' THEN
      temporal_condition := format('%s < %s AND %s >= %s - interval ''%s days''',
                                  context_timestamp_expr, reference_timestamp_expr,
                                  context_timestamp_expr, reference_timestamp_expr,
                                  context_window_days);
    WHEN 'after' THEN
      temporal_condition := format('%s > %s AND %s <= %s + interval ''%s days''',
                                  context_timestamp_expr, reference_timestamp_expr,
                                  context_timestamp_expr, reference_timestamp_expr,
                                  context_window_days);
    WHEN 'both' THEN
      temporal_condition := format('%s BETWEEN %s - interval ''%s days'' AND %s + interval ''%s days''',
                                  context_timestamp_expr, reference_timestamp_expr,
                                  context_window_days, reference_timestamp_expr,
                                  context_window_days);
    WHEN 'exact' THEN
      temporal_condition := format('%s::date = %s::date',
                                  context_timestamp_expr, reference_timestamp_expr);
    ELSE
      RAISE EXCEPTION 'Invalid context_direction: %', context_direction;
  END CASE;
  
  -- Build the complete query with contextualization
  query_text := format(
    'WITH primary_data AS (
      SELECT * FROM %I.%I
      WHERE %s
    ),
    context_data AS (
      SELECT c.*, p.%I AS reference_date
      FROM primary_data p
      JOIN %I.%I c ON 
        -- Join condition is typically a shared identifier like patient_mrn
        p.patient_mrn = c.patient_mrn
        -- Add temporal condition
        AND %s
        -- Add additional context filters
        %s
    )
    SELECT 
      jsonb_agg(row_to_json(p)::jsonb) AS primary_data,
      jsonb_agg(row_to_json(c)::jsonb) AS context_data
    FROM 
      primary_data p
      LEFT JOIN context_data c ON p.patient_mrn = c.patient_mrn',
    primary_schema, primary_table, COALESCE(primary_filters, 'TRUE'),
    reference_date_column,
    context_schema, context_table,
    temporal_condition,
    CASE WHEN context_filters_text IS NOT NULL THEN 'AND ' || context_filters_text ELSE '' END
  );
  
  -- Execute the query
  EXECUTE query_text INTO result;
  
  RETURN result;
END;
$$;

-- Helper function to generate filter conditions from a JSON object
CREATE OR REPLACE FUNCTION public.generate_filter_conditions(filters JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  filter_conditions TEXT := '';
  filter_key TEXT;
  filter_value JSONB;
  operator TEXT;
  value_text TEXT;
BEGIN
  -- Skip schema and table properties as they're metadata, not filters
  IF filters ? 'conditions' THEN
    FOR filter_key, filter_value IN SELECT * FROM jsonb_each(filters->'conditions')
    LOOP
      -- Extract the operator and value
      operator := filter_value->>'operator';
      
      -- Build the condition based on operator type
      CASE operator
        WHEN 'eq' THEN
          value_text := quote_literal(filter_value->>'value');
          filter_conditions := filter_conditions || 
                              format(' AND %I = %s', filter_key, value_text);
        
        WHEN 'neq' THEN
          value_text := quote_literal(filter_value->>'value');
          filter_conditions := filter_conditions || 
                              format(' AND %I != %s', filter_key, value_text);
        
        WHEN 'gt' THEN
          value_text := quote_literal(filter_value->>'value');
          filter_conditions := filter_conditions || 
                              format(' AND %I > %s', filter_key, value_text);
        
        WHEN 'gte' THEN
          value_text := quote_literal(filter_value->>'value');
          filter_conditions := filter_conditions || 
                              format(' AND %I >= %s', filter_key, value_text);
        
        WHEN 'lt' THEN
          value_text := quote_literal(filter_value->>'value');
          filter_conditions := filter_conditions || 
                              format(' AND %I < %s', filter_key, value_text);
        
        WHEN 'lte' THEN
          value_text := quote_literal(filter_value->>'value');
          filter_conditions := filter_conditions || 
                              format(' AND %I <= %s', filter_key, value_text);
        
        WHEN 'like' THEN
          value_text := quote_literal('%' || (filter_value->>'value') || '%');
          filter_conditions := filter_conditions || 
                              format(' AND %I LIKE %s', filter_key, value_text);
        
        WHEN 'ilike' THEN
          value_text := quote_literal('%' || (filter_value->>'value') || '%');
          filter_conditions := filter_conditions || 
                              format(' AND %I ILIKE %s', filter_key, value_text);
        
        WHEN 'in' THEN
          -- Handle array of values
          SELECT string_agg(quote_literal(v::text), ',') INTO value_text
          FROM jsonb_array_elements_text(filter_value->'value') v;
          
          filter_conditions := filter_conditions || 
                              format(' AND %I IN (%s)', filter_key, value_text);
        
        WHEN 'between' THEN
          -- Handle between with two values
          filter_conditions := filter_conditions || 
                            format(' AND %I BETWEEN %s AND %s', 
                                  filter_key, 
                                  quote_literal(filter_value->'value'->0), 
                                  quote_literal(filter_value->'value'->1));
        
        WHEN 'is_null' THEN
          filter_conditions := filter_conditions || 
                              format(' AND %I IS NULL', filter_key);
        
        WHEN 'is_not_null' THEN
          filter_conditions := filter_conditions || 
                              format(' AND %I IS NOT NULL', filter_key);
        
        ELSE
          RAISE EXCEPTION 'Unsupported operator: %', operator;
      END CASE;
    END LOOP;
    
    -- Remove the leading ' AND ' if present
    IF length(filter_conditions) > 0 THEN
      filter_conditions := substring(filter_conditions from 6);
    END IF;
  END IF;
  
  RETURN filter_conditions;
END;
$$;

-- Drop the existing function if it exists to avoid parameter name conflict
DROP FUNCTION IF EXISTS public.get_table_columns(text, text);

-- Create a function to get available columns for a specific table
CREATE OR REPLACE FUNCTION public.get_table_columns(
  input_schema TEXT,
  input_table TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', column_name,
      'data_type', data_type,
      'description', col_description(format('%I.%I', table_schema, table_name)::regclass::oid, ordinal_position),
      'is_nullable', is_nullable = 'YES'
    )
  )
  INTO result
  FROM information_schema.columns
  WHERE table_schema = input_schema
    AND table_name = input_table
  ORDER BY ordinal_position;
  
  RETURN result;
END;
$$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_contextualizable_tables();

-- Create a function to get available tables for contextualization
CREATE OR REPLACE FUNCTION public.get_contextualizable_tables()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Get all tables with timestamp columns that could be used for contextualization
  WITH ts_columns AS (
    SELECT 
      table_schema,
      table_name,
      column_name,
      data_type
    FROM 
      information_schema.columns
    WHERE 
      data_type IN ('timestamp', 'timestamp with time zone', 'timestamp without time zone', 'date')
      AND table_schema IN ('laboratory', 'clinical', 'phi')
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'schema', table_schema,
        'table', table_name,
        'description', obj_description(format('%I.%I', table_schema, table_name)::regclass, 'pg_class'),
        'date_columns', (
          SELECT jsonb_agg(jsonb_build_object('name', column_name, 'type', data_type))
          FROM ts_columns tc
          WHERE tc.table_schema = t.table_schema AND tc.table_name = t.table_name
        )
      )
    )
  INTO result
  FROM (
    SELECT DISTINCT table_schema, table_name
    FROM ts_columns
  ) t;
  
  RETURN result;
END;
$$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.export_contextualized_query_to_csv(jsonb, jsonb, public.temporal_context_type, integer, text, text);

-- Create a function to export the contextualized query results to CSV
CREATE OR REPLACE FUNCTION public.export_contextualized_query_to_csv(
  filters JSONB,
  context_filters JSONB DEFAULT NULL,
  context_direction temporal_context_type DEFAULT 'both',
  context_window_days INTEGER DEFAULT 90,
  reference_date_column TEXT DEFAULT NULL,
  context_date_column TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
  csv_output TEXT := '';
  primary_schema TEXT;
  primary_table TEXT;
  context_schema TEXT;
  context_table TEXT;
  header_row TEXT := '';
  data_row TEXT;
  record_json JSONB;
  primary_data JSONB;
  context_data JSONB;
  column_name TEXT;
  column_value TEXT;
  combined_record JSONB;
  context_record JSONB;
BEGIN
  -- Execute the contextualized query
  result := public.execute_contextualized_query(
    filters, 
    context_filters, 
    context_direction, 
    context_window_days, 
    reference_date_column, 
    context_date_column
  );
  
  -- Extract primary and context data
  primary_data := result->'primary_data';
  context_data := result->'context_data';
  
  -- Extract schema and table information
  primary_schema := filters->>'schema';
  primary_table := filters->>'table';
  
  IF context_filters IS NOT NULL THEN
    context_schema := context_filters->>'schema';
    context_table := context_filters->>'table';
  END IF;
  
  -- If we have no data, return an empty string
  IF primary_data IS NULL OR jsonb_array_length(primary_data) = 0 THEN
    RETURN '';
  END IF;
  
  -- Generate CSV header row by combining all columns from primary and context data
  FOR record_json IN SELECT * FROM jsonb_array_elements(primary_data) LOOP
    -- Add columns from primary data
    FOR column_name IN SELECT * FROM jsonb_object_keys(record_json) LOOP
      -- Skip the "_metadata" field if it exists
      IF column_name != '_metadata' THEN
        header_row := header_row || primary_schema || '_' || primary_table || '_' || column_name || ',';
      END IF;
    END LOOP;
    
    -- We only need to process the first record to get column names
    EXIT;
  END LOOP;
  
  -- Add columns from context data if it exists
  IF context_data IS NOT NULL AND jsonb_array_length(context_data) > 0 THEN
    FOR record_json IN SELECT * FROM jsonb_array_elements(context_data) LOOP
      -- Add columns from context data, avoiding duplicates
      FOR column_name IN SELECT * FROM jsonb_object_keys(record_json) LOOP
        -- Skip the "_metadata" field and any reference_date that was added
        IF column_name != '_metadata' AND column_name != 'reference_date' THEN
          header_row := header_row || context_schema || '_' || context_table || '_' || column_name || ',';
        END IF;
      END LOOP;
      
      -- We only need to process the first record to get column names
      EXIT;
    END LOOP;
  END IF;
  
  -- Remove trailing comma and add newline
  header_row := rtrim(header_row, ',') || E'\n';
  csv_output := header_row;
  
  -- Generate data rows
  FOR record_json IN SELECT * FROM jsonb_array_elements(primary_data) LOOP
    data_row := '';
    combined_record := record_json;
    
    -- Find matching context records and combine them
    IF context_data IS NOT NULL AND jsonb_array_length(context_data) > 0 THEN
      -- In this simplified version, we're assuming a 1:1 relationship between primary and context
      -- For 1:many relationships, this would need to be expanded
      -- We're using patient_mrn as the join key here
      FOR context_record IN SELECT * FROM jsonb_array_elements(context_data) LOOP
        IF context_record->>'patient_mrn' = record_json->>'patient_mrn' THEN
          -- Combine the records, prefixing context keys to avoid collisions
          FOR column_name, column_value IN SELECT * FROM jsonb_each_text(context_record) LOOP
            -- Skip metadata and reference date
            IF column_name != '_metadata' AND column_name != 'reference_date' THEN
              combined_record := jsonb_set(
                combined_record, 
                ARRAY[context_schema || '_' || context_table || '_' || column_name], 
                to_jsonb(column_value)
              );
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
    
    -- Build the CSV row from the combined record
    FOR column_name IN SELECT * FROM jsonb_object_keys(combined_record) LOOP
      -- Handle null values and escape special characters
      IF combined_record->>column_name IS NULL THEN
        data_row := data_row || ',';
      ELSE
        -- Simple CSV escaping (should be enhanced for production)
        column_value := combined_record->>column_name;
        -- Escape quotes and wrap in quotes if contains comma
        IF position(',' IN column_value) > 0 OR position('"' IN column_value) > 0 THEN
          column_value := '"' || replace(column_value, '"', '""') || '"';
        END IF;
        data_row := data_row || column_value || ',';
      END IF;
    END LOOP;
    
    -- Remove trailing comma and add newline
    data_row := rtrim(data_row, ',') || E'\n';
    csv_output := csv_output || data_row;
  END LOOP;
  
  RETURN csv_output;
END;
$$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_table_relationships();

-- Create function to get available table relationships for joins
CREATE OR REPLACE FUNCTION public.get_table_relationships()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'source_schema', ns1.nspname,
    'source_table', cl1.relname,
    'source_column', a1.attname,
    'target_schema', ns2.nspname,
    'target_table', cl2.relname,
    'target_column', a2.attname,
    'constraint_name', c.conname
  ))
  INTO result
  FROM pg_constraint c
  JOIN pg_namespace ns1 ON ns1.oid = c.connamespace
  JOIN pg_class cl1 ON cl1.oid = c.conrelid
  JOIN pg_class cl2 ON cl2.oid = c.confrelid
  JOIN pg_namespace ns2 ON ns2.oid = cl2.relnamespace
  JOIN pg_attribute a1 ON a1.attnum = ANY(c.conkey) AND a1.attrelid = c.conrelid
  JOIN pg_attribute a2 ON a2.attnum = ANY(c.confkey) AND a2.attrelid = c.confrelid
  WHERE c.contype = 'f'
    AND ns1.nspname IN ('laboratory', 'clinical', 'phi')
    AND ns2.nspname IN ('laboratory', 'clinical', 'phi');
  
  RETURN result;
END;
$$;

-- Grant privileges to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_contextualized_query TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_filter_conditions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_columns TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contextualizable_tables TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_contextualized_query_to_csv TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_relationships TO authenticated; 