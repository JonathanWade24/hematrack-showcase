import { defineConfig } from 'drizzle-kit';
// We are temporarily commenting out dotenv loading and hardcoding the URL
// import * as dotenv from 'dotenv';

// dotenv.config({ path: '.env' }); // Ensure .env variables are loaded

// const databaseUrl = process.env.DATABASE_URL;

// Hardcoded database URL for introspection
const databaseUrl = "postgresql://jonathanwade@localhost:5432/scd_research_refactored";


if (!databaseUrl) {
  // This check is less relevant now but kept for structure
  throw new Error('DATABASE_URL environment variable is not set or is empty');
}

export default defineConfig({
  schema: './src/lib/db/schema/*', // Pointing to the schema directory
  out: './drizzle', // Directory for migration files (can be adjusted)
  dialect: 'postgresql', // Specify PostgreSQL dialect
  schemaFilter: ['app', 'clinical', 'laboratory', 'staging'], // Added schema filter
  dbCredentials: {
    url: databaseUrl, // Use the DATABASE_URL from .env
  },
  verbose: true, // Optional: for more detailed output
  strict: true, // Optional: for stricter checks
}); 