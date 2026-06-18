import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts', // Updated path
  out: '../database/migrations/drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Use the DATABASE_URL from .env.local
  },
  // Correctly define introspection options
  introspect: {
    casing: 'preserve', // Example option, adjust if needed
  },
  // Define schemas at the top level
  schemaFilter: ['app', 'clinical', 'laboratory', 'staging'],
  verbose: true, // Optional: Enable verbose logging
  strict: true, // Optional: Enable strict mode
}); 