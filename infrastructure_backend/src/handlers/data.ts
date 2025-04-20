import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Pool, QueryResult } from 'pg';

// Basic cache for DB credentials to avoid fetching on every invocation
let dbCredentials: { username?: string; password?: string } | null = null;
let dbPool: Pool | null = null;

const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Fetches DB credentials from Secrets Manager.
 */
async function getDbCredentials() {
  if (dbCredentials) {
    return dbCredentials;
  }
  if (!process.env.DB_SECRET_ARN) {
    throw new Error('DB_SECRET_ARN environment variable not set.');
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN });
    const data = await secretsManager.send(command);

    if (data.SecretString) {
      const secret = JSON.parse(data.SecretString);
      // Adjust property names based on how RDS stores them (often 'username', not 'user')
      dbCredentials = { username: secret.username, password: secret.password }; 
      return dbCredentials;
    } else if (data.SecretBinary) {
      // Handle binary secret if necessary (less common for RDS creds)
      console.error('SecretBinary received, cannot parse credentials.');
      throw new Error('Could not retrieve database credentials as string.');
    } else {
      throw new Error('Secret value not found.');
    }
  } catch (error: any) {
    console.error("Error fetching DB secret:", error);
    throw new Error(`Could not retrieve database credentials: ${error.message}`);
  }
}

/**
 * Gets or initializes the database connection pool.
 */
async function getDbPool(): Promise<Pool> {
  if (dbPool) {
    return dbPool;
  }

  const credentials = await getDbCredentials();
  if (!credentials || !credentials.username || !credentials.password) {
    throw new Error('Database credentials are not fully configured.');
  }

  dbPool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: credentials.username, 
    password: credentials.password,
    // Add SSL configuration
    ssl: {
      rejectUnauthorized: false // Quickest way to enforce SSL, consider CA cert for production
    },
    // Add other pool options if needed (e.g., max connections, idle timeout)
  });

  // Optional: Test connection on pool creation
  try {
    const client = await dbPool.connect();
    console.log('[DB Pool] Successfully connected to database.');
    client.release();
  } catch (error) {
    console.error('[DB Pool] Failed to connect to database:', error);
    dbPool = null; // Reset pool if connection failed
    throw error; // Re-throw error
  }

  return dbPool;
}

// --- Utility to safely quote identifiers (basic example) ---
// IMPORTANT: Use a robust SQL query builder library in production for better security
const quoteIdent = (ident: string): string => {
  // Basic validation: Allow only alphanumeric and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(ident)) {
    throw new Error(`Invalid identifier used: ${ident}`);
  }
  return `\"${ident}\"`; // Double quote for PostgreSQL
}

/**
 * Handles GET requests to /data/{table}
 */
export const get = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log('[GetDataHandler] Event:', JSON.stringify(event, null, 2));

  const tableName = event.pathParameters?.table;
  // Safely handle potential null/undefined queryParams
  const queryParams = event.queryStringParameters || {}; 

  if (!tableName) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Table name missing in path.' }) };
  }

  // Basic table name validation (prevent using things like '; DROP TABLE users; --')
  const safeTableName = quoteIdent(tableName);

  console.log(`[GetDataHandler] Request for table: ${safeTableName}`);
  console.log(`[GetDataHandler] Query Params:`, queryParams);

  try {
    const pool = await getDbPool();
    
    // --- Construct SQL Query (Basic Example - NEEDS ENHANCEMENT FOR SECURITY) ---
    let sql = `SELECT * FROM ${safeTableName}`;
    const sqlParams: any[] = [];
    let paramIndex = 1;

    // WHERE Clause (Rudimentary - highly recommend parsing/validating structure)
    if (queryParams.where) {
      try {
        const whereClause = JSON.parse(queryParams.where);
        const conditions = Object.entries(whereClause).map(([key, value]) => {
          // VERY IMPORTANT: Sanitize key to prevent SQL injection
          const safeKey = quoteIdent(key);
          sqlParams.push(value);
          return `${safeKey} = $${paramIndex++}`;
        });
        if (conditions.length > 0) {
          sql += ` WHERE ${conditions.join(' AND ')}`;
        }
      } catch (e) {
        console.warn('[GetDataHandler] Could not parse where query param:', queryParams.where, e);
        // Optionally return error or ignore
      }
    }

    // ORDER BY Clause (Rudimentary - needs validation)
    if (queryParams.orderBy) {
      try {
        const orderByClause = JSON.parse(queryParams.orderBy);
        // Assuming structure like { fieldName: 'asc' | 'desc' }
        const [field, direction] = Object.entries(orderByClause)[0];
        const safeField = quoteIdent(field);
        const safeDirection = String(direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC'; // Sanitize direction
        sql += ` ORDER BY ${safeField} ${safeDirection}`;
      } catch (e) {
        console.warn('[GetDataHandler] Could not parse orderBy query param:', queryParams.orderBy, e);
        // Optionally return error or ignore
      }
    }
    
    // LIMIT Clause (Take)
    if (queryParams.take) {
      const take = parseInt(queryParams.take, 10);
      if (!isNaN(take) && take > 0) {
        sqlParams.push(take);
        sql += ` LIMIT $${paramIndex++}`;
      }
    }

    // OFFSET Clause (Skip)
    if (queryParams.skip) {
      const skip = parseInt(queryParams.skip, 10);
      if (!isNaN(skip) && skip >= 0) {
        sqlParams.push(skip);
        sql += ` OFFSET $${paramIndex++}`;
      }
    }

    console.log(`[GetDataHandler] Executing SQL: ${sql}`);
    console.log(`[GetDataHandler] SQL Params:`, sqlParams);

    // Execute query using the pool
    const result: QueryResult = await pool.query(sql, sqlParams);
    
    console.log(`[GetDataHandler] Found ${result.rowCount} rows for table ${safeTableName}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows),
    };

  } catch (error: any) {
    console.error('[GetDataHandler] Database/Execution Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to retrieve data', error: error.message }),
    };
  }
}; 