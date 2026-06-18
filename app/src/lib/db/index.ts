import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as relations from './relations';

console.log('[DB Index] Loading DB module...');
console.log(`[DB Index] DATABASE_URL loaded: ${process.env.DATABASE_URL ? 'Yes' : 'No - Check .env!'}`);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create the connection instance
const connectionString = process.env.DATABASE_URL;
console.log(`[DB Index] Attempting to connect to DB...`);
const connection = postgres(connectionString, {
  // Add any necessary postgres options here, like SSL config if needed later
  // ssl: 'require', // Example for production
  max: 1 // Recommended setting for serverless environments
});
console.log(`[DB Index] DB connection object created.`);

// Create the Drizzle instance
export const db = drizzle(connection, {
  schema: { ...schema, ...relations }, // Combine schema and relations
  logger: true // Enable detailed SQL logging
});
console.log(`[DB Index] Drizzle instance created.`);

// Add function to explicitly close the connection for tests
export const closeDbConnection = async () => {
  console.log('[DB Index] Closing DB connection...');
  await connection.end();
  console.log('[DB Index] DB connection closed.');
};

// Export schema and relations separately if needed elsewhere
export * from './schema';
export * from './relations'; 