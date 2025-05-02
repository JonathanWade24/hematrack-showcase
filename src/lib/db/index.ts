import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema'; // Import combined schema (we might need to create an index.ts in ./schema)
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' }); // Load .env variables for runtime

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // In a real app, you might want more robust error handling or logging
  throw new Error('DATABASE_URL environment variable is not set or is empty');
}

// Create the connection pool
const pool = new Pool({
  connectionString: databaseUrl,
  // Add SSL configuration here if connecting to a remote DB that requires it
  // ssl: {
  //   rejectUnauthorized: false, // Adjust as needed for your environment
  // },
});

// Create the Drizzle instance
export const db = drizzle(pool, { schema });

// Optionally, export the schema object itself if needed elsewhere
export { schema }; 