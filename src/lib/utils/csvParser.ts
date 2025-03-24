/**
 * CSV Parser Utility
 * 
 * Provides functions for parsing and generating CSV data with support for:
 * - Quoted fields
 * - Commas within fields
 * - Proper error handling
 */

/**
 * Parse a CSV string into an array of objects
 * @param csvText The CSV text to parse
 * @param options Optional configuration
 * @returns Array of objects where keys are column headers and values are cell values
 */
export function parseCSV(
  csvText: string,
  options: {
    skipEmptyLines?: boolean;
    trimValues?: boolean;
  } = {}
): Array<Record<string, string>> {
  const { skipEmptyLines = true, trimValues = true } = options;
  
  // Split into lines
  const lines = csvText.split(/\r?\n/);
  if (lines.length === 0) {
    return [];
  }
  
  // Parse the header row
  const headerRow = parseCSVRow(lines[0], trimValues);
  if (headerRow.length === 0) {
    return [];
  }
  
  const result: Array<Record<string, string>> = [];
  
  // Process each data row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines if configured to do so
    if (skipEmptyLines && line.trim() === '') {
      continue;
    }
    
    try {
      const rowValues = parseCSVRow(line, trimValues);
      
      // Create an object from the row values
      const rowObject: Record<string, string> = {};
      headerRow.forEach((header, index) => {
        rowObject[header] = index < rowValues.length ? rowValues[index] : '';
      });
      
      result.push(rowObject);
    } catch (error) {
      console.error(`Error parsing CSV row ${i + 1}:`, error);
      // Add a row with error information
      const errorRow: Record<string, string> = {};
      headerRow.forEach(header => {
        errorRow[header] = '';
      });
      errorRow[headerRow[0]] = `Error in row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.push(errorRow);
    }
  }
  
  return result;
}

/**
 * Parse a single CSV row into an array of values
 * @param row The CSV row text
 * @param trim Whether to trim whitespace from values
 * @returns Array of cell values
 */
function parseCSVRow(row: string, trim: boolean = true): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  let i = 0;
  
  while (i < row.length) {
    const char = row[i];
    const nextChar = i < row.length - 1 ? row[i + 1] : '';
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quotes
        currentValue += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(trim ? currentValue.trim() : currentValue);
      currentValue = '';
    } else {
      // Regular character
      currentValue += char;
    }
    
    i++;
  }
  
  // Add the last field
  result.push(trim ? currentValue.trim() : currentValue);
  
  return result;
}

/**
 * Generate a CSV string from an array of objects
 * @param data Array of objects to convert to CSV
 * @param options Optional configuration
 * @returns CSV formatted string
 */
export function generateCSV(
  data: Array<Record<string, string | number | boolean | null | undefined>>,
  options: {
    headers?: string[];
    includeHeaders?: boolean;
  } = {}
): string {
  if (data.length === 0) {
    return '';
  }
  
  const { includeHeaders = true } = options;
  
  // Determine headers - either use provided headers or extract from first object
  let headers = options.headers;
  if (!headers) {
    headers = Object.keys(data[0]);
  }
  
  const rows: string[] = [];
  
  // Add header row if needed
  if (includeHeaders) {
    rows.push(headers.map(escapeCSVValue).join(','));
  }
  
  // Add data rows
  for (const item of data) {
    const rowValues = headers.map(header => {
      const value = item[header];
      return escapeCSVValue(value !== undefined && value !== null ? String(value) : '');
    });
    rows.push(rowValues.join(','));
  }
  
  return rows.join('\n');
}

/**
 * Escape a value for CSV format
 * @param value The value to escape
 * @returns Escaped value
 */
function escapeCSVValue(value: string): string {
  // If the value contains commas, quotes, or newlines, wrap it in quotes
  if (/[",\n\r]/.test(value)) {
    // Escape any quotes by doubling them
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Validate CSV data against expected columns
 * @param data Parsed CSV data
 * @param requiredColumns Array of column names that must be present
 * @returns Validation result with errors if any
 */
export function validateCSV(
  data: Array<Record<string, string>>,
  requiredColumns: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if data is empty
  if (data.length === 0) {
    errors.push('CSV data is empty');
    return { valid: false, errors };
  }
  
  // Check for required columns
  const firstRow = data[0];
  const missingColumns = requiredColumns.filter(col => !(col in firstRow));
  
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
} 